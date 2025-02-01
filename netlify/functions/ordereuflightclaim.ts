import { Handler, HandlerEvent } from '@netlify/functions';

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
          error: `Invalid journey_fact_type: ${requestBody.journey_fact_type}. Valid values are: ${validJourneyFactTypes.join(', ')}`,
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

    // Log evaluation state if available
    if (requestBody.guid || requestBody.recommendation_guid) {
      console.log('=== EVALUATION STATE ===');
      console.log('Evaluation GUID:', requestBody.guid);
      console.log('Recommendation GUID:', requestBody.recommendation_guid);
      console.log('=====================');
    }

    const apiRequestBody = {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at: requestBody.information_received_at,
      journey_booked_pnr: requestBody.journey_booked_pnr,
      journey_fact_type: requestBody.journey_fact_type,
      owner_salutation: requestBody.owner_salutation,
      owner_firstname: requestBody.owner_firstname,
      owner_lastname: requestBody.owner_lastname,
      owner_street: requestBody.owner_street,
      owner_place: requestBody.owner_place,
      owner_city: requestBody.owner_city,
      owner_country,
      owner_email: requestBody.owner_email,
      owner_phone: requestBody.owner_phone || '',
      owner_marketable_status: false,
      contract_signature: requestBody.contract_signature,
      contract_tac: Boolean(requestBody.contract_tac),
      contract_dp: Boolean(requestBody.contract_dp),
      lang: 'en',
    };

    console.log('=== DETAILED REQUEST LOGGING ===');
    console.log('Journey Booked Flight IDs:', journey_booked_flightids);
    console.log('Journey Fact Flight IDs:', journey_fact_flightids);
    console.log(
      'Journey Fact Type:',
      requestBody.journey_fact_type,
      '(must be one of:',
      validJourneyFactTypes.join(', '),
      ')'
    );
    console.log(
      'Information Received At:',
      requestBody.information_received_at
    );
    console.log('PNR:', requestBody.journey_booked_pnr);
    console.log('================================');

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
    console.log('=== DETAILED API RESPONSE LOGGING ===');
    console.log('Response Status:', response.status);
    console.log(
      'Response Headers:',
      Object.fromEntries(response.headers.entries())
    );
    console.log('Raw Response Text:', responseText);
    console.log('================================');

    if (!response.ok) {
      let errorMessage = `API responded with status ${response.status}`;
      try {
        const errorData = JSON.parse(responseText);
        console.log('Parsed Error Data:', errorData);
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
