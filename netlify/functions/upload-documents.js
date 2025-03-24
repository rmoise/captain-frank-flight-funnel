const fetch = require('node-fetch');
const multipart = require('parse-multipart-data');
const https = require('https');
const FormData = require('form-data');
const { formidable } = require('formidable');
const fs = require('fs');
const util = require('util');

// Helper function to make HTTP requests with timeout
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      resolve(res);
    });

    req.on('error', (err) => {
      console.error(`Request error: ${err.message}`);
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    // Set a timeout
    req.setTimeout(30000); // 30 seconds

    // If there's a body, write it
    if (options.body) {
      if (options.body instanceof FormData) {
        // For FormData, get the buffer representation
        options.body.pipe(req);
      } else {
        // For other body types
        const body = typeof options.body === 'string' ? options.body :
                    (options.body instanceof Buffer ? options.body :
                     (Buffer.isBuffer(options.body) ? options.body :
                      JSON.stringify(options.body)));

        req.write(body);
      }
    }

    req.end();
  });
}

// Helper function to read the entire response body as text
async function readResponseBody(res) {
  return new Promise((resolve, reject) => {
    let data = '';
    res.on('data', chunk => {
      data += chunk;
    });
    res.on('end', () => {
      resolve(data);
    });
    res.on('error', err => {
      reject(err);
    });
  });
}

// Helper function to convert buffer to base64
function bufferToBase64(buffer) {
  return buffer.toString('base64');
}

