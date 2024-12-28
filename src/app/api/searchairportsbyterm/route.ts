import { NextResponse } from 'next/server';

interface Airport {
  iata_code?: string;
  code?: string;
  name?: string;
  airport?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

interface FormattedAirport {
  iata_code: string;
  name: string;
  lat: number;
  lng: number;
}

interface ApiResponse {
  data: FormattedAirport[];
  status: 'success' | 'error';
  message?: string;
}

const API_BASE_URL =
  'https://secure.captain-frank.net/api/services/euflightclaim';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const term = searchParams.get('term')?.toLowerCase();
    const lang = searchParams.get('lang') || 'en';

    console.log('Airport search request:', { term, lang });

    // Return empty results for short terms
    if (!term || term.length < 3) {
      return NextResponse.json<ApiResponse>(
        {
          data: [],
          status: 'success',
          message: 'Please enter at least 3 characters',
        },
        { status: 200 }
      );
    }

    // Make request to Captain Frank API
    const apiUrl = `${API_BASE_URL}/searchairportsbyterm?${new URLSearchParams({
      term: term.trim(),
      lang,
    })}`;
    console.log('Calling Captain Frank API:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 }, // Disable caching
    });

    if (!response.ok) {
      console.error('API request failed:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
      });

      // If it's a validation error (422), return a friendly message
      if (response.status === 422) {
        return NextResponse.json<ApiResponse>(
          {
            data: [],
            status: 'success',
            message: 'Please refine your search term',
          },
          { status: 200 }
        );
      }

      const errorText = await response.text();
      console.error('Error response text:', errorText);

      return NextResponse.json<ApiResponse>({
        data: [],
        status: 'error',
        message: `API request failed with status ${response.status}`,
      });
    }

    const responseText = await response.text();
    console.log('Raw API response:', responseText);

    let data: Airport | Airport[] | { data: Airport[] };
    try {
      data = JSON.parse(responseText);
      console.log('Parsed API response:', data);
    } catch (parseError) {
      console.error('Failed to parse API response:', parseError);
      return NextResponse.json<ApiResponse>({
        data: [],
        status: 'error',
        message: 'Failed to parse API response',
      });
    }

    // Format the response - handle both array and object responses
    let airports: Airport[] = [];
    if (Array.isArray(data)) {
      airports = data;
    } else if ('data' in data && Array.isArray(data.data)) {
      airports = data.data;
    } else if (typeof data === 'object' && data !== null) {
      // If it's a single airport object, wrap it in an array
      airports = [data as Airport];
    }

    // Transform the data to match the expected format
    const formattedAirports: FormattedAirport[] = airports.map((airport) => ({
      iata_code: airport.iata_code || airport.code || '',
      name: airport.name || airport.airport || '',
      lat: airport.lat || airport.latitude || 0,
      lng: airport.lng || airport.longitude || 0,
    }));

    return NextResponse.json<ApiResponse>({
      data: formattedAirports,
      status: 'success',
      message: formattedAirports.length === 0 ? 'No airports found' : undefined,
    });
  } catch (error) {
    console.error('Airport search error:', error);
    return NextResponse.json<ApiResponse>({
      data: [],
      status: 'error',
      message:
        error instanceof Error ? error.message : 'Failed to search airports',
    });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
