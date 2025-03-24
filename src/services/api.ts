// Types
import type { Location } from "@/components/shared/AutocompleteInput";
import type {
  EvaluateClaimRequest,
  OrderClaimRequest,
} from "@/services/claimService";
// TravelStatus is used as the base type for JourneyFactType in OrderClaimRequest
/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TravelStatus, JourneyFactType } from "@/types/travel";
/* eslint-enable @typescript-eslint/no-unused-vars */

export interface ApiResponse<T> {
  data: T[];
  status: "success" | "error";
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
  status: "success" | "error";
  message?: string;
}

export interface CompensationResponse {
  amount: number;
  currency?: string;
  status: "success" | "error";
  message?: string;
}

export interface EvaluationResponse {
  data: {
    status: "accept" | "reject";
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
const BASE_URL = "/api";

// Core utilities
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second

    try {
      const fullUrl = `${BASE_URL}${url}`;
      console.log("Making API request to:", fullUrl, {
        attempt: retryCount + 1,
        method: options.method || "GET",
      });

      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      // For 502 errors, retry the request
      if (response.status === 502 && retryCount < MAX_RETRIES) {
        console.log(`Received 502 error, retrying in ${RETRY_DELAY}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return this.makeRequest<T>(url, options, retryCount + 1);
      }

      const responseText = await response.text();
      console.log("Raw API response:", responseText);

      // If the response is empty and status is not ok, throw an error
      if (!responseText && !response.ok) {
        throw new ApiError(
          response.status,
          `API request failed: Empty response with status ${response.status}`
        );
      }

      let responseData;
      try {
        // Check if the response appears to be a Node.js error message
        if (
          responseText.includes("Cannot find module") ||
          responseText.startsWith("Error:") ||
          responseText.includes("ENOENT")
        ) {
          console.error("Server returned a Node.js error:", responseText);
          throw new ApiError(
            response.status,
            `API request failed: ${responseText.substring(0, 150)}...` // Truncate long errors
          );
        }

        responseData = JSON.parse(responseText);
        console.log("Parsed response data:", responseData);
      } catch (parseError) {
        console.error("Could not parse response:", parseError);
        // If the response starts with "Error:" it's likely a string error message from the server
        if (responseText.startsWith("Error:")) {
          throw new ApiError(
            response.status,
            `API request failed: ${responseText}`
          );
        }
        // If we've hit max retries or status isn't 502, throw error
        if (retryCount >= MAX_RETRIES || response.status !== 502) {
          throw new ApiError(
            response.status,
            `API request failed: Invalid JSON response`
          );
        }
        // For 502 with invalid JSON, retry
        console.log(
          `Received invalid JSON with 502, retrying in ${RETRY_DELAY}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return this.makeRequest<T>(url, options, retryCount + 1);
      }

      if (!response.ok) {
        console.error("API request failed:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          data: responseData,
          attempt: retryCount + 1,
        });

        // Extract error details from response
        let errorMessage = "API request failed";
        if (responseData?.error) {
          errorMessage = responseData.error;
        } else if (responseData?.message) {
          errorMessage = responseData.message;
        } else if (responseData?.details) {
          errorMessage = responseData.details;
        } else if (response.status === 400) {
          errorMessage = "Invalid request data";
        } else if (response.status === 401) {
          errorMessage = "Unauthorized";
        } else if (response.status === 403) {
          errorMessage = "Forbidden";
        } else if (response.status === 404) {
          errorMessage = "Resource not found";
        } else if (response.status === 500) {
          errorMessage = "Internal server error";
        } else if (response.status === 502) {
          errorMessage = "Bad Gateway - The server is temporarily unavailable";
        } else {
          errorMessage = `API request failed with status ${response.status}`;
        }

        throw new ApiError(response.status, errorMessage, responseData);
      }

      return responseData;
    } catch (error) {
      // If it's already an ApiError, rethrow it
      if (error instanceof ApiError) {
        throw error;
      }

      // For network errors, retry if we haven't hit the limit
      if (error instanceof TypeError && retryCount < MAX_RETRIES) {
        console.log(`Network error, retrying in ${RETRY_DELAY}ms...`, error);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
        return this.makeRequest<T>(url, options, retryCount + 1);
      }

      // For other errors, wrap in ApiError
      console.error("Unexpected error in API request:", error);
      throw new ApiError(
        500,
        error instanceof Error ? error.message : "Unknown error occurred"
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
        city: airport.name.split(",")[0].trim(),
      }));
    } catch (error) {
      console.error("Error searching airports:", error);
      return [];
    }
  }

  async evaluateEuflightClaim(
    request: EvaluateClaimRequest
  ): Promise<EvaluationResponse> {
    return this.makeRequest<EvaluationResponse>("/evaluateeuflightclaim", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async orderEuflightClaim(
    request: OrderClaimRequest
  ): Promise<OrderClaimResponse> {
    console.log("=== API CLIENT ORDER CLAIM METHOD CALLED ===", {
      timestamp: new Date().toISOString(),
    });

    console.log("=== ORDER CLAIM REQUEST TO API ===");
    console.log(JSON.stringify(request, null, 2));
    console.log("=================================");

    try {
      const response = await this.makeRequest<OrderClaimResponse>(
        "/ordereuflightclaim",
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      console.log("=== ORDER CLAIM RESPONSE IN API CLIENT ===");
      console.log(JSON.stringify(response, null, 2));
      console.log("=========================================");

      return response;
    } catch (error) {
      console.error("Error in orderEuflightClaim:", error);
      // Return a minimal valid response with error info
      return {
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const api = new ApiClient();
export default api;
