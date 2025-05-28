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
    // Add detailed logging of the raw payload
    console.log('=== RECEIVED CONTACT PAYLOAD ===');
    console.log('Payload type:', typeof payload);
    console.log('Raw payload:', payload);

    // Parse the payload if it's a string
    const data = typeof payload === 'string' ? JSON.parse(payload) : payload;

    console.log('=== PARSED CONTACT DATA ===');
    console.log('Parsed data:', data);
    console.log('Data keys:', Object.keys(data));
    console.log('Email present:', !!data.email);
    console.log('================================');

    // Look for email in multiple possible locations if not directly available
    if (!data.email) {
      // Check if we have personalDetails that might contain email
      if (data.personalDetails && data.personalDetails.email) {
        data.email = data.personalDetails.email;
        console.log('Found email in personalDetails:', data.email);
      }
      // Check if we have owner_email (from the Captain Frank API format)
      else if (data.owner_email) {
        data.email = data.owner_email;
        console.log('Found email in owner_email:', data.email);
      }
      // Check if we have evaluationResponse that might contain contract info with email
      else if (data.evaluationResponse && data.evaluationResponse.owner_email) {
        data.email = data.evaluationResponse.owner_email;
        console.log('Found email in evaluationResponse:', data.email);
      }
    }

    // Validate required fields
    if (!data.contactId && !data.email) {
      console.error('Email is required for contact creation/search');
      throw new Error('Email is required for contact creation/search');
    }

    // If only contactId and marketing status are provided, do a simple update
    if (data.contactId && typeof data.arbeitsrecht_marketing_status !== 'undefined' && Object.keys(data).length === 2) {
      console.log('=== Marketing Status Update Details ===');
      console.log('Raw marketing status:', data.arbeitsrecht_marketing_status);
      console.log('Type of marketing status:', typeof data.arbeitsrecht_marketing_status);
      console.log('Converted marketing status:', data.arbeitsrecht_marketing_status ? 'true' : 'false');
      console.log('================================');

      const updateResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${data.contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
        },
        body: JSON.stringify({
          properties: {
            arbeitsrecht_marketing_status: data.arbeitsrecht_marketing_status ? 'true' : 'false'
          }
        })
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('Failed to update contact marketing status. HubSpot response:', errorText);
        throw new Error(`Failed to update contact marketing status in HubSpot: ${errorText}`);
      }

      const responseData = await updateResponse.json();
      console.log('HubSpot update response:', responseData);

      return {
        hubspotContactId: data.contactId,
        message: 'Successfully updated marketing status'
      };
    }

    // Normalize field names to handle both camelCase and lowercase
    const {
      firstName,
      firstname,
      lastName,
      lastname,
      salutation,
      phone,
      mobilephone,
      address,
      city,
      postalCode,
      zip,
      country,
      arbeitsrecht_marketing_status
    } = data;

    // Use normalized values
    const normalizedData = {
      email: data.email,
      firstname: firstname || firstName,
      lastname: lastname || lastName,
      salutation,
      phone,
      mobilephone,
      address,
      city,
      zip: zip || postalCode,
      country,
      arbeitsrecht_marketing_status
    };

    console.log('Normalized contact data:', normalizedData);

    // Search for existing contact - only if email is present
    if (!normalizedData.email) {
      console.error('Cannot search for contact - email is missing');
      throw new Error('Email is required for contact creation/search');
    }

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
              value: normalizedData.email
            }]
          }]
        })
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('Failed to search for contact. HubSpot response:', errorText);
      throw new Error(`Failed to search for contact in HubSpot: ${errorText}`);
    }

    const contactSearchResult = await contactResponse.json();
    let contactId;

    if (contactSearchResult.total === 0) {
      // Create new contact with all details
      const createContactResponse = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
        },
        body: JSON.stringify({
          properties: {
            email: normalizedData.email,
            firstname: normalizedData.firstname,
            lastname: normalizedData.lastname,
            salutation: normalizedData.salutation || '',
            phone: normalizedData.phone || '',
            mobilephone: normalizedData.mobilephone || normalizedData.phone || '',
            address: normalizedData.address || '',
            city: normalizedData.city || '',
            zip: normalizedData.zip || '',
            country: normalizedData.country || '',
            hs_lead_status: 'NEW',
            arbeitsrecht_marketing_status: normalizedData.arbeitsrecht_marketing_status ? 'true' : 'false'
          }
        })
      });

      if (!createContactResponse.ok) {
        const errorText = await createContactResponse.text();
        console.error('Failed to create contact. HubSpot response:', errorText);
        throw new Error(`Failed to create contact in HubSpot: ${errorText}`);
      }

      const newContact = await createContactResponse.json();
      contactId = newContact.id;
    } else {
      contactId = contactSearchResult.results[0].id;

      // Update existing contact with all details
      const updateContactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
        },
        body: JSON.stringify({
          properties: {
            email: normalizedData.email,
            firstname: normalizedData.firstname,
            lastname: normalizedData.lastname,
            salutation: normalizedData.salutation || '',
            phone: normalizedData.phone || '',
            mobilephone: normalizedData.mobilephone || normalizedData.phone || '',
            address: normalizedData.address || '',
            city: normalizedData.city || '',
            zip: normalizedData.zip || '',
            country: normalizedData.country || '',
            arbeitsrecht_marketing_status: normalizedData.arbeitsrecht_marketing_status ? 'true' : 'false'
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
      personalDetails = {},  // Add default empty object
      selectedFlights,
      originalFlights,  // Add originalFlights to destructuring
      directFlight,
      stage,
      status,
      amount: providedAmount,
      flight_not_found  // Add the flight_not_found property
    } = payload;

    // Validate required fields
    if (!contactId) {
      throw new Error('Contact ID is required');
    }

    // First check if contact already has associated deals to avoid duplicates
    let existingDealId = payload.dealId;

    if (!existingDealId) {
      console.log('No deal ID provided, checking for existing deals for contact:', contactId);
      try {
        // First, search for deals with same contact name to ensure we don't create duplicates
        // Get proper name from personalDetails or from the normalized firstname/lastname fields
        const firstName = personalDetails.firstName || personalDetails.firstname || '';
        const lastName = personalDetails.lastName || personalDetails.lastname || '';

        if (firstName && lastName) {
          // Search for deals that might have been created for this contact
          const searchDealsResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/deals/search`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
              },
              body: JSON.stringify({
                filterGroups: [
                  {
                    filters: [
                      {
                        propertyName: "dealname",
                        operator: "CONTAINS",
                        value: `${firstName} ${lastName}`
                      }
                    ]
                  }
                ],
                sorts: [
                  {
                    propertyName: "createdate",
                    direction: "DESCENDING"
                  }
                ],
                limit: 1
              })
            }
          );

          if (searchDealsResponse.ok) {
            const dealsResult = await searchDealsResponse.json();
            console.log('Search for deals by name result:', dealsResult);

            if (dealsResult.total > 0) {
              existingDealId = dealsResult.results[0].id;
              console.log('Using existing deal found by name match:', existingDealId);
            }
          } else {
            console.warn('Failed to search for deals by name:', await searchDealsResponse.text());
          }
        }

        // If we didn't find a deal by name, fall back to association search
        if (!existingDealId) {
          // Search for existing deals associated with this contact
          const searchResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
              }
            }
          );

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json();
            console.log('Found associated deals:', searchResult);

            if (searchResult.results && searchResult.results.length > 0) {
              // Use the first associated deal ID
              existingDealId = searchResult.results[0].id;
              console.log('Using existing deal ID from association:', existingDealId);
            }
          } else {
            console.warn('Failed to search for existing deals by association:', await searchResponse.text());
          }
        }
      } catch (error) {
        console.warn('Error searching for existing deals:', error);
      }
    }

    // Continue with the rest of the function...
    // Get compensation estimate using either provided amount or calculate from flight data
    let compensationAmount = providedAmount;
    let routeDetails = '';
    let from_iata = '', to_iata = '';

    // Skip flight data validation for initial assessment stage
    if (stage !== 'initial_assessment') {
      if (!compensationAmount) {
        // First try to use originalFlights
        if (originalFlights && originalFlights.length > 0) {
          const firstFlight = originalFlights[0];
          from_iata = firstFlight.departureAirport?.code || firstFlight.departureCity;
          to_iata = firstFlight.arrivalAirport?.code || firstFlight.arrivalCity;
        }
        // Then try selectedFlights
        else if (selectedFlights && selectedFlights.length > 0) {
          const firstFlight = selectedFlights[0];
          from_iata = firstFlight.departureAirport?.code || firstFlight.departureCity;
          to_iata = firstFlight.arrivalAirport?.code || firstFlight.arrivalCity;
        }
        // Finally try directFlight
        else if (directFlight?.fromLocation && directFlight?.toLocation) {
          from_iata = directFlight.fromLocation.value || directFlight.fromLocation.city;
          to_iata = directFlight.toLocation.value || directFlight.toLocation.city;
        } else {
          console.warn('No flight or location data available, using default values:', {
            originalFlights,
            selectedFlights,
            directFlight
          });
          // Use default values instead of throwing an error
          from_iata = 'Unknown';
          to_iata = 'Unknown';
          routeDetails = 'Route information pending';

          // Skip compensation calculation for this case
          compensationAmount = providedAmount || 250; // Use provided amount or default to 250
        }

        // Only fetch compensation if we have real flight data (not 'Unknown')
        if (from_iata !== 'Unknown' && to_iata !== 'Unknown') {
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
            // Use default amount instead of throwing error
            console.warn('Using default compensation amount due to API error');
            compensationAmount = providedAmount || 250;
          } else {
            const compensationData = await compensationResponse.json();
            console.log('Compensation API response:', {
              data: compensationData,
              timestamp: new Date().toISOString()
            });

            compensationAmount = compensationData.amount;
          }
        } else {
          console.log('Using default compensation amount:', compensationAmount);
        }
      } else {
        // If we have a provided amount, try to get route details from flight data
        if (selectedFlights && selectedFlights.length > 0) {
          const firstFlight = selectedFlights[0];
          from_iata = firstFlight.departureAirport?.code || firstFlight.departureCity;
          to_iata = firstFlight.arrivalAirport?.code || firstFlight.arrivalCity;
        } else if (directFlight?.fromLocation && directFlight?.toLocation) {
          from_iata = directFlight.fromLocation.value || directFlight.fromLocation.city;
          to_iata = directFlight.toLocation.value || directFlight.toLocation.city;
        }
      }

      if (!compensationAmount) {
        console.warn('No compensation amount available, using default value');
        compensationAmount = 250; // Use a default value instead of throwing an error
      }
    }

    // Get the pipeline ID
    const pipelineId = await getDefaultPipelineId();
    if (!pipelineId) {
      console.warn('Could not determine pipeline ID, using default');
      // Use a hardcoded default pipeline ID instead of throwing error
      const defaultPipelineId = '1173731570'; // Common default HubSpot pipeline ID
      console.log('Using fallback pipeline ID:', defaultPipelineId);
    }

    // Use either the fetched ID or the default
    const finalPipelineId = pipelineId || '1173731570';
    console.log('Using pipeline ID:', finalPipelineId);
    console.log('Setting compensation amount:', compensationAmount);

    // Format flight or route details
    routeDetails = from_iata && to_iata ? `${from_iata} to ${to_iata}` : 'Route pending';

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
      case 'flight_details':  // Add specific handling for flight details page
        dealStage = 'appointmentscheduled';  // Changed from qualifiedtobuy to a valid stage ID
        dealStatus = 'Flight Details Submitted';
        probability = 0.5;  // Higher probability than initial assessment
        break;
      case 'evaluation':
        if (status === 'qualified') {
          dealStage = 'appointmentscheduled';  // Changed from presentationscheduled to appointmentscheduled
          dealStatus = 'Qualified';
          probability = 0.6;
        } else if (status === 'rejected') {
          dealStage = '1173731568';  // This stage means rejected in HubSpot
          dealStatus = 'Rejected';
          probability = 0;
        } else {
          dealStage = 'closedlost';  // Use standard HubSpot stage
          dealStatus = 'Disqualified';
          probability = 0;
        }
        break;
      case 'final_submission':
        dealStage = 'closedwon';  // Only mark as won on final submission
        dealStatus = 'Contract Submitted';
        probability = 1.0;  // 100% probability as contract is submitted
        break;
      default:
        dealStage = 'appointmentscheduled';  // Default to first stage
        dealStatus = 'New';
        probability = 0.2;
        break;
    }

    console.log('Setting deal stage and probability based on stage:', dealStage);

    // Create deal properties using only standard HubSpot properties
    const dealId = uuidv4(); // Generate a unique ID for the deal

    // Need to declare firstName and lastName again in this scope
    const firstName = personalDetails.firstName || personalDetails.firstname || '';
    const lastName = personalDetails.lastName || personalDetails.lastname || '';

    // Create deal name with contact info when available
    let dealName;
    if (firstName && lastName) {
      // Always use a UUID in the name, even for existing deals
      dealName = `${dealId} - ${firstName} ${lastName}`;
    } else {
      dealName = `${dealId} - New Flight Delay Claim`;
    }

    console.log('Setting deal name:', dealName);

    const dealProperties = {
      dealname: dealName,
      amount: compensationAmount ? compensationAmount.toString() : '250',  // Always set an amount, default to 250 if none provided
      description: stage === 'initial_assessment'
        ? `Status: ${dealStatus}\nInitial Assessment Phase`
        : stage === 'flight_details'
          ? `Route: ${routeDetails}\nCompensation: ${compensationAmount} EUR\nStatus: ${dealStatus}\nFlight Details Phase`
          : `Route: ${routeDetails}\nCompensation: ${compensationAmount} EUR\nStatus: ${dealStatus}`,
      pipeline: finalPipelineId,
      dealstage: dealStage,
      hs_deal_stage_probability: probability
    };

    // Add the flight_not_found property if provided - ensure it's set for both new and existing deals
    if (flight_not_found) {
      console.log('Including flight_not_found data in deal properties', {
        dealId: existingDealId || 'new_deal',
        propertyLength: flight_not_found.length,
        snippet: flight_not_found.substring(0, 50) + '...',
        timestamp: new Date().toISOString()
      });
      dealProperties.flight_not_found = flight_not_found;
    }

    console.log('Setting deal properties:', JSON.stringify(dealProperties, null, 2));

    // Create or update deal in HubSpot
    const dealEndpoint = existingDealId
      ? `https://api.hubapi.com/crm/v3/objects/deals/${existingDealId}`
      : 'https://api.hubapi.com/crm/v3/objects/deals';
    const dealMethod = existingDealId ? 'PATCH' : 'POST';

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

    // Always return the deal ID with the same property name
    const returnDealId = dealResult.id || (existingDealId ? existingDealId : null);

    if (!returnDealId) {
      console.warn('No deal ID returned from HubSpot and no existing deal ID to use');
    }

    return {
      hubspotDealId: returnDealId,
      dealId: returnDealId, // For backward compatibility
      message: existingDealId ? 'Successfully updated HubSpot deal' : 'Successfully created HubSpot deal'
    };
  } catch (error) {
    console.error('Error in createDeal:', error);
    throw error;
  }
};

// Add function to get contact details
const getContactDetails = async (contactId) => {
  try {
    console.log('=== Getting Contact Details START ===');
    console.log('Fetching contact details for ID:', contactId);

    if (!contactId) {
      throw new Error('Contact ID is required');
    }

    const response = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}?properties=email,firstname,lastname,salutation,phone,mobilephone,address,city,zip,country`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
    });

    // Check for non-success response
    if (!response.ok) {
      const contentType = response.headers.get('content-type');
      let errorText;

      // Handle different response types (JSON vs HTML)
      if (contentType && contentType.includes('application/json')) {
        const errorData = await response.json();
        errorText = JSON.stringify(errorData);
      } else {
        errorText = await response.text();
        // Truncate HTML responses to avoid huge error logs
        if (errorText.length > 500) {
          errorText = errorText.substring(0, 500) + '... [truncated]';
        }
      }

      console.error('Failed to fetch contact details:', {
        statusCode: response.status,
        statusText: response.statusText,
        errorText,
      });

      throw new Error(`Failed to fetch contact details: ${response.status} ${response.statusText}`);
    }

    // Parse the JSON response
    const data = await response.json();
    console.log('Fetched contact details:', JSON.stringify(data, null, 2));

    return data;
  } catch (error) {
    console.error('Error fetching contact details:', error);
    throw error;
  } finally {
    console.log('=== Getting Contact Details END ===');
  }
};

exports.handler = async (event, context) => {
  try {
    console.log('=== HubSpot Integration Handler START ===');
    console.log('Event path:', event.path);
    console.log('Event method:', event.httpMethod);
    console.log('Event headers:', Object.keys(event.headers));

    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

    // Parse the request body
    let payload;
    try {
      payload = JSON.parse(event.body);
      console.log('Request payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Error parsing request body:', error);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    let result;
    if (event.path.endsWith('/contact-details')) {
      console.log('Processing contact details request');

      // Validate the contact details payload structure
      if (!payload || !payload.contactId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing contact ID in request payload' })
        };
      }

      try {
        result = await getContactDetails(payload.contactId);
        console.log('Contact details operation result:', result);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('Error in contact-details endpoint:', error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: error.message || 'Failed to fetch contact details',
            success: false
          })
        };
      }
    } else if (event.path.endsWith('/contact')) {
      console.log('Processing contact creation/update request');

      // Validate the contact payload structure
      if (!payload) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing request payload' })
        };
      }

      // Check for either contactId or email
      if (!payload.contactId && !payload.email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Either contactId or email is required' })
        };
      }

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
