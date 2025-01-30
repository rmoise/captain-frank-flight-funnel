"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const API_BASE_URL = 'https://secure.captain-frank.net/api/services/euflightclaim';
const handler = async (event) => {
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
        console.log('Raw request received:', JSON.stringify(requestBody, null, 2));
        // Type-safe validation of required fields
        if (!requestBody.journey_booked_flightids ||
            !requestBody.information_received_at ||
            !requestBody.journey_fact_type) {
            const missingFields = [];
            if (!requestBody.journey_booked_flightids)
                missingFields.push('journey_booked_flightids');
            if (!requestBody.information_received_at)
                missingFields.push('information_received_at');
            if (!requestBody.journey_fact_type)
                missingFields.push('journey_fact_type');
            console.error('Missing required fields:', missingFields);
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: `Missing required fields: ${missingFields.join(', ')}`,
                    status: 'error',
                }),
            };
        }
        // Validate journey_fact_type
        if (!['none', 'self', 'provided'].includes(requestBody.journey_fact_type)) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid journey_fact_type',
                    valid_values: ['none', 'self', 'provided'],
                    status: 'error',
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
                    message: 'information_received_at must be in YYYY-MM-DD format',
                }),
            };
        }
        const apiUrl = `${API_BASE_URL}/evaluateeuflightclaim`;
        console.log('Making request to:', apiUrl);
        // Prepare request body according to API documentation
        const apiRequestBody = {
            journey_booked_flightids: requestBody.journey_booked_flightids,
            journey_fact_flightids: requestBody.journey_fact_flightids || [],
            information_received_at: requestBody.information_received_at,
            journey_fact_type: requestBody.journey_fact_type,
            lang: 'en',
        };
        console.log('Transformed request body:', JSON.stringify(apiRequestBody, null, 2));
        console.log('Journey comparison:', {
            booked: requestBody.journey_booked_flightids,
            fact: requestBody.journey_fact_flightids,
            journey_fact_type: requestBody.journey_fact_type,
        });
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
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
                body: JSON.stringify({
                    error: 'Ungültige JSON-Antwort von der API',
                    details: responseText,
                }),
            };
        }
        // Extract the evaluation result from the wrapped response
        const evaluationResult = result.data;
        // Validate response format according to API documentation
        if (!evaluationResult ||
            !evaluationResult.status ||
            !['accept', 'reject'].includes(evaluationResult.status)) {
            console.error('Invalid response format:', evaluationResult);
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error: 'Ungültiges Antwortformat von der API',
                    expected: {
                        data: {
                            status: "'accept' | 'reject'",
                            contract: 'optional',
                            rejection_reasons: 'optional',
                        },
                    },
                    received: result,
                }),
            };
        }
        // Return the response in the format expected by the API documentation
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        };
    }
    catch (error) {
        console.error('Error evaluating EU flight claim:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: 'Interner Serverfehler',
                message: error instanceof Error ? error.message : 'Unbekannter Fehler',
            }),
        };
    }
};
exports.handler = handler;
