import { Handler, HandlerEvent } from '@netlify/functions';
import { EvaluationResult } from './types';

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
    console.log('Parsed request body:', JSON.stringify(requestBody, null, 2));

    // Validate required fields according to API documentation
    if (!requestBody.journey_booked_flightids || !requestBody.information_received_at) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['journey_booked_flightids', 'information_received_at']
        }),
      };
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestBody.information_received_at)) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid date format',
          message: 'information_received_at must be in YYYY-MM-DD format'
        }),
      };
    }

    const apiUrl = `${API_BASE_URL}/evaluateeuflightclaim`;
    console.log('Making request to:', apiUrl);

    // Prepare request body according to API documentation
    const apiRequestBody = {
      journey_booked_flightids: requestBody.journey_booked_flightids,
      journey_fact_flightids: requestBody.journey_fact_flightids || [], // Optional field
      information_received_at: requestBody.information_received_at,
      lang: 'en'
    };

    console.log('Sending request body:', JSON.stringify(apiRequestBody, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(apiRequestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    if (!response.ok) {
      console.error('API error:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      });
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: `API Error: ${response.status} ${response.statusText}`,
          details: responseText
        })
      };
    }

    let result;
    try {
      result = JSON.parse(responseText);
      console.log('Parsed response:', JSON.stringify(result, null, 2));
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Invalid JSON response from API',
          details: responseText
        })
      };
    }

    // Extract the actual data from the response
    const evaluationResult = result.data;

    // Validate response format according to API documentation
    if (!evaluationResult.status || !['accept', 'reject'].includes(evaluationResult.status)) {
      console.error('Invalid response format:', evaluationResult);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Invalid response format from API',
          expected: { status: "'accept' | 'reject'", contract: "optional" },
          received: evaluationResult
        })
      };
    }

    // Format response according to API documentation
    const formattedResponse = {
      status: evaluationResult.status,
      ...(evaluationResult.contract && {
        contract: {
          amount: evaluationResult.contract.amount,
          provision: evaluationResult.contract.provision
        }
      }),
      ...(evaluationResult.rejection_reasons && {
        rejection_reasons: evaluationResult.rejection_reasons
      })
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formattedResponse),
    };
  } catch (error) {
    console.error('Error evaluating EU flight claim:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};

export { handler };
