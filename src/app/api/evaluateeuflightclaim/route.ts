import { NextResponse } from 'next/server';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const {
      journey_booked_flightids,
      information_received_at,
      delay_duration,
      travel_status,
      journey_fact_type,
    } = data;

    console.log('Received evaluation request:', {
      journey_booked_flightids,
      information_received_at,
      delay_duration,
      travel_status,
      journey_fact_type,
    });

    if (
      !journey_booked_flightids ||
      !Array.isArray(journey_booked_flightids) ||
      journey_booked_flightids.length === 0
    ) {
      console.error('Invalid flight IDs provided:', journey_booked_flightids);
      return NextResponse.json(
        { error: 'Invalid flight IDs provided' },
        { status: 400 }
      );
    }

    if (!information_received_at) {
      console.error('Missing information_received_at');
      return NextResponse.json(
        { error: 'Information received date is required' },
        { status: 400 }
      );
    }

    // Convert delay duration to minutes for the API
    let delay_minutes = 0;
    if (delay_duration === '>3' || delay_duration === 'gt3') {
      delay_minutes = 240; // Set to 4 hours for alternative flights
    } else if (delay_duration === '2-3' || delay_duration === '2to3') {
      delay_minutes = 120; // 2-3 hours
    } else if (delay_duration === '<2' || delay_duration === 'lt2') {
      delay_minutes = 90; // Less than 2 hours
    } else if (typeof delay_duration === 'string') {
      // Try to parse numeric value
      const minutes = parseInt(delay_duration, 10);
      if (!isNaN(minutes)) {
        delay_minutes = minutes;
      }
    }

    // Set journey_fact_flightids based on journey_fact_type
    let journey_fact_flightids = [];
    switch (journey_fact_type) {
      case 'self':
        journey_fact_flightids = journey_booked_flightids;
        break;
      case 'provided':
        journey_fact_flightids = data.journey_fact_flightids || [];
        break;
      case 'none':
        journey_fact_flightids = [];
        break;
      default:
        console.warn('Unexpected journey fact type:', journey_fact_type);
        journey_fact_flightids = [];
    }

    // Log the final flight IDs for debugging
    console.log('Final flight IDs:', {
      booked: journey_booked_flightids,
      fact: journey_fact_flightids,
      status: travel_status,
      fact_type: journey_fact_type,
    });

    const apiUrl = `${API_BASE_URL}/evaluateeuflightclaim`;
    console.log('Making request to external API:', apiUrl);

    // Log the final request body before sending
    const requestBody = {
      journey_booked_flightids,
      journey_fact_flightids,
      information_received_at,
      delay_minutes,
      lang: 'de',
    };
    console.log(
      'Sending request to external API:',
      JSON.stringify(requestBody, null, 2)
    );

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
      cache: 'no-store',
    });

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    if (!response.ok) {
      console.error('External API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
        requestBody, // Log the request body that caused the error
      });
      return NextResponse.json(
        {
          error: `API request failed with status ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const result = JSON.parse(responseText);
    console.log('Parsed API response:', result);

    const status = result.status || (result.data && result.data.status);

    if (!status || !['accept', 'reject'].includes(status)) {
      console.error('Invalid response format from external API:', result);
      return NextResponse.json(
        { error: 'Invalid response format from external API' },
        { status: 500 }
      );
    }

    const finalResult = result.data || result;
    console.log('Returning API response:', finalResult);
    return NextResponse.json(finalResult);
  } catch (error) {
    console.error('Error in evaluateEuflightClaim:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
