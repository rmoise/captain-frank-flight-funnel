import { NextResponse } from 'next/server';

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const from_iata = url.searchParams.get('from_iata')?.toUpperCase();
    const to_iata = url.searchParams.get('to_iata')?.toUpperCase();

    console.log('Compensation calculation request:', { from_iata, to_iata });

    if (!from_iata || !to_iata) {
      console.error('Missing required parameters:', { from_iata, to_iata });
      return NextResponse.json(
        {
          amount: 0,
          status: 'error',
          message: 'Missing required parameters',
        },
        { status: 400 }
      );
    }

    const apiUrl = `${API_BASE_URL}/calculatecompensationbyfromiatatoiata?from_iata=${from_iata}&to_iata=${to_iata}`;
    console.log('Making request to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    if (!response.ok) {
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return NextResponse.json(
        {
          amount: 0,
          status: 'error',
          message: `API request failed with status ${response.status}: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = JSON.parse(responseText);
    console.log('Parsed API response:', data);

    // Extract amount from response
    let amount = 0;
    if (typeof data.data === 'number') {
      amount = data.data;
    } else if (data.amount) {
      amount = data.amount;
    } else if (data.compensation) {
      amount = data.compensation;
    }

    console.log('Extracted amount:', amount);

    if (!amount || amount === 0) {
      return NextResponse.json(
        {
          amount: 0,
          status: 'error',
          message: 'No compensation amount available for this route',
          debug: {
            originalResponse: data,
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      amount,
      status: 'success',
      currency: 'EUR',
      debug: {
        originalResponse: data,
      },
    });
  } catch (error) {
    console.error('Error calculating compensation:', error);
    return NextResponse.json(
      {
        amount: 0,
        status: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to calculate compensation',
        debug: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
