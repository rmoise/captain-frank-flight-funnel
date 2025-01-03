import { Handler, HandlerEvent } from '@netlify/functions';
import { v4 as uuidv4 } from 'uuid';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Request body is required' }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body);
    console.log('Received request body:', requestBody);

    // Validate required fields
    const requiredFields = [
      'journey_booked_flightids',
      'journey_fact_flightids',
      'information_received_at',
      'journey_booked_pnr',
      'journey_fact_type',
      'owner_salutation',
      'owner_firstname',
      'owner_lastname',
      'owner_street',
      'owner_place',
      'owner_city',
      'owner_country',
      'owner_email',
      'owner_marketable_status',
      'contract_signature',
      'contract_tac',
      'contract_dp',
    ];

    const missingFields = requiredFields.filter((field) => !requestBody[field]);
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: `Missing required fields: ${missingFields.join(', ')}`,
          status: 'error',
        }),
      };
    }

    // Validate journey_fact_type
    const validJourneyFactTypes = ['none', 'self', 'provided'];
    if (!validJourneyFactTypes.includes(requestBody.journey_fact_type)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid journey_fact_type',
          valid_values: validJourneyFactTypes,
          status: 'error',
        }),
      };
    }

    // Validate owner_salutation
    if (!['herr', 'frau'].includes(requestBody.owner_salutation)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid owner_salutation',
          valid_values: ['herr', 'frau'],
          status: 'error',
        }),
      };
    }

    // Ensure flight IDs are numbers
    const journey_booked_flightids =
      requestBody.journey_booked_flightids.map(Number);
    const journey_fact_flightids =
      requestBody.journey_fact_flightids.map(Number);

    // Convert country to uppercase
    const owner_country = requestBody.owner_country.toUpperCase();

    const apiUrl = `${API_BASE_URL}/ordereuflightclaim`;
    console.log('Making request to:', apiUrl);

    // Generate UUIDs if not provided
    const guid = requestBody.guid || uuidv4();
    const recommendation_guid = requestBody.recommendation_guid || uuidv4();

    const apiRequestBody = {
      ...requestBody,
      journey_booked_flightids,
      journey_fact_flightids,
      owner_country,
      owner_marketable_status: Boolean(requestBody.owner_marketable_status),
      contract_tac: Boolean(requestBody.contract_tac),
      contract_dp: Boolean(requestBody.contract_dp),
      guid,
      recommendation_guid,
      lang: 'en',
    };

    console.log('API request body:', apiRequestBody);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(apiRequestBody),
    });

    const responseText = await response.text();
    console.log('API Response:', responseText);

    if (!response.ok) {
      let errorMessage = `API responded with status ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch (e) {
        console.error('Failed to parse error response:', e);
      }
      throw new Error(errorMessage);
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse success response:', e);
      throw new Error('Invalid response format from API');
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error ordering EU flight claim:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal Server Error',
        details: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
};

export { handler };
