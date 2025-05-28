import type { AutocompleteLocationOption } from "./location";

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

export interface ApiError {
  status: number;
  message: string;
  data?: Record<string, unknown>;
}

export interface ApiClientConfig {
  baseUrl: string;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SearchFlightParams {
  fromLocation?: string;
  toLocation?: string;
  date?: string;
  airline?: string;
  flightNumber?: string;
}
