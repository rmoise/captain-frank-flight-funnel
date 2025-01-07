import { Handler, HandlerEvent } from '@netlify/functions';
import { Flight } from './types';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const { from_iata, to_iata, flight_date, flight_number } =
    event.queryStringParameters || {};

  if (!from_iata || !to_iata || !flight_date || !flight_number) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters' }),
    };
  }

  try {
    const apiUrl = `${API_BASE_URL}/searchflightsbyfromiatatoiatadatenumber?from_iata=${from_iata}&to_iata=${to_iata}&flight_date=${flight_date}&flight_number=${flight_number}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const flights: Flight[] = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(flights),
    };
  } catch (error) {
    console.error('Error searching flights:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

export { handler };
