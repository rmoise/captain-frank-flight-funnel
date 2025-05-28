// Types
import type { AutocompleteLocationOption } from "@/types/shared/location";
import type {
  ApiResponse,
  Airport,
  RawFlight,
  FlightResponse,
  CompensationResponse,
  EvaluationResponse,
  OrderClaimResponse,
  ApiError as IApiError,
  ApiClientConfig,
  SearchFlightParams,
} from "@/types/shared/api";
import type {
  EvaluateClaimRequest,
  OrderClaimRequest,
} from "@/services/claimService";

// Core configuration
const BASE_URL = "/api";

// Core utilities
class ApiError extends Error implements IApiError {
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
  private readonly config: ApiClientConfig;

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || BASE_URL,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
    };
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<T> {
    try {
      const fullUrl = `${this.config.baseUrl}${url}`;
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
      if (response.status === 502 && retryCount < this.config.maxRetries!) {
        console.log(
          `Received 502 error, retrying in ${this.config.retryDelay}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay!)
        );
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
        if (retryCount >= this.config.maxRetries! || response.status !== 502) {
          throw new ApiError(
            response.status,
            `API request failed: Invalid JSON response`
          );
        }
        // For 502 with invalid JSON, retry
        console.log(
          `Received invalid JSON with 502, retrying in ${this.config.retryDelay}ms...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.config.retryDelay!)
        );
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
        }

        throw new ApiError(response.status, errorMessage, responseData);
      }

      return responseData as T;
    } catch (error: unknown) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        500,
        `API request failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // API Methods
  async searchAirports(
    term: string,
    lang: string = "de"
  ): Promise<AutocompleteLocationOption[]> {
    const url = `/.netlify/functions/searchAirports?term=${encodeURIComponent(
      term
    )}&lang=${encodeURIComponent(lang)}`;
    try {
      // Assuming makeRequest handles absolute paths starting with '/'
      // Assuming Netlify function returns the array directly, not wrapped in ApiResponse
      const responseData = await this.makeRequest<AutocompleteLocationOption[]>(
        url
      );
      // Basic check if response is an array
      if (!Array.isArray(responseData)) {
        console.error(
          "Netlify function searchAirports did not return an array:",
          responseData
        );
        throw new ApiError(
          500,
          "Invalid response format from airport search function"
        );
      }
      return responseData;
    } catch (error) {
      console.error("Error fetching airports from Netlify function:", error);
      // Rethrow the error to allow higher-level components to handle it
      throw error;
    }
  }

  async searchFlights(params: SearchFlightParams): Promise<FlightResponse> {
    const queryParams = new URLSearchParams();
    if (params.fromLocation) queryParams.set("from", params.fromLocation);
    if (params.toLocation) queryParams.set("to", params.toLocation);
    if (params.date) queryParams.set("date", params.date);
    if (params.airline) queryParams.set("airline", params.airline);
    if (params.flightNumber)
      queryParams.set("flightNumber", params.flightNumber);

    return this.makeRequest<FlightResponse>(`/flights/search?${queryParams}`);
  }

  async evaluateEuflightClaim(
    request: EvaluateClaimRequest
  ): Promise<EvaluationResponse> {
    return this.makeRequest<EvaluationResponse>("/euflight/evaluate", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async orderEuflightClaim(
    request: OrderClaimRequest
  ): Promise<OrderClaimResponse> {
    return this.makeRequest<OrderClaimResponse>(
      "/.netlify/functions/ordereuflightclaim",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }
}

export const api = new ApiClient();
export default api;
