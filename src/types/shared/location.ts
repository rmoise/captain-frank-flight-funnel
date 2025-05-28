/**
 * Base location interface with IATA code and essential details
 */
export interface BaseLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  timezone: string;
  type: "airport" | "city";
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Location with optional fields for form inputs
 */
export interface LocationInput extends Partial<BaseLocation> {
  id: string;
  iata: string;
}

/**
 * Type for location selection options
 */
export type LocationOption = BaseLocation;

/**
 * Location data type for airport search results and selection
 */
export interface LocationData {
  value: string; // IATA code
  label: string; // IATA code (for display)
  description: string; // City or airport name
  city: string; // City name
  name: string; // Airport name
  dropdownLabel: string; // Formatted label for dropdown (e.g. "Airport Name (IATA)")
}

/**
 * Specific location type used by AutocompleteInput and searchAirports API
 */
export interface AutocompleteLocationOption {
  value: string; // Usually IATA code
  label: string; // Label for display (e.g., "Airport Name (IATA)" or just IATA)
  description?: string; // Optional longer description (e.g., City, Country or full name)
  city?: string; // Optional city name
  name?: string; // Optional airport name
}

/**
 * Props for location selector components
 */
export interface LocationSelectorProps {
  location?: BaseLocation;
  onLocationSelect: (location: BaseLocation) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export interface Location {
  id: string;
  name: string;
  code: string;
  type: "airport" | "city";
  country: string;
}

export interface SearchLocation extends BaseLocation {
  popularity?: number;
  searchCount?: number;
  lastSearched?: string;
}
