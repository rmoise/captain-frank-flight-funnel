const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { Handler } = require('@netlify/functions');
const { v4: uuidv4 } = require('uuid');

// Validate environment variables
if (!process.env.HUBSPOT_API_TOKEN) {
  console.error('HUBSPOT_API_TOKEN environment variable is not set');
  process.exit(1);
}

// Add function to get pipeline ID
const getDefaultPipelineId = async () => {
  console.log('=== Getting Default Pipeline ID START ===');
  try {
    console.log('Fetching pipelines from HubSpot');
    const response = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to fetch pipelines:', errorText);
      throw new Error(`Failed to fetch pipelines: ${errorText}`);
    }

    const data = await response.json();
    console.log('Fetched pipelines:', JSON.stringify(data, null, 2));

    // Look for Flugverspätungsfunnel first, fallback to Sales Pipeline
    const flightPipeline = data.results.find(pipeline =>
      pipeline.label === 'Flugverspätungsfunnel' ||
      pipeline.label === 'Flugverspatungsfunnel' ||
      pipeline.label.toLowerCase().includes('flug')
    );

    if (flightPipeline) {
      console.log('Found flight pipeline:', flightPipeline);
      return flightPipeline.id;
    }

    // Fallback to default pipeline
    const defaultPipeline = data.results.find(pipeline => pipeline.label === 'Sales Pipeline');
    console.log('Falling back to default pipeline:', defaultPipeline);

    if (!defaultPipeline) {
      console.warn('No suitable pipeline found');
      return null;
    }

    console.log('Using pipeline ID:', defaultPipeline.id);
    return defaultPipeline.id;
  } catch (error) {
    console.error('Error fetching pipeline ID:', error);
    console.error('Error stack:', error.stack);
    return null;
  } finally {
    console.log('=== Getting Default Pipeline ID END ===');
  }
};

const createContact = async (payload) => {
  try {
    // Parse the payload if it's a string
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    // Extract email and other details
    const { email, firstname: firstName, lastname: lastName, phone, address, city, postalCode, country, salutation } = data;

    // Search for existing contact
    const contactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ',
            value: email
          }]
        }]
      })
    });

    if (!contactResponse.ok) {
      console.error('Failed to search for contact:', await contactResponse.text());
      throw new Error('Failed to search for contact in HubSpot');
    }

    const contactSearchResult = await contactResponse.json();
    let contactId;

    if (contactSearchResult.total === 0) {
      // Create new contact with full details
      const createContactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
        },
        body: JSON.stringify({
          properties: {
            email,
            firstname: firstName,
            lastname: lastName,
            phone: phone || '',        // Regular phone
            mobilephone: phone || '',  // Mobile phone (same value)
            salutation: salutation || '',
            address: address || '',
            zip: postalCode || '',      // Map postalCode to zip
            city: city || '',
            country: country || '',
            hs_lead_status: 'NEW'
          }
        })
      });

      if (!createContactResponse.ok) {
        console.error('Failed to create contact:', await createContactResponse.text());
        throw new Error('Failed to create contact in HubSpot');
      }

      const newContact = await createContactResponse.json();
      contactId = newContact.id;
    } else {
      contactId = contactSearchResult.results[0].id;

      // Update existing contact with new details
      const updateContactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
        },
        body: JSON.stringify({
          properties: {
            email: email,
            firstname: firstName,
            lastname: lastName,
            phone: phone || '',        // Regular phone
            mobilephone: phone || '',  // Mobile phone (same value)
            salutation: salutation || '',
            address: address || '',
            zip: postalCode || '',      // Map postalCode to zip
            city: city || '',
            country: country || ''
          }
        })
      });

      if (!updateContactResponse.ok) {
        const errorText = await updateContactResponse.text();
        console.error('Failed to update contact. HubSpot response:', errorText);
        throw new Error(`Failed to update contact in HubSpot: ${errorText}`);
      }
    }

    return {
      hubspotContactId: contactId,
      message: 'Successfully created/updated HubSpot contact'
    };
  } catch (error) {
    console.error('Error in createContact:', error);
    throw error;
  }
};

