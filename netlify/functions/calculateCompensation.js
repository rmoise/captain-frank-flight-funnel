"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const API_BASE_URL = 'https://secure.captain-frank.net/api/services/euflightclaim';
const handler = async (event) => {
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
        console.log('=== Calculate Compensation Function Start ===');
        console.log('Request parameters:', { from_iata, to_iata });

        const apiUrl = `${API_BASE_URL}/calculatecompensationbyfromiatatoiata?from_iata=${from_iata}&to_iata=${to_iata}`;
        console.log('API URL:', apiUrl);

        const response = await fetch(apiUrl, {
            method: 'GET',
            timeout: 10000, // 10 second timeout
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('API Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            console.log('=== Using fallback compensation amount due to API error ===');

            // Return a fallback compensation value instead of failing completely
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: 250, // Default fallback amount
                    currency: 'EUR',
                    fallback: true, // Flag to indicate this is a fallback value
                }),
            };
        }

        const result = await response.json();
        console.log('API Response data:', result);

        if (typeof result.data !== 'number') {
            console.error('Invalid response format:', result);
            console.log('=== Using fallback compensation amount due to invalid format ===');

            // Return a fallback value instead of failing
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: 250, // Default fallback amount
                    currency: 'EUR',
                    fallback: true, // Flag to indicate this is a fallback value
                }),
            };
        }

        const amount = result.data || 0;
        const compensationResult = {
            amount,
            currency: 'EUR',
        };

        console.log('=== Calculate Compensation Function End ===');
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(compensationResult),
        };
    }
    catch (error) {
        console.error('Error calculating compensation:', error);
        console.log('Error details:', error.message, error.stack);
        console.log('=== Using fallback compensation amount due to exception ===');

        // Return a fallback value even in case of an exception
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: 250, // Default fallback amount
                currency: 'EUR',
                fallback: true, // Flag to indicate this is a fallback value
                error: error.message
            }),
        };
    }
};
exports.handler = handler;
