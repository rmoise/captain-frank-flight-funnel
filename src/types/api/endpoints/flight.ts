import type { ApiResponse } from "../common";

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

export interface FlightSearchParams {
  fromLocation?: string;
  toLocation?: string;
  date?: string;
  airline?: string;
  flightNumber?: string;
}

export interface FlightResponse extends ApiResponse<RawFlight[]> {
  message?: string;
}

export interface CompensationResponse
  extends ApiResponse<{
    amount: number;
    currency?: string;
  }> {}
