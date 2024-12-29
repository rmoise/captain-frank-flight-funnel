import { Handler, HandlerEvent } from '@netlify/functions';
import { CompensationResult } from './types';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const { from_iata, to_iata } = event.queryStringParameters || {};

  if (!from_iata || !to_iata) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' }),
    };
  }

  try {
    const apiUrl = `${API_BASE_URL}/calculatecompensationbyfromiatatoiata?from_iata=${from_iata}&to_iata=${to_iata}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const result = await response.json();
    const amount = result.data || 0;

    const compensationResult: CompensationResult = {
      amount,
      currency: 'EUR',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(compensationResult),
    };
  } catch (error) {
    console.error('Error calculating compensation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

export { handler };
