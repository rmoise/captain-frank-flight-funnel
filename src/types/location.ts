import { LocationData } from './store';

export interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
  dropdownLabel?: string;
}

export type LocationLike = Location | LocationData;

export interface LocationOption {
  value: string;
  label: string;
}

export interface Airport {
  iata_code: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
}
