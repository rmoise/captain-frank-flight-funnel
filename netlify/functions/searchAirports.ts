import { Handler, HandlerEvent } from '@netlify/functions';
import { Airport } from './types';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed',
    };
  }

  const { term, lang } = event.queryStringParameters || {};
  if (!term) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Search term is required' }),
    };
  }

  try {
    const apiUrl = `${API_BASE_URL}/searchairportsbyterm?term=${encodeURIComponent(term)}${lang ? `&lang=${lang}` : ''}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`API responded with status ${response.status}`);
    }

    const airports: Airport[] = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(airports),
    };
  } catch (error) {
    console.error('Error searching airports:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' }),
    };
  }
};

export { handler };
