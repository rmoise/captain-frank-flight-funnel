const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only process webhooks in production environment
  if (process.env.NEXT_PUBLIC_SANITY_DATASET !== 'production') {
    console.log('Webhook skipped - not in production environment');
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Webhook skipped - not in production environment' }),
    };
  }

  const payload = JSON.parse(event.body);
  const zapierWebhookUrl = 'https://hooks.zapier.com/hooks/catch/21094639/28dc6ms/';

  try {
    const response = await fetch(zapierWebhookUrl, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Zapier webhook failed: ${response.statusText}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Webhook successfully sent to Zapier' }),
    };
  } catch (error) {
    console.error('Processing error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Webhook processing failed' }),
    };
  }
};
