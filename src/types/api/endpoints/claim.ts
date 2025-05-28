import type { ApiResponse } from "../common";

export type JourneyFactType = "none" | "self" | "provided";
export type Salutation = "herr" | "frau";

export interface EvaluateClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  travel_status?: string;
  delay_duration?: string;
  journey_fact_type: JourneyFactType;
}

export interface OrderClaimRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids: string[];
  information_received_at: string;
  journey_booked_pnr: string;
  journey_fact_type: JourneyFactType;
  owner_salutation: Salutation;
  owner_firstname: string;
  owner_lastname: string;
  owner_street: string;
  owner_place: string;
  owner_city: string;
  owner_country: string;
  owner_email: string;
  owner_phone: string;
  owner_marketable_status: boolean;
  arbeitsrecht_marketing_status?: boolean;
  contract_signature: string;
  contract_tac: boolean;
  contract_dp: boolean;
  guid?: string;
  recommendation_guid?: string;
  travel_status?: string;
  lang?: string;
}

export interface ClaimContract {
  amount: number;
  provision: number;
}

export interface EvaluationResponse
  extends ApiResponse<{
    status: "accept" | "reject";
    guid?: string;
    recommendation_guid?: string;
    contract?: ClaimContract;
    rejection_reasons?: Record<string, string>;
  }> {}

export interface OrderClaimResponse
  extends ApiResponse<{
    guid: string;
    recommendation_guid: string;
  }> {}
