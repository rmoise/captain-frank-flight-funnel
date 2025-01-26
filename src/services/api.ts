// Types
import type { Location } from '@/components/shared/AutocompleteInput';
import type {
  EvaluateClaimRequest,
  OrderClaimRequest,
} from '@/services/claimService';
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
  data: {
    status: 'accept' | 'reject';
    guid?: string;
    recommendation_guid?: string;
    contract?: {
      amount: number;
      provision: number;
    };
    rejection_reasons?: Record<string, string>;
  };
}

export interface OrderClaimResponse {
  data?: {
    guid: string;
    recommendation_guid: string;
  };
  message?: string;
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
      const fullUrl = `${BASE_URL}${url}`;
      console.log('Making API request to:', fullUrl);
      const response = await fetch(fullUrl, {
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
          `API request failed: Invalid JSON response`
        );
      }

      if (!response.ok) {
        console.error('API request failed:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data: responseData,
        });

        // Extract error details from response
        let errorMessage = 'API request failed';
        if (responseData?.error) {
          errorMessage = responseData.error;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.details) {
          errorMessage = responseData.details;
        } else if (response.status === 400) {
          errorMessage = 'Invalid request data';
        } else if (response.status === 401) {
          errorMessage = 'Unauthorized';
        } else if (response.status === 403) {
          errorMessage = 'Forbidden';
        } else if (response.status === 404) {
          errorMessage = 'Resource not found';
        } else if (response.status === 500) {
          errorMessage = 'Internal server error';
        } else {
          errorMessage = `API request failed with status ${response.status}`;
        }

        throw new ApiError(response.status, errorMessage, responseData);
      }

      return responseData;
    } catch (error) {
      console.error('API request error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    }
  }

  // API Methods
  async searchAirports(term: string): Promise<Location[]> {
    try {
      const response = await this.makeRequest<ApiResponse<Airport>>(
        `/airports/search?term=${encodeURIComponent(term)}`
      );
      return response.data.map((airport) => ({
        value: airport.iata_code,
        label: `${airport.name} (${airport.iata_code})`,
        description: airport.name,
        city: airport.name.split(',')[0].trim(),
      }));
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  }

  async evaluateEuflightClaim(
    request: EvaluateClaimRequest
  ): Promise<EvaluationResponse> {
    return this.makeRequest<EvaluationResponse>('/evaluateeuflightclaim', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async orderEuflightClaim(
    request: OrderClaimRequest
  ): Promise<OrderClaimResponse> {
    return this.makeRequest<OrderClaimResponse>('/ordereuflightclaim', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const api = new ApiClient();
export default api;
