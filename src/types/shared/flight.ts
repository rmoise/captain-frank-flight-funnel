import { BaseLocation } from "@/types/shared/location";

/**
 * Extended location type for flight-specific information
 */
export interface FlightLocation extends BaseLocation {
  iata?: string;
  icao?: string;
  region?: string;
  elevation?: number;
  terminals?: string[];
  status?: "active" | "closed" | "underMaintenance";
}

export interface Flight {
  id: string;
  flightNumber: string;
  airline: Airline;
  departureTime: string;
  arrivalTime: string;
  from: FlightLocation;
  to: FlightLocation;
  price: {
    amount: number;
    currency: string;
  };
  duration: string;
  stops: number;
  status: FlightStatus;
  type: FlightType;
  segments?: FlightSegment[];
}

export type FlightStatus = "scheduled" | "delayed" | "cancelled" | "completed";
export type FlightType = "direct" | "multi";

export interface Airline {
  name: string;
  code: string;
  logo?: string;
}

export interface FlightSegment {
  id: string;
  origin: FlightLocation;
  destination: FlightLocation;
  departureTime: string;
  arrivalTime: string;
  flightNumber: string;
  airline: Airline;
  duration: string;
  stops: number;
  selectedFlight?: Flight;
  price?: {
    amount: number;
    currency: string;
  };
}
