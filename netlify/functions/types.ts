export interface Airport {
  iata_code: string;
  name: string;
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
  status: 'accept' | 'reject';
  contract?: {
    amount: number;
    provision: number;
  };
  rejection_reasons?: {
    has_cancellation_received_intime?: string;
    has_prerequisites?: string;
    is_Eu_Norm?: string;
    [key: string]: string | undefined;
  };
}