// Main handler for document uploads
exports.handler = async (event, context) => {
  console.log('Starting file upload process');

  // Check if it's a POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed - only POST is supported' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Get headers
  const contentType = event.headers['content-type'] || '';

  // Check content type
  if (!contentType.includes('multipart/form-data')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Only multipart/form-data is supported' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  console.log('Received multipart/form-data request');

  // Parse the multipart form data using parse-multipart-data
  let parts = [];
  let fields = {};
  let files = {};

  try {
    // Extract boundary from content type
    const boundaryMatch = contentType.match(/boundary=(?:([^;]+)|"([^"]+)")/);
    if (!boundaryMatch) {
      throw new Error('No boundary found in content-type header');
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    console.log('Using boundary:', boundary);

    // Convert body from base64 if needed
    const buffer = Buffer.from(event.body, 'base64');
    console.log(`Request body size: ${buffer.length} bytes`);

    // Parse the multipart form data
    parts = multipart.parse(buffer, boundary);
    console.log(`Successfully parsed ${parts.length} parts from the request`);

    // Process parts into fields and files
    for (const part of parts) {
      const name = part.name;

      if (part.filename) {
        // This is a file
        files[name] = {
          originalFilename: part.filename,
          mimetype: part.type,
          data: part.data
        };
        console.log(`Found file: ${name}, filename: ${part.filename}, type: ${part.type}, size: ${part.data.length} bytes`);
      } else {
        // This is a regular field
        fields[name] = part.data.toString();
        console.log(`Found field: ${name}, value: ${fields[name]}`);
      }
    }
  } catch (error) {
    console.error('Error parsing multipart form data:', error);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'Failed to parse multipart form data',
        details: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Access HubSpot API key from environment variables
  let hubspotApiKey = process.env.HUBSPOT_API_KEY || process.env.HUBSPOT_API_TOKEN;

  console.log('Environment variables available:', Object.keys(process.env).filter(key =>
    key.includes('HUBSPOT') || key.includes('API')
  ));

  // Check if the key is malformed (contains ${...} or other template strings)
  if (hubspotApiKey && (hubspotApiKey.includes('${') || hubspotApiKey.includes('}'))) {
    console.error('HubSpot API key appears to be malformed - contains template strings');
    console.log('Raw key value:', hubspotApiKey);

    // Try to get the raw value without template string syntax
    if (process.env.HUBSPOT_API_KEY_RAW) {
      hubspotApiKey = process.env.HUBSPOT_API_KEY_RAW;
      console.log('Using raw key from HUBSPOT_API_KEY_RAW');
    } else {
      // As a fallback, strip out template syntax
      hubspotApiKey = hubspotApiKey.replace(/\${|\}/g, '');
      console.log('Attempting to fix malformed key by removing template syntax');
    }
  }

  if (!hubspotApiKey) {
    console.error('HUBSPOT_API_KEY or HUBSPOT_API_TOKEN not found in environment variables!');
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server configuration error - missing HubSpot API key',
        envVars: Object.keys(process.env).filter(key => !key.includes('AWS') && !key.includes('SECRET')).join(', ')
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } else {
    console.log('HubSpot API key is available:',
      hubspotApiKey.length > 6
        ? hubspotApiKey.substring(0, 3) + '...' + hubspotApiKey.substring(hubspotApiKey.length - 3)
        : '[key too short to display safely]');
  }

  // Parse the claim ID from form data
  const claimId = fields.claimId;
  const email = fields.email;
  const firstName = fields.firstName;
  const lastName = fields.lastName;

  // Check if the deal exists in HubSpot
  let dealExists = false;
  let hubspotDealId = fields.hubspotDealId || null;

  // If we already have a HubSpot deal ID, verify if it exists
  if (hubspotDealId) {
    try {
      console.log(`Checking if provided HubSpot deal ID exists: ${hubspotDealId}`);

      const dealResponse = await makeRequest(
        `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (dealResponse.statusCode === 200) {
        dealExists = true;
        console.log(`Verified existing HubSpot deal with ID: ${hubspotDealId}`);
      } else {
        const errorBody = await readResponseBody(dealResponse);
        console.log(`Deal verification failed: ${dealResponse.statusCode}, details: ${errorBody}`);
        hubspotDealId = null; // Reset as deal doesn't exist
      }
    } catch (error) {
      console.log(`Error verifying deal: ${error.message}`);
      hubspotDealId = null;
    }
  }

  // If we have an email but no confirmed deal ID, try to find deals associated with the contact
  if (!dealExists && email) {
    try {
      console.log(`Looking up contact by email: ${email}`);

      // First find the contact by email
      const contactResponse = await makeRequest(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: email
                  }
                ]
              }
            ],
            properties: ["email", "firstname", "lastname"]
          })
        }
      );

      if (contactResponse.statusCode === 200) {
        const contactData = JSON.parse(await readResponseBody(contactResponse));
        console.log(`Contact search results: ${JSON.stringify(contactData)}`);

        if (contactData.results && contactData.results.length > 0) {
          const contactId = contactData.results[0].id;
          console.log(`Found HubSpot contact with ID: ${contactId}`);

          // Look for deals associated with this contact
          const dealsResponse = await makeRequest(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}/associations/deals`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`
              }
            }
          );

          if (dealsResponse.statusCode === 200) {
            const dealsData = JSON.parse(await readResponseBody(dealsResponse));
            console.log(`Found ${dealsData.results ? dealsData.results.length : 0} associated deals`);

            if (dealsData.results && dealsData.results.length > 0) {
              // Use the most recent deal associated with this contact
              hubspotDealId = dealsData.results[0].id;
              dealExists = true;
              console.log(`Using associated deal with ID: ${hubspotDealId}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for deals by contact: ${error.message}`);
    }
  }

  // If still no deal found, and we have a claim ID, try to find by dealname search
  if (!dealExists && claimId) {
    try {
      console.log(`Searching for deals with claim ID: ${claimId}`);

      // First try to find by deal name containing UUID
      // In the hubspot-integration.js file, deals are created with names like:
      // "${dealId} - ${firstName} ${lastName}" or "${dealId} - New Flight Delay Claim"
      const searchDealsByIdResponse = await makeRequest(
        `https://api.hubapi.com/crm/v3/objects/deals/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [
              {
                filters: [
                  {
                    propertyName: "dealname",
                    operator: "CONTAINS",
                    value: claimId
                  }
                ]
              }
            ],
            sorts: [
              {
                propertyName: "createdate",
                direction: "DESCENDING"
              }
            ],
            limit: 10,
            properties: ["dealname"]
          })
        }
      );

      if (searchDealsByIdResponse.statusCode === 200) {
        const searchBody = await readResponseBody(searchDealsByIdResponse);
        const searchData = JSON.parse(searchBody);

        if (searchData.results && searchData.results.length > 0) {
          hubspotDealId = searchData.results[0].id;
          console.log(`Found matching HubSpot deal with name containing ID: ${hubspotDealId}`);
        } else {
          console.log(`No deals found containing claim ID: ${claimId} in dealname`);

          // If not found, try a second approach based on customer name if available
          if (firstName && lastName) {
            console.log(`Trying to find deal by customer name: ${firstName} ${lastName}`);

            const searchDealsByNameResponse = await makeRequest(
              `https://api.hubapi.com/crm/v3/objects/deals/search`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hubspotApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  filterGroups: [
                    {
                      filters: [
                        {
                          propertyName: "dealname",
                          operator: "CONTAINS",
                          value: `${firstName} ${lastName}`
                        }
                      ]
                    }
                  ],
                  sorts: [
                    {
                      propertyName: "createdate",
                      direction: "DESCENDING"
                    }
                  ],
                  limit: 5,
                  properties: ["dealname"]
                })
              }
            );

            if (searchDealsByNameResponse.statusCode === 200) {
              const nameSearchBody = await readResponseBody(searchDealsByNameResponse);
              const nameSearchData = JSON.parse(nameSearchBody);

              if (nameSearchData.results && nameSearchData.results.length > 0) {
                hubspotDealId = nameSearchData.results[0].id;
                console.log(`Found matching HubSpot deal with name containing customer name: ${hubspotDealId}`);
              } else {
                console.log(`No deals found containing customer name: ${firstName} ${lastName}`);
              }
            }
          }
        }
      } else {
        console.log(`Deal search failed with status: ${searchDealsByIdResponse.statusCode}`);
        const searchErrorBody = await readResponseBody(searchDealsByIdResponse);
        console.log(`Deal search error: ${searchErrorBody}`);
      }
    } catch (searchError) {
      console.error(`Error searching for matching deal: ${searchError.message}`);
    }
  }

  // Last resort - try searching for ANY deal if customer details are available
  if (!dealExists && (email || (firstName && lastName))) {
    try {
      console.log('Trying last resort search for ANY deal with customer information');

      // Search for deals
      const lastResortQuery = await makeRequest(
        'https://api.hubapi.com/crm/v3/objects/deals/search',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filterGroups: [
              ...(email ? [{
                filters: [
                  {
                    propertyName: "email",
                    operator: "EQ",
                    value: email
                  }
                ]
              }] : []),
              ...(firstName && lastName ? [{
                filters: [
                  {
                    propertyName: "dealname",
                    operator: "CONTAINS",
                    value: `${firstName}`
                  }
                ]
              }] : [])
            ],
            sorts: [
              {
                propertyName: "createdate",
                direction: "DESCENDING"
              }
            ],
            limit: 1,
            properties: ["dealname"]
          })
        }
      );

      if (lastResortQuery.statusCode === 200) {
        const searchData = JSON.parse(await readResponseBody(lastResortQuery));

        if (searchData.results && searchData.results.length > 0) {
          hubspotDealId = searchData.results[0].id;
          dealExists = true;
          console.log(`Last resort search found deal with ID: ${hubspotDealId}`);
        } else {
          console.log('Last resort search did not find any deals');
        }
      }
    } catch (error) {
      console.error(`Error in last resort search: ${error.message}`);
    }
  }

  // If no deal was found but we have a claim ID, let's create one
  if (!dealExists && claimId) {
    try {
      console.log(`No existing deal found, creating a new deal for claim ID: ${claimId}`);

      // Create a deal name using the same format as hubspot-integration.js
      // In hubspot-integration.js, names are like: "${uuid} - ${firstName} ${lastName}" or "${uuid} - New Flight Delay Claim"
      let dealName;
      if (firstName && lastName) {
        dealName = `${claimId} - ${firstName} ${lastName}`;
      } else {
        dealName = `${claimId} - New Flight Delay Claim`;
      }

      console.log(`Creating deal with name: ${dealName}`);

      // Prepare deal properties based on hubspot-integration.js
      const dealProperties = {
        dealname: dealName,
        pipeline: 'default',
        dealstage: 'appointmentscheduled',
        description: `Document Upload Phase\nClaim ID: ${claimId}`
      };

      // Add email if available
      if (email) {
        dealProperties.email = email;
      }

      // Add amount if available
      if (fields.amount) {
        dealProperties.amount = fields.amount.toString();
      }

      const createDealResponse = await makeRequest(
        'https://api.hubapi.com/crm/v3/objects/deals',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: dealProperties
          })
        }
      );

      if (createDealResponse.statusCode === 201) {
        const createDealBody = await readResponseBody(createDealResponse);
        const createDealData = JSON.parse(createDealBody);

        hubspotDealId = createDealData.id;
        dealExists = true;
        console.log(`Created new HubSpot deal with ID: ${hubspotDealId}`);
      } else {
        const createDealError = await readResponseBody(createDealResponse);
        console.error(`Failed to create deal: ${createDealError}`);
      }
    } catch (createDealError) {
      console.error(`Error creating deal: ${createDealError.message}`);
    }
  }

  // Define HubSpot property names
  const bookingConfirmationProperty = fields.bookingConfirmationProperty || 'buchungsbestatigung';
  const cancellationNotificationProperty = fields.cancellationNotificationProperty || 'annullierungsbestatigung';

  console.log(`Using booking confirmation property: ${bookingConfirmationProperty}`);
  console.log(`Using cancellation notification property: ${cancellationNotificationProperty}`);

  // Prepare the results object
  const uploadResults = {};

  // Upload booking confirmation file if it exists
  if (files.bookingConfirmation) {
    try {
      const file = files.bookingConfirmation;
      const fileBuffer = file.data;
      const fileName = file.originalFilename;
      const fileType = file.mimetype || 'application/octet-stream';

      console.log(`Uploading file: ${fileName}, type: ${fileType}, size: ${fileBuffer.length} bytes`);

      // Always attempt to upload to HubSpot
      if (!hubspotApiKey) {
        throw new Error('No HubSpot API key provided - unable to upload files');
      }

      // Create a Node.js FormData object
      const hubspotFormData = new FormData();
      console.log('Created FormData object for HubSpot upload');

      // Append file - using Buffer directly instead of assuming it's FormData
      hubspotFormData.append('file', Buffer.from(fileBuffer), {
        filename: fileName,
        contentType: fileType
      });
      console.log(`Appended file to FormData: ${fileName} (${fileType}), size: ${fileBuffer.length} bytes`);

      // Append other form fields
      hubspotFormData.append('folderPath', '/');
      hubspotFormData.append('options', JSON.stringify({
        access: 'PUBLIC_INDEXABLE',
        overwrite: true
      }));
      console.log('Appended additional fields to FormData');

      // Get form data headers
      const formHeaders = hubspotFormData.getHeaders();
      console.log('FormData headers:', formHeaders);

      // Using the FormData object with Node.js fetch
      const fileUploadResponse = await makeRequest(
        'https://api.hubapi.com/files/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            ...formHeaders
          },
          body: hubspotFormData
        }
      );

      if (!fileUploadResponse.statusCode || fileUploadResponse.statusCode >= 400) {
        const fileError = await readResponseBody(fileUploadResponse);
        console.error(`Error uploading to HubSpot Files API: ${fileError}`);
        throw new Error(`Failed to upload file to HubSpot: ${fileError}`);
      }

      const fileDataRaw = await readResponseBody(fileUploadResponse);
      const fileData = JSON.parse(fileDataRaw);
      console.log(`File uploaded to HubSpot: ${JSON.stringify(fileData)}`);

      // Parse the response for Files API v3
      const fileId = fileData.id;
      const fileUrl = fileData.url;

      if (!fileUrl) {
        console.warn('No file URL found in response', fileData);
        throw new Error('No file URL found in HubSpot response');
      }

      // Only associate the file with the deal if the deal exists
      if (dealExists && hubspotDealId) {
        try {
          console.log(`Attempting to associate file with deal ${hubspotDealId}, property: ${bookingConfirmationProperty}`);
          console.log(`File URL to associate: ${fileUrl}`);
          console.log(`File ID to associate: ${fileId}`);

          // First try with URL (standard way)
          const associationResponse = await makeRequest(
            `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}/`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                properties: {
                  [bookingConfirmationProperty]: fileUrl
                }
              })
            }
          );

          if (associationResponse.statusCode !== 200) {
            // If URL association fails, try with file ID
            console.log(`URL association failed with status: ${associationResponse.statusCode}, trying with file ID`);

            const idAssociationResponse = await makeRequest(
              `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}/`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${hubspotApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  properties: {
                    [bookingConfirmationProperty]: fileId.toString()
                  }
                })
              }
            );

            if (idAssociationResponse.statusCode === 200) {
              const idAssocDataRaw = await readResponseBody(idAssociationResponse);
              const idAssocData = JSON.parse(idAssocDataRaw);
              console.log(`File ID successfully associated with deal: ${idAssocData.id}, property: ${bookingConfirmationProperty}`);
            } else {
              const idAssocError = await readResponseBody(idAssociationResponse);
              console.error(`Error associating file ID with deal: ${idAssociationResponse.statusCode}, Error: ${idAssocError}`);
            }
          } else {
            const assocDataRaw = await readResponseBody(associationResponse);
            const assocData = JSON.parse(assocDataRaw);
            console.log(`File successfully associated with deal: ${assocData.id}, property: ${bookingConfirmationProperty}`);
          }
        } catch (associationError) {
          console.error(`Error associating file: ${associationError.message}`);
        }
      }

      uploadResults.bookingConfirmation = {
        success: true,
        fileId: fileId,
        url: fileUrl,
        property: bookingConfirmationProperty,
        associatedWithDeal: dealExists
      };
    } catch (error) {
      console.error(`Error uploading booking confirmation: ${error.message}`);
      uploadResults.bookingConfirmation = {
        success: false,
        error: error.message
      };
    }
  }

  // Upload cancellation notification if provided
  if (files.cancellationNotification) {
    try {
      const file = files.cancellationNotification;
      const fileBuffer = file.data;
      const fileName = file.originalFilename;
      const fileType = file.mimetype || 'application/octet-stream';

      console.log(`Uploading cancellation file: ${fileName}, type: ${fileType}, size: ${fileBuffer.length} bytes`);

      // Always attempt to upload to HubSpot
      if (!hubspotApiKey) {
        throw new Error('No HubSpot API key provided - unable to upload files');
      }

      // Create a Node.js FormData object
      const hubspotFormData = new FormData();

      // Append file - using Buffer directly
      hubspotFormData.append('file', Buffer.from(fileBuffer), {
        filename: fileName,
        contentType: fileType
      });

      // Append other form fields
      hubspotFormData.append('folderPath', '/');
      hubspotFormData.append('options', JSON.stringify({
        access: 'PUBLIC_INDEXABLE',
        overwrite: true
      }));

      // Get form data headers
      const formHeaders = hubspotFormData.getHeaders();

      // Using the FormData object with Node.js fetch
      const fileUploadResponse = await makeRequest(
        'https://api.hubapi.com/files/v3/files',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hubspotApiKey}`,
            ...formHeaders
          },
          body: hubspotFormData
        }
      );

      if (!fileUploadResponse.statusCode || fileUploadResponse.statusCode >= 400) {
        const fileError = await readResponseBody(fileUploadResponse);
        console.error(`Error uploading cancellation notification to HubSpot Files API: ${fileError}`);
        throw new Error(`Failed to upload cancellation file to HubSpot: ${fileError}`);
      }

      const fileDataRaw = await readResponseBody(fileUploadResponse);
      const fileData = JSON.parse(fileDataRaw);
      console.log(`Cancellation file uploaded to HubSpot: ${JSON.stringify(fileData)}`);

      // Parse the response
      const fileId = fileData.id;
      const fileUrl = fileData.url;

      if (!fileUrl) {
        console.warn('No cancellation file URL found in response', fileData);
        throw new Error('No file URL found in HubSpot response for cancellation notification');
      }

      // Only associate the file with the deal if the deal exists
      if (dealExists && hubspotDealId) {
        try {
          console.log(`Attempting to associate cancellation file with deal ${hubspotDealId}, property: ${cancellationNotificationProperty}`);
          console.log(`Cancellation file URL to associate: ${fileUrl}`);
          console.log(`Cancellation file ID to associate: ${fileId}`);

          // First try with URL (standard way)
          const associationResponse = await makeRequest(
            `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}/`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                properties: {
                  [cancellationNotificationProperty]: fileUrl
                }
              })
            }
          );

          if (associationResponse.statusCode !== 200) {
            // If URL association fails, try with file ID
            console.log(`URL association failed with status: ${associationResponse.statusCode}, trying with file ID`);

            const idAssociationResponse = await makeRequest(
              `https://api.hubapi.com/crm/v3/objects/deals/${hubspotDealId}/`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${hubspotApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  properties: {
                    [cancellationNotificationProperty]: fileId.toString()
                  }
                })
              }
            );

            if (idAssociationResponse.statusCode === 200) {
              const idAssocDataRaw = await readResponseBody(idAssociationResponse);
              const idAssocData = JSON.parse(idAssocDataRaw);
              console.log(`Cancellation file ID successfully associated with deal: ${idAssocData.id}, property: ${cancellationNotificationProperty}`);
            } else {
              const idAssocError = await readResponseBody(idAssociationResponse);
              console.error(`Error associating cancellation file ID with deal: ${idAssociationResponse.statusCode}, Error: ${idAssocError}`);
            }
          } else {
            const assocDataRaw = await readResponseBody(associationResponse);
            const assocData = JSON.parse(assocDataRaw);
            console.log(`Cancellation file successfully associated with deal: ${assocData.id}, property: ${cancellationNotificationProperty}`);
          }
        } catch (associationError) {
          console.error(`Error associating cancellation file: ${associationError.message}`);
        }
      }

      uploadResults.cancellationNotification = {
        success: true,
        fileId: fileId,
        url: fileUrl,
        property: cancellationNotificationProperty,
        associatedWithDeal: dealExists
      };
    } catch (error) {
      console.error(`Error uploading cancellation notification: ${error.message}`);
      uploadResults.cancellationNotification = {
        success: false,
        error: error.message
      };
    }
  }

  // Return results
  const allSuccessful =
    (uploadResults.bookingConfirmation?.success || !files.bookingConfirmation) &&
    (uploadResults.cancellationNotification?.success || !files.cancellationNotification);

  const message = allSuccessful
    ? (dealExists
      ? ''
      : 'Files uploaded successfully but could not be linked to a deal. Please contact support.')
    : 'Some files failed to upload to HubSpot';

  return {
    statusCode: allSuccessful ? 200 : 400, // 400 Bad Request if files failed to upload
    body: JSON.stringify({
      success: allSuccessful,
      message: message,
      results: uploadResults,
      dealExists: dealExists,
      claimId: claimId || null
    }),
    headers: { 'Content-Type': 'application/json' }
  };
};