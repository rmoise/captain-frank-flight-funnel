import type { Flight } from "@/store/types";

export interface EvaluateRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  journey_fact_type: "none" | "self" | "provided";
}

export interface EvaluateResponse {
  status: "accept" | "reject";
  guid?: string;
  recommendation_guid?: string;
  contract?: {
    amount: number;
    provision: number;
  };
  rejection_reasons?: string[];
}

export class EvaluateService {
  private static getJourneyFactType(
    travelStatus: string | undefined
  ): "none" | "self" | "provided" {
    switch (travelStatus) {
      case "provided":
        return "provided";
      case "self":
        return "self";
      default:
        return "none";
    }
  }

  public static async evaluateClaim(
    originalFlights: Flight[],
    selectedFlights: Flight[],
    travelStatus: string,
    informedDate: string
  ): Promise<EvaluateResponse> {
    // Log input data for debugging
    console.log("=== Evaluating Claim ===", {
      originalFlights: originalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.from?.name || f.from?.iata || "Unknown",
        arrivalCity: f.to?.name || f.to?.iata || "Unknown",
        date: f.departureTime,
      })),
      selectedFlights: selectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.from?.name || f.from?.iata || "Unknown",
        arrivalCity: f.to?.name || f.to?.iata || "Unknown",
        date: f.departureTime,
      })),
      travelStatus,
      informedDate,
    });

    // Ensure all flights have valid IDs and are unique
    const validOriginalFlights = originalFlights.filter(
      (f): f is Flight =>
        f !== null &&
        typeof f.id === "string" &&
        f.id.length > 0 &&
        typeof f.flightNumber === "string" &&
        f.flightNumber.length > 0
    );

    const validSelectedFlights = selectedFlights.filter(
      (f): f is Flight =>
        f !== null &&
        typeof f.id === "string" &&
        f.id.length > 0 &&
        typeof f.flightNumber === "string" &&
        f.flightNumber.length > 0
    );

    // Remove duplicates based on ID
    const uniqueOriginalFlights = validOriginalFlights.reduce(
      (acc: Flight[], flight) => {
        // For multi-city flights, we want to keep all segments even if they have the same ID
        // Only deduplicate if the exact same flight (same ID and date) appears multiple times
        const isDuplicate = acc.some(
          (f) => f.id === flight.id && f.departureTime === flight.departureTime
        );
        if (!isDuplicate) {
          acc.push(flight);
        }
        return acc;
      },
      []
    );

    const uniqueSelectedFlights = validSelectedFlights.reduce(
      (acc: Flight[], flight) => {
        const isDuplicate = acc.some(
          (f) => f.id === flight.id && f.departureTime === flight.departureTime
        );
        if (!isDuplicate) {
          acc.push(flight);
        }
        return acc;
      },
      []
    );

    // Build request
    const journeyFactType = this.getJourneyFactType(travelStatus);
    const request: EvaluateRequest = {
      journey_booked_flightids: uniqueOriginalFlights.map((f) => String(f.id)),
      journey_fact_flightids:
        journeyFactType === "provided"
          ? uniqueSelectedFlights.map((f) => String(f.id))
          : journeyFactType === "self"
          ? uniqueOriginalFlights.map((f) => String(f.id))
          : [],
      information_received_at: informedDate,
      travel_status: travelStatus,
      journey_fact_type: journeyFactType,
    };

    // Log request for debugging
    console.log("=== Evaluate Request Details ===", {
      request,
      uniqueOriginalFlights: uniqueOriginalFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.from?.name || f.from?.iata || "Unknown",
        arrivalCity: f.to?.name || f.to?.iata || "Unknown",
        date: f.departureTime,
      })),
      uniqueSelectedFlights: uniqueSelectedFlights.map((f) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        departureCity: f.from?.name || f.from?.iata || "Unknown",
        arrivalCity: f.to?.name || f.to?.iata || "Unknown",
        date: f.departureTime,
      })),
      journeyFactType,
      travelStatus,
    });

    // Validate request
    if (request.journey_booked_flightids.length === 0) {
      console.error(
        "No valid flight IDs found in original flights",
        originalFlights
      );
      throw new Error("No valid flight IDs found in original flights");
    }

    if (
      journeyFactType === "provided" &&
      request.journey_fact_flightids.length === 0
    ) {
      console.error(
        "No valid flight IDs found in selected flights",
        selectedFlights
      );
      throw new Error("No valid flight IDs found in selected flights");
    }

    // Make API call
    console.log("Making evaluate API call with request:", request);
    const response = await fetch("/api/evaluateeuflightclaim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      console.error("Evaluate API call failed:", {
        status: response.status,
        statusText: response.statusText,
      });
      throw new Error("Failed to evaluate claim");
    }

    const result = await response.json();
    console.log("=== Evaluate Response Details ===", {
      rawResponse: result,
      status: result.data?.status,
      contract: result.data?.contract,
      rejectionReasons: result.data?.rejection_reasons,
    });

    // Ensure we have a valid response
    if (
      !result.data ||
      typeof result.data.status === "undefined" ||
      !["accept", "reject"].includes(result.data.status)
    ) {
      console.error("Invalid evaluation response:", result);
      throw new Error("Invalid evaluation response received");
    }

    return {
      status: result.data.status,
      contract: result.data.contract,
      rejection_reasons: result.data.rejection_reasons,
      guid: result.data.guid,
      recommendation_guid: result.data.recommendation_guid,
    };
  }
}
