import type { FC } from "react";
import type { BaseLocation, LocationSelectorProps } from "./location";
import type { FlightLocation } from "./flight";
import type { Flight, FlightType, FlightSegment } from "@/store/types";
import type { Store } from "@/store/types";
import type { Option } from "./input";
import type { Translations } from "@/translations/types";
import type { UseFormRegister, FieldError } from "react-hook-form";

/**
 * Props for the direct flight component
 */
export interface DirectFlightProps {
  segment: FlightSegment;
  onSegmentChange: (segment: FlightSegment) => void;
  onSearch: (params: {
    from: BaseLocation | null;
    to: BaseLocation | null;
    date: string | null;
  }) => Promise<void>;
  searchResults: Flight[];
  isSearching?: boolean;
  disabled?: boolean;
  setIsFlightNotListedOpen: (isOpen: boolean) => void;
  currentPhase?: number;
  lang?: string;
  showDateAndSearch?: boolean;
  locations: FlightLocation[];
  setLocations: React.Dispatch<React.SetStateAction<FlightLocation[]>>;
  errors?:
    | {
        fromLocation?: { message?: string };
        toLocation?: { message?: string };
      }
    | undefined;
}

/**
 * Props for the multi city flight component (ASSUMED INTERFACE NAME)
 */
export interface MultiCityFlightProps {
  phase: number;
  segments: FlightSegment[];
  onSegmentsChange: (segments: FlightSegment[]) => void;
  addFlightSegment: (segment: FlightSegment) => void;
  removeFlightSegment: (index: number) => void;
  disabled?: boolean;
  currentPhase: number;
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
  locations: FlightLocation[];
  setLocations: React.Dispatch<React.SetStateAction<FlightLocation[]>>;
  onSearch: (params: {
    from: BaseLocation | null;
    to: BaseLocation | null;
    date: string | null;
  }) => Promise<void>;
  searchResults: Flight[];
  isSearching?: boolean;
  showDateAndSearch?: boolean;
  showAddMoreFlights?: boolean;
  searchAirports: (term: string) => Promise<BaseLocation[]>;
  lang?: string;
}

/**
 * Props for the flight preview card component
 */
export interface FlightPreviewCardProps {
  flight: Flight;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  isMultiCity?: boolean;
  showConnectionInfo?: boolean;
  currentPhase?: number;
}

/**
 * Props for the flight type selector component
 */
export interface FlightTypeSelectorProps {
  types: FlightType[];
  selectedType: FlightType;
  onTypeSelect: (type: FlightType) => void;
  className?: string;
}

/**
 * Props for the flight results list component
 */
export interface FlightResultsListProps {
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
  onNotListedClick?: () => void;
  className?: string;
}

/**
 * Props for the flight segments component
 */
export interface FlightSegmentsProps {
  phase: number;
  onSegmentUpdate?: (segments: FlightSegment[]) => void;
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  disabled?: boolean;
  onInteract?: () => void;
  stepNumber?: number;
  setValidationState?: (state: boolean) => void;
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
  store: Store;
  currentPhase: number;
}

// Component type definitions
export type FlightTypeSelectorComponent = FC<FlightTypeSelectorProps>;
export type LocationSelectorComponent = FC<LocationSelectorProps>;
export type FlightResultsListComponent = FC<FlightResultsListProps>;
