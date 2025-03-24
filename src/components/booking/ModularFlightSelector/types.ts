import type { Flight } from '@/types/store';
import type { Store } from '@/lib/state/store';
import type { Phase4State, Phase4Actions } from '@/lib/state/phase4Store';

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
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
  store: Store | (Phase4State & Phase4Actions);
  onSegmentUpdate?: (segmentIndex: number, updatedSegment: any) => void;
}

export interface FlightPreviewCardProps {
  flight: Flight;
  index: number;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  isMultiCity: boolean;
  showConnectionInfo: boolean;
  currentPhase?: number;
}

export interface ConnectionInfo {
  isValid: boolean;
  message: string;
  timeDifference: number;
}
