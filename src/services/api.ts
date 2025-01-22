// Types
import type { Flight } from '@/types';
import type { Location } from '@/components/shared/AutocompleteInput';
// TravelStatus is used as the base type for JourneyFactType in OrderClaimRequest
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TravelStatus, JourneyFactType } from '@/types/travel';
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface ApiResponse<T> {
  data: T[];
  status: 'success' | 'error';
  message?: string;
}

export interface Airport {
  iata_code: string;
  name: string;
  lat: number;
  lng: number;
}

export interface RawFlight {
  id: number;
  flightnumber_iata: string;
  dep_iata: string;
  arr_iata: string;
  dep_time_sched: string;
  arr_time_sched: string;
  dep_time_fact: string | null;
  arr_time_fact: string | null;
  arr_delay_min: number | null;
  status: string;
  aircraft_type?: string;
}

export interface FlightResponse {
  data: RawFlight[];
  status: 'success' | 'error';
  message?: string;
}

export interface CompensationResponse {
  amount: number;
  currency?: string;
  status: 'success' | 'error';
  message?: string;
}

export interface EvaluationResponse {
  status: 'accept' | 'reject';
  guid: string;
  recommendation_guid: string;
  contract?: {
    amount: number;
    provision: number;
  };
  rejection_reasons?: string[];
  journey_booked_flightids?: string[];
  journey_fact_flightids?: string[];
  information_received_at?: string;
  travel_status?: string;
}

export interface OrderClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  journey_booked_pnr: string;
  journey_fact_type: JourneyFactType;
  owner_salutation: 'herr' | 'frau';
  owner_firstname: string;
  owner_lastname: string;
  owner_street: string;
  owner_place: string;
  owner_city: string;
  owner_zip: string;
  owner_country: string;
  owner_email: string;
  owner_phone: string;
  owner_marketable_status: boolean;
  contract_signature: string;
  contract_tac: boolean;
  contract_dp: boolean;
  guid?: string;
  recommendation_guid?: string;
}

export interface OrderClaimResponse {
  status: 'success' | 'error';
  message?: string;
  claimId?: string;
  contract?: {
    amount: number;
    provision: number;
  };
  data?: {
    guid: string;
    recommendation_guid: string;
  };
}

// Core configuration
const BASE_URL = '/api';

