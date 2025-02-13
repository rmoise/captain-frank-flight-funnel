const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const retryFetch = async (
  url: string,
  options: any,
  retries = MAX_RETRIES
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
      console.log(
        `Retrying HubSpot API call. Attempts remaining: ${retries - 1}`
      );
      await sleep(RETRY_DELAY);
      return retryFetch(url, options, retries - 1);
    }
    throw error;
  }
};

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { contactId, ...contactData } = JSON.parse(event.body);

    if (!contactId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Contact ID is required' }),
      };
    }

    console.log('Updating HubSpot contact with retry logic:', {
      contactId,
      ...contactData,
      timestamp: new Date().toISOString(),
    });

    const response = await retryFetch(
      `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            email: contactData.email,
            firstname: contactData.firstName,
            lastname: contactData.lastName,
            phone: contactData.phone || '',
            mobilephone: contactData.phone || '',
            address: contactData.address || '',
            city: contactData.city || '',
            zip: contactData.postalCode || '',
            country: contactData.country || '',
            arbeitsrecht_marketing_status: Boolean(
              contactData.arbeitsrecht_marketing_status
            ),
          },
        }),
      }
    );

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Error updating HubSpot contact:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
};
