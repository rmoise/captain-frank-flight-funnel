export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

export interface Flight {
  id: string;
  flightNumber: string;
  departureAirport: Airport;
  arrivalAirport: Airport;
  departureTime: string;
  arrivalTime: string;
  airline: string;
}

export interface CompensationResult {
  amount: number;
  currency: string;
}

export interface EvaluationResult {
  status: 'accept' | 'reject';
  data?: {
    amount?: number;
    provision?: number;
  };
}
