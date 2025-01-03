import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('Received order request:', JSON.stringify(data, null, 2));

    // Validate required fields
    const requiredFields = [
      'journey_booked_flightids',
      'journey_fact_flightids',
      'information_received_at',
      'journey_booked_pnr',
      'journey_fact_type',
      'owner_salutation',
      'owner_firstname',
      'owner_lastname',
      'owner_street',
      'owner_place',
      'owner_city',
      'owner_country',
      'owner_email',
      'owner_marketable_status',
      'contract_signature',
      'contract_tac',
      'contract_dp',
    ];

    const missingFields = requiredFields.filter((field) => !data[field]);
    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        {
          error: `Missing required fields: ${missingFields.join(', ')}`,
          status: 'error',
        },
        { status: 400 }
      );
    }

    const response = await fetch(
      'https://secure.captain-frank.net/api/services/euflightclaim/ordereuflightclaim',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          journey_booked_flightids: data.journey_booked_flightids,
          journey_fact_flightids: data.journey_fact_flightids,
          information_received_at: data.information_received_at,
          journey_booked_pnr: data.journey_booked_pnr,
          journey_fact_type: data.journey_fact_type,
          owner_salutation: data.owner_salutation,
          owner_firstname: data.owner_firstname,
          owner_lastname: data.owner_lastname,
          owner_street: data.owner_street,
          owner_place: data.owner_place,
          owner_city: data.owner_city,
          owner_country: data.owner_country,
          owner_email: data.owner_email,
          owner_phone: data.owner_phone || '',
          owner_marketable_status: data.owner_marketable_status,
          contract_signature: data.contract_signature,
          contract_tac: data.contract_tac,
          contract_dp: data.contract_dp,
          lang: 'en',
        }),
      }
    );

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    if (!response.ok) {
      console.error('External API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return NextResponse.json(
        {
          error: `API request failed with status ${response.status}: ${response.statusText}`,
          body: responseText,
          status: 'error',
        },
        { status: response.status }
      );
    }

    const result = JSON.parse(responseText);
    console.log('Parsed API response:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in orderEuflightClaim:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
        status: 'error',
      },
      { status: 500 }
    );
  }
}
