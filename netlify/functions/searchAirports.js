"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const API_BASE_URL = 'https://secure.captain-frank.net/api/services/euflightclaim';
const handler = async (event) => {
    // Add CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Content-Type': 'application/json',
    };
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 204,
            headers,
            body: '',
        };
    }
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' }),
        };
    }
    const { term, lang } = event.queryStringParameters || {};
    if (!term) {
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Search term is required' }),
        };
    }
    try {
        const apiUrl = `${API_BASE_URL}/searchairportsbyterm?term=${encodeURIComponent(term)}${lang ? `&lang=${lang}` : ''}`;
        console.log('Making request to:', apiUrl);
        const response = await fetch(apiUrl, {
            headers: {
                Accept: 'application/json',
            },
        });
        console.log('Response status:', response.status);
        const responseText = await response.text();
        console.log('Raw API response:', responseText);
        if (!response.ok) {
            console.error('API error:', {
                status: response.status,
                statusText: response.statusText,
                body: responseText,
            });
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({
                    error: `API Error: ${response.status} ${response.statusText}`,
                    details: responseText,
                }),
            };
        }
        let result;
        try {
            result = JSON.parse(responseText);
            console.log('Parsed response:', JSON.stringify(result, null, 2));
        }
        catch (parseError) {
            console.error('Failed to parse API response:', parseError);
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    error: 'Invalid JSON response from API',
                    details: responseText,
                }),
            };
        }
        // Extract airports from response data
        const airports = Array.isArray(result.data) ? result.data : [];
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(airports),
        };
    }
    catch (error) {
        console.error('Error searching airports:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
