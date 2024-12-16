import type { Flight } from './index';
import type { FC } from 'react';

export interface LocationOption {
  value: string;
  label: string;
}

export interface FlightType {
  id: 'delayed' | 'cancelled' | 'overbooked';
  label: string;
}

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

export type FlightTypeSelectorComponent = FC<FlightTypeSelectorProps>;
export type LocationSelectorComponent = FC<LocationSelectorProps>;
export type FlightResultsListComponent = FC<FlightResultsListProps>;
