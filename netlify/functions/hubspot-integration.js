const fetch = require('node-fetch');
const { Handler } = require('@netlify/functions');

// Validate environment variables
if (!process.env.HUBSPOT_API_TOKEN) {
  console.error('HUBSPOT_API_TOKEN environment variable is not set');
  process.exit(1);
}

const createContact = async (payload) => {
  const { email, personalDetails, flightDetails } = payload;

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
          email: email,
          firstname: personalDetails.firstName,
          lastname: personalDetails.lastName,
          phone: personalDetails.phone || '',
          address: personalDetails.address || '',
          zip: personalDetails.zipCode || '',
          city: personalDetails.city || '',
          country: personalDetails.country || '',
          hs_lead_status: 'NEW',
          booking_number: flightDetails.bookingNumber || '',
        }
      })
    });

    if (!createContactResponse.ok) {
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
          firstname: personalDetails.firstName,
          lastname: personalDetails.lastName,
          phone: personalDetails.phone || '',
          address: personalDetails.address || '',
          zip: personalDetails.zipCode || '',
          city: personalDetails.city || '',
          country: personalDetails.country || '',
          booking_number: flightDetails.bookingNumber || '',
        }
      })
    });

    if (!updateContactResponse.ok) {
      throw new Error('Failed to update contact in HubSpot');
    }
  }

  return {
    hubspotContactId: contactId,
    message: 'Successfully created/updated HubSpot contact'
  };
};

const createDeal = async (payload) => {
  const {
    contactId,
    dealId,
    personalDetails,
    bookingNumber,
    originalFlights,
    selectedFlights,
    evaluationResponse,
    stage,
    status
  } = payload;

  // Format flight details
  const flightDetails = selectedFlights.map(flight =>
    `${flight.departureAirport.code} to ${flight.arrivalAirport.code} (${flight.flightNumber})`
  ).join(', ');

  // Determine deal stage and status based on the stage parameter
  let dealStage, dealStatus, probability;
  switch (stage) {
    case 'initial_assessment':
      dealStage = 'qualificationinprogress';
      dealStatus = 'New Submission';
      probability = '20';
      break;
    case 'evaluation':
      dealStage = 'presentationscheduled';
      dealStatus = status === 'qualified' ? 'Qualified' : 'Disqualified';
      probability = status === 'qualified' ? '60' : '0';
      break;
    case 'final_submission':
      dealStage = 'closedwon';
      dealStatus = status === 'submitted' ? 'Submitted' : 'Rejected';
      probability = '100';
      break;
    default:
      dealStage = 'qualificationinprogress';
      dealStatus = 'New';
      probability = '20';
  }

  // Prepare deal properties
  const dealProperties = {
    dealname: `Flight Claim - ${bookingNumber}`,
    pipeline: 'default',
    dealstage: dealStage,
    hs_deal_stage_probability: probability,
    booking_number: bookingNumber,
    flight_details: flightDetails,
    claim_status: dealStatus,
    hubspot_owner_id: contactId,
  };

  // Add evaluation-specific properties if available
  if (evaluationResponse) {
    dealProperties.amount = evaluationResponse.contract?.amount || '0';
    if (evaluationResponse.rejection_reasons) {
      dealProperties.rejection_reasons = evaluationResponse.rejection_reasons.join(', ');
    }
  }

  // If dealId exists, update the existing deal
  if (dealId) {
    const updateDealResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
      body: JSON.stringify({
        properties: dealProperties
      })
    });

    if (!updateDealResponse.ok) {
      throw new Error('Failed to update deal in HubSpot');
    }

    const dealResult = await updateDealResponse.json();
    dealId = dealResult.id;
  } else {
    // Create new deal
    const createDealResponse = await fetch('https://api.hubapi.com/crm/v3/objects/deals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
      },
      body: JSON.stringify({
        properties: {
          ...dealProperties,
          createdate: new Date().toISOString(),
        },
        associations: [{
          to: { id: contactId },
          types: [{
            associationCategory: 'HUBSPOT_DEFINED',
            associationTypeId: 3
          }]
        }]
      })
    });

    if (!createDealResponse.ok) {
      throw new Error('Failed to create deal in HubSpot');
    }

    const dealResult = await createDealResponse.json();
    dealId = dealResult.id;
  }

  // Update contact status based on deal stage
  const updateContactResponse = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HUBSPOT_API_TOKEN}`,
    },
    body: JSON.stringify({
      properties: {
        hs_lead_status: dealStatus,
        ...(stage === 'final_submission' && {
          firstname: personalDetails.firstName,
          lastname: personalDetails.lastName,
          phone: personalDetails.phone || '',
          address: personalDetails.address || '',
          zip: personalDetails.zipCode || '',
          city: personalDetails.city || '',
          country: personalDetails.country || '',
        })
      }
    })
  });

  if (!updateContactResponse.ok) {
    throw new Error('Failed to update contact in HubSpot');
  }

  return {
    hubspotDealId: dealId,
    message: dealId ? 'Successfully updated HubSpot deal' : 'Successfully created HubSpot deal'
  };
};

const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const payload = JSON.parse(event.body);

    // Handle different endpoints
    if (event.path.endsWith('/contact')) {
      const result = await createContact(payload);
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } else if (event.path.endsWith('/deal')) {
      const result = await createDeal(payload);
      return {
        statusCode: 200,
        body: JSON.stringify(result)
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Endpoint not found' })
      };
    }
  } catch (error) {
    console.error('Error processing request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};

exports.handler = handler;