// Core utilities
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      console.log('Making API request to:', url);
      const response = await fetch(url, {
        ...options,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const responseText = await response.text();
      console.log('Raw API response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
        console.log('Parsed response data:', responseData);
      } catch (parseError) {
        console.error('Could not parse response:', parseError);
        throw new ApiError(
          response.status,
          `API request failed with status ${response.status}`
        );
      }

      if (!response.ok) {
        console.error('API request failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data: responseData,
        });

        // Extract error data from the response
        const errorMessage = responseData.message || responseData.error;
        const errorDetails = responseData.errors || {};

        // If we have the original error response, use that
        if (responseData.body) {
          try {
            const originalError = JSON.parse(responseData.body);
            if (originalError.message || originalError.errors) {
              throw new ApiError(response.status, originalError.message, {
                errors: originalError.errors,
                status: 'error',
              });
            }
          } catch (e) {
            console.error('Could not parse original error:', e);
          }
        }

        // Fallback to our parsed error
        throw new ApiError(response.status, errorMessage, {
          errors: errorDetails,
          status: 'error',
        });
      }

      if (responseData.status === 'error') {
        throw new ApiError(
          response.status || 500,
          responseData.message ||
            responseData.error ||
            'API returned error status',
          responseData
        );
      }

      return responseData;
    } catch (error) {
      console.error('API Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'An unexpected error occurred', {
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // API Methods
  async searchAirports(term: string): Promise<Location[]> {
    try {
      const response = await this.makeRequest<ApiResponse<Airport>>(
        `/airports/search?term=${encodeURIComponent(term)}`
      );

      const { data } = response;

      if (!data || !Array.isArray(data)) {
        console.warn('No airports found or invalid response format');
        return [];
      }

      // Transform the airports into Location objects
      const transformedResults = data
        .filter((airport) => airport.iata_code) // Only include airports with IATA codes
        .map((airport) => ({
          value: airport.iata_code,
          label: airport.iata_code,
          description: airport.name,
        }));

      console.log('Transformed results:', transformedResults);
      return transformedResults;
    } catch (error) {
      console.error('Search Airports Error:', error);
      return [];
    }
  }

  async searchFlights(params: {
    from_iata?: string;
    to_iata?: string;
    flight_date?: string;
    flight_number?: string;
  }): Promise<Flight[]> {
    try {
      console.log('Searching flights with params:', params);

      const formattedParams = {
        ...params,
        lang: 'en',
      };

      const searchParams = new URLSearchParams(
        Object.entries(formattedParams)
          .filter(([, value]) => value !== undefined)
          .reduce<Record<string, string>>(
            (acc, [key, value]) => ({
              ...acc,
              [key]: value as string,
            }),
            {}
          )
      );

      const response = await this.makeRequest<{
        data: RawFlight[];
        message?: string;
      }>(`${BASE_URL}/searchflightsbyfromiatatoiatadatenumber?${searchParams}`);

      if (!response.data) {
        console.log(
          'No flights found:',
          response.message || 'No flights available'
        );
        return [];
      }

      if (response.data.length === 0) {
        console.log(
          'No flights found:',
          response.message || 'No flights available for the selected criteria'
        );
        return [];
      }

      return response.data.map((flight) => {
        const flightNumber = flight.flightnumber_iata || '';
        const airline = flightNumber.substring(0, 2);
        const departureCity = flight.dep_iata || '';
        const arrivalCity = flight.arr_iata || '';
        const departureTime = flight.dep_time_sched || '';
        const arrivalTime = flight.arr_time_sched || '';
        const duration = this.calculateDuration(departureTime, arrivalTime);
        const date = params.flight_date || '';
        const status = flight.status || 'scheduled';

        // Create a validated flight object with all required fields
        const validatedFlight: Flight = {
          id: flight.id?.toString() || '',
          flightNumber,
          airline,
          departureCity,
          arrivalCity,
          departureTime,
          arrivalTime,
          departure: departureCity,
          arrival: arrivalCity,
          duration,
          stops: 0,
          aircraft: flight.aircraft_type || 'Unknown',
          class: 'economy',
          date,
          price: 0,
          status,
          actualDeparture: flight.dep_time_fact || null,
          actualArrival: flight.arr_time_fact || null,
          arrivalDelay: flight.arr_delay_min || null,
          departureAirport: departureCity,
          arrivalAirport: arrivalCity,
          scheduledDepartureTime: departureTime,
          bookingReference: undefined,
        };

        console.log('Transformed flight data:', validatedFlight);
        return validatedFlight;
      });
    } catch (error) {
      console.error('Flight search error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        error instanceof Error ? error.message : 'Failed to search flights'
      );
    }
  }

  private calculateDuration(
    departureTime: string,
    arrivalTime: string
  ): string {
    try {
      const departure = new Date(departureTime);
      const arrival = new Date(arrivalTime);
      const durationMs = arrival.getTime() - departure.getTime();
      const hours = Math.floor(durationMs / (1000 * 60 * 60));
      const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    } catch (error) {
      console.error('Error calculating duration:', error);
      return '';
    }
  }

  async calculateCompensation(
    fromIata: string,
    toIata: string
  ): Promise<CompensationResponse> {
    try {
      console.log('Calculating compensation with params:', {
        fromIata,
        toIata,
      });

      const response = await fetch(
        `https://secure.captain-frank.net/api/services/euflightclaim/calculatecompensationbyfromiatatoiata?${new URLSearchParams(
          {
            from_iata: fromIata,
            to_iata: toIata,
            lang: 'en',
          }
        )}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `API-Anfrage fehlgeschlagen mit Status ${response.status}`
        );
      }

      const data = await response.json();

      if (data.status === 'error') {
        throw new Error(data.message || 'Failed to calculate compensation');
      }

      return {
        amount: data.amount || 0,
        currency: data.currency || 'EUR',
        status: 'success',
      };
    } catch (error) {
      console.error('Error calculating compensation:', error);
      throw error;
    }
  }

  async evaluateClaim(data: {
    journey_booked_flightids: string[];
    journey_fact_flightids?: string[];
    information_received_at: string;
    travel_status?: string;
  }): Promise<EvaluationResponse> {
    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:8888' : '';
    return this.makeRequest<EvaluationResponse>(
      `${baseUrl}/.netlify/functions/evaluateeuflightclaim`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  async orderClaim(data: OrderClaimRequest): Promise<OrderClaimResponse> {
    const baseUrl =
      process.env.NODE_ENV === 'development' ? 'http://localhost:8888' : '';
    return this.makeRequest<OrderClaimResponse>(
      `${baseUrl}/.netlify/functions/ordereuflightclaim`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }
}

// Export singleton instance
const api = new ApiClient();
export default api;
