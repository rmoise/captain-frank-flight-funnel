import type { FlightSegment } from "@/store/types";
import type { Flight } from "@/store/types";
import { ModularFlightSelectorClient } from "./ModularFlightSelectorClient";

export interface ModularFlightSelectorProps {
  phase: number;
  currentPhase: number;
  onFlightTypeChange: (type: "direct" | "multi") => void;
  showFlightSearch?: boolean;
  searchResults?: Flight[];
  isSearching?: boolean;
  disabled?: boolean;
  onInteract?: () => void;
  stepNumber?: number;
  setValidationState?: (isValid: boolean) => void;
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
  onSelect?: (flight: FlightSegment | FlightSegment[]) => void;
  initialSegments?: FlightSegment[];
}

export function ModularFlightSelector(props: ModularFlightSelectorProps) {
  return <ModularFlightSelectorClient {...props} />;
}

export { ModularFlightSelectorClient };
