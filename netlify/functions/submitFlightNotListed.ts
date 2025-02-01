import { Handler } from '@netlify/functions';
import fetch from 'node-fetch';

interface FlightNotListedData {
  salutation: string;
  firstName: string;
  lastName: string;
  email: string;
  description: string;
}

const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' }),
    };
  }

  try {
    const data: FlightNotListedData = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!data.email || !data.firstName || !data.lastName || !data.description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required fields' }),
      };
    }

    // Submit to HubSpot Forms API
    const hubspotPortalId = process.env.HUBSPOT_PORTAL_ID;
    const hubspotFormGuid = process.env.HUBSPOT_FORM_GUID;

    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${hubspotPortalId}/${hubspotFormGuid}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: [
            {
              name: 'salutation',
              value: data.salutation,
            },
            {
              name: 'firstname',
              value: data.firstName,
            },
            {
              name: 'lastname',
              value: data.lastName,
            },
            {
              name: 'email',
              value: data.email,
            },
            {
              name: 'flight_details',
              value: data.description,
            },
          ],
          context: {
            pageUri: event.headers.referer || '',
            pageName: 'Flight Not Listed Form',
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to submit to HubSpot');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Form submitted successfully' }),
    };
  } catch (error) {
    console.error('Error processing form submission:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

export { handler };
