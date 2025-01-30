import type { Flight, LocationData } from '@/types/store';

export interface FlightSelectorProps {
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  currentPhase: number;
  disabled?: boolean;
  stepNumber?: number;
  setValidationState?: (
    updater: (prev: Record<number, boolean>) => Record<number, boolean>
  ) => void;
  onSelect?: (flight: Flight) => void;
  onInteract?: () => void;
  // Accordion props
  title?: string;
  eyebrow?: string;
  summary?: string;
  isOpenByDefault?: boolean;
}

export interface FlightSegment {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: string | Date | null;
  selectedFlight: Flight | null;
}

export interface FlightSegmentsProps {
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  currentPhase: number;
  disabled?: boolean;
  onInteract?: () => void;
  stepNumber?: number;
  setValidationState?: (
    updater: (prev: Record<number, boolean>) => Record<number, boolean>
  ) => void;
  onSelect?: (flight: Flight) => void;
}

export interface FlightPreviewCardProps {
  flight: Flight;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  isMultiCity: boolean;
  showConnectionInfo: boolean;
}

export interface ConnectionInfo {
  isValid: boolean;
  message: string;
  timeDifference: number;
}
