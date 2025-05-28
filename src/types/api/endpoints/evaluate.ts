import type { ApiResponse } from "../common";
import type { JourneyFactType } from "./claim";

export interface EvaluateRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  journey_fact_type: JourneyFactType;
}

export interface EvaluateResponse
  extends ApiResponse<{
    status: "accept" | "reject";
    guid?: string;
    recommendation_guid?: string;
    contract?: {
      amount: number;
      provision: number;
    };
    rejection_reasons?: string[];
    journey_booked_flightids: string[];
    journey_fact_flightids: string[];
    information_received_at: string;
    travel_status?: string;
    journey_fact_type: JourneyFactType;
  }> {}