const createDeal = async (payload, context) => {
  try {
    console.log('Creating deal with payload:', JSON.stringify(payload, null, 2));

    const {
      contactId,
      personalDetails,
      bookingNumber,
      originalFlights,
      selectedFlights,
      evaluationResponse,
      stage,
      status,
      fromLocation,
      toLocation
    } = payload;

    // Get compensation estimate using either flight data or location data
    let from_iata, to_iata;

    if (selectedFlights && selectedFlights.length > 0) {
      // Use flight data if available
      const firstFlight = selectedFlights[0];
      from_iata = firstFlight.departureAirport?.code || firstFlight.departureCity;
      to_iata = firstFlight.arrivalAirport?.code || firstFlight.arrivalCity;
    } else if (fromLocation && toLocation) {
      // Use location data if no flights selected yet
      try {
        const fromLocationData = typeof fromLocation === 'string' ? JSON.parse(fromLocation) : fromLocation;
        const toLocationData = typeof toLocation === 'string' ? JSON.parse(toLocation) : toLocation;
        from_iata = fromLocationData.city || fromLocationData.value;
        to_iata = toLocationData.city || toLocationData.value;
      } catch (error) {
        console.error('Error parsing location data:', error);
        from_iata = fromLocation;
        to_iata = toLocation;
      }
    } else {
      console.error('No flight or location data available');
      throw new Error('No flight or location data available');
    }

    console.log('Fetching compensation for route:', {
      from: from_iata,
      to: to_iata,
      timestamp: new Date().toISOString()
    });

    // Get the base URL from the request context
    const baseUrl = process.env.URL || 'http://localhost:8888';
    const compensationUrl = `${baseUrl}/.netlify/functions/calculateCompensation?from_iata=${from_iata}&to_iata=${to_iata}`;
    console.log('Compensation API URL:', compensationUrl);

    const compensationResponse = await fetch(compensationUrl);
    console.log('Compensation API status:', compensationResponse.status);

    if (!compensationResponse.ok) {
      const errorText = await compensationResponse.text();
      console.error('Failed to get compensation estimate:', errorText);
      throw new Error('Failed to get compensation estimate');
    }

    const compensationData = await compensationResponse.json();
    console.log('Compensation API response:', {
      data: compensationData,
      timestamp: new Date().toISOString()
    });

    if (!compensationData.amount) {
      console.error('No compensation amount returned from API');
      throw new Error('No compensation amount available');
    }

    console.log('Using compensation amount:', {
      amount: compensationData.amount,
      currency: compensationData.currency || 'EUR',
      timestamp: new Date().toISOString()
    });

    // Get the pipeline ID
    const pipelineId = await getDefaultPipelineId();
    if (!pipelineId) {
      throw new Error('Could not determine pipeline ID');
    }

    console.log('Using pipeline ID:', pipelineId);
    console.log('Setting compensation amount:', compensationData.amount);

    // Format flight or route details
    let routeDetails;
    if (selectedFlights && selectedFlights.length > 0) {
      routeDetails = selectedFlights.map(flight =>
        `${flight.departureAirport?.code || flight.departureCity} to ${flight.arrivalAirport?.code || flight.arrivalCity} (${flight.flightNumber})`
      ).join(', ');
    } else {
      routeDetails = `${from_iata} to ${to_iata}`;
    }

    console.log('Formatted route details:', routeDetails);

    // Set deal stage and probability based on stage
    let dealStage = '';
    let dealStatus = '';
    let probability = 0;

    switch (stage) {
      case 'initial_assessment':
        dealStage = 'appointmentscheduled';  // Use standard HubSpot stage
        dealStatus = 'New Submission';
        probability = 0.2;
        break;
      case 'evaluation':
        if (status === 'qualified') {
          dealStage = 'closedwon';  // Use standard HubSpot stage
          dealStatus = 'Qualified';
          probability = 0.6;
        } else if (status === 'rejected') {
          dealStage = '1173731568';  // Use the Rejected stage ID from pipeline
          dealStatus = 'Rejected';
          probability = 0;
        } else {
          dealStage = 'closedlost';  // Use standard HubSpot stage
          dealStatus = 'Disqualified';
          probability = 0;
        }
        break;
      case 'final_submission':
        dealStage = 'closedwon';  // Use standard HubSpot stage
        dealStatus = 'Contract Submitted';
        probability = 1.0;  // 100% probability as contract is submitted
        break;
      default:
        dealStage = 'appointmentscheduled';  // Default to first stage
        dealStatus = 'New';
        probability = 0.2;
        break;
    }

    console.log('Setting deal properties with stage:', dealStage);

    // Create deal properties using only standard HubSpot properties
    const dealProperties = {
      dealname: `${uuidv4()} - ${personalDetails.firstName} ${personalDetails.lastName}`,
      amount: compensationData.amount.toString(),  // Convert to string as HubSpot expects
      description: `Route: ${routeDetails}\nBooking: ${bookingNumber}\nCompensation: ${compensationData.amount} ${compensationData.currency || 'EUR'}\nStatus: ${dealStatus}`,
      pipeline: pipelineId,
      dealstage: dealStage,
      hs_deal_stage_probability: probability
    };

    console.log('Setting deal properties:', JSON.stringify(dealProperties, null, 2));

    let dealId = payload.dealId;  // Declare dealId separately as let

    // Create or update deal in HubSpot
    const dealEndpoint = dealId
      ? `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`
      : 'https://api.hubapi.com/crm/v3/objects/deals';
    const dealMethod = dealId ? 'PATCH' : 'POST';

    console.log(`${dealMethod}ing deal to HubSpot:`, {
      endpoint: dealEndpoint,
      properties: dealProperties,
      timestamp: new Date().toISOString()
    });

    const dealResponse = await fetch(dealEndpoint, {
      method: dealMethod,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
      body: JSON.stringify({
        properties: dealProperties,
        associations: [{
          to: { id: contactId },
          types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }]
        }]
      })
    });

    if (!dealResponse.ok) {
      const errorText = await dealResponse.text();
      console.error('Failed to create deal in HubSpot:', errorText);
      throw new Error(`Failed to create deal in HubSpot: ${errorText}`);
    }

    const dealResult = await dealResponse.json();
    console.log('HubSpot deal response:', {
      result: dealResult,
      timestamp: new Date().toISOString()
    });

    return {
        hubspotDealId: dealResult.id,
      message: dealResult.id ? 'Successfully updated HubSpot deal' : 'Successfully created HubSpot deal'
    };
  } catch (error) {
    console.error('Error in createDeal:', error);
    throw error;
  }
};

exports.handler = async (event, context) => {
  try {
    console.log('=== HubSpot Integration Handler START ===');
    console.log('Event path:', event.path);
    console.log('Event method:', event.httpMethod);
    console.log('Event headers:', event.headers);

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the request body
    const payload = JSON.parse(event.body);
    console.log('Request payload:', JSON.stringify(payload, null, 2));

    let result;
    if (event.path.endsWith('/contact')) {
      console.log('Processing contact creation/update request');
      result = await createContact(payload);
      console.log('Contact operation result:', result);
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } else if (event.path.endsWith('/deal')) {
      console.log('Processing deal creation/update request');
      result = await createDeal(payload, context);
      console.log('Deal operation result:', result);
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Not found' })
      };
    }
  } catch (error) {
    console.error('Error in handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message, stack: error.stack })
    };
  } finally {
    console.log('=== HubSpot Integration Handler END ===');
  }
};
