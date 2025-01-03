import type { FC } from 'react';

export interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
  name?: string;
}

export interface Flight {
  id: string;
  flightnumber_iata?: string;
  dep_iata?: string;
  arr_iata?: string;
  dep_time_sched?: string;
  arr_time_sched?: string;
  dep_time_fact?: string;
  arr_time_fact?: string;
  status?: string;
  arr_delay_min?: number;
  // Required fields
  flightNumber: string;
  airline: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  departure: string;
  arrival: string;
  duration: string;
  stops: number;
  date: string;
  price: number;
  aircraft: string;
  class: string;
  // Optional fields
  flightDate?: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  arrivalDelay?: number | null;
  departureAirport?: string;
  arrivalAirport?: string;
  scheduledDepartureTime?: string;
  bookingReference?: string;
  connection?: string;
}

export type FlightType = {
  id: 'direct' | 'multi';
  label: string;
};

export interface FlightTypeSelectorProps {
  types: FlightType[];
  selectedType: string;
  onTypeSelect: (typeId: string) => void;
  className?: string;
}

export interface LocationSelectorProps {
  fromLocation: string;
  toLocation: string;
  locationOptions: LocationOption[];
  onFromLocationChange: (value: string) => void;
  onToLocationChange: (value: string) => void;
  onFocusInput: (input: 'from' | 'to') => void;
  onBlurInput: () => void;
  focusedInput: 'from' | 'to' | null;
  className?: string;
}

export interface FlightResultsListProps {
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
  onNotListedClick?: () => void;
  className?: string;
}

export interface LocationOption {
  value: string;
  label: string;
  type?: string;
  country?: string;
  city?: string;
  iata?: string;
}

export type FlightTypeSelectorComponent = FC<FlightTypeSelectorProps>;
export type LocationSelectorComponent = FC<LocationSelectorProps>;
export type FlightResultsListComponent = FC<FlightResultsListProps>;
