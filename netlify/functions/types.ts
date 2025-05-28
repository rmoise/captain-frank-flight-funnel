export interface Airport {
  iata_code?: string;
  code?: string;
  name?: string;
  airport?: string;
  city?: string;
  country?: string;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
}

export interface FormattedAirport {
  iata_code: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface Flight {
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

export interface CompensationResult {
  amount: number;
  currency: string;
}

export interface EvaluationResult {
  data: {
    status: "accept" | "reject";
    contract?: {
      amount: number;
      provision: number;
    };
    rejection_reasons?: Record<string, string>;
  };
}

export interface EvaluationRequest {
  journey_booked_flightids: string[];
  journey_fact_flightids?: string[];
  information_received_at: string;
  journey_fact_type: "none" | "self" | "provided";
}
