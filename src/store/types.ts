import type {
  ValidationStatus,
  ValidationPhase,
  ValidationError,
  PhaseValidationResult,
  IValidator,
} from "@/types/shared/validation";
import { StateCreator } from "zustand";
import type {
  Answer,
  Question as WizardQuestion,
  WizardState as BaseWizardState,
  QuestionType,
  AnswerValue,
} from "@/types/shared/wizard";
import type {
  FlightType,
  Flight,
  FlightSegment,
  FlightLocation,
  Airline,
  FlightStatus,
} from "@/types/shared/flight";
import type {
  UserDetails,
  PassengerDetails,
  UserConsent,
} from "@/types/shared/user";
import type { BaseLocation } from "@/types/shared/location";
import { ConsentType } from "@/types/shared/forms";
import { Location } from "@/types/shared/location";

// Add import for Phase4 types
import type { Phase4State, Phase4Actions } from "./slices/phase4Slice";
// Import wizard types
import type {
  TravelStatusWizardState,
  TravelStatusWizardActions,
} from "./slices/travelStatusWizardSlice";
import type {
  InformedDateWizardState,
  InformedDateWizardActions,
} from "./slices/informedDateWizardSlice";

// Re-export types that are used externally
export type {
  Flight,
  FlightType,
  FlightStatus,
  FlightSegment,
  FlightLocation,
  Airline,
} from "@/types/shared/flight";
export type {
  UserDetails,
  PassengerDetails,
  UserConsent,
} from "@/types/shared/user";
export type { Location, BaseLocation } from "@/types/shared/location";

// Question Types
export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  showConfetti?: boolean;
  showCheck?: boolean;
  externalLink?: string;
  openInNewTab?: boolean;
  description?: string;
  isDisabled?: boolean;
  icon?: string;
  subLabel?: string;
  tooltip?: string;
}

export type Question = WizardQuestion;

// User Types
export interface UserConsents {
  terms: boolean;
  privacy: boolean;
  marketing: boolean;
}

export interface UserState {
  details: any | null;
  consents: {
    terms: boolean;
    privacy: boolean;
    marketing: boolean;
  };
  signature: string | null;
  hubspotContactId?: string | null;
  hubspotDealId?: string | null;
  compensationAmount?: string | null;
  lastUpdate: number;
}

// Flight Types
export interface SelectedFlight extends Omit<Flight, "id"> {
  id: string; // Make id required for selected flights
}

export interface FlightState {
  type: FlightType | null;
  segments: FlightSegment[];
  selectedFlights: Record<number, Flight[]>;
  searchResults: Flight[];
  currentSegmentIndex: number;
  lastUpdate: number;
  currentFlight: Flight | null;
  flightHistory: Flight[];
  originalFlights: Record<number, Flight[]>;
  bookingNumber?: string;
  phaseData: Record<
    number,
    {
      segments: FlightSegment[];
      type: FlightType | null;
      selectedFlights: Flight[];
      searchResults: Flight[];
      lastUpdate: number;
    }
  >;
}

// Validation Types
export interface ValidationState {
  stepValidation: Record<ValidationPhase, boolean>;
  stepCompleted: Record<ValidationPhase, boolean>;
  stepInteraction: Record<ValidationPhase, boolean>;
  stepSummary: Record<ValidationPhase, string>;
  errors: Record<ValidationPhase, string[]>;
  fieldErrors: Record<string, string[]>;
  isValid: boolean;
  isComplete: boolean;
  _timestamp: number;
}

// Navigation Types
export interface NavigationState {
  currentPhase: ValidationPhase;
  completedPhases: ValidationPhase[];
  isTransitioning: boolean;
  lastUpdate: number;
  isClaimSuccess?: boolean;
  isClaimRejected?: boolean;
  phasesCompletedViaContinue?: number[];
}

export type NavigationAction = {
  setCurrentPhase: (phase: ValidationPhase) => Partial<Store>;
  addCompletedPhase: (phase: ValidationPhase) => Partial<Store>;
  startTransition: () => Partial<Store>;
  endTransition: () => Partial<Store>;
  resetNavigation: () => Partial<Store>;
};

// Wizard Types
export interface WizardState {
  currentStep: number;
  totalSteps: number;
  answers: Answer[];
  questions: Question[];
  isValid: boolean;
  isComplete: boolean;
  isLoading?: boolean;
  error?: string | null;
  lastUpdate: number;

  // New specialized wizard states
  travelStatus: TravelStatusWizardState;
  informedDate: InformedDateWizardState;
}

// Phase Types
export interface PhaseState {
  currentPhase: string | null;
  phases: Record<string, any>; // Adjust this type according to your phase structure
}

// Core Types
export interface CoreState {
  expandedAccordions: Record<string, boolean>;
  isInitialized: boolean;
  lastUpdate: Date | null;
}

export interface CoreActions {
  toggleAccordion: (id: string) => void;
  setInitialAccordionState: (accordionStates: Record<string, boolean>) => void;
  setIsInitialized: (isInitialized: boolean) => void;
}

export type Phases = Record<string, PhaseState>;

// Main Store Structure
export interface StoreState {
  validation: ValidationState;
  core: CoreState;
  phase: PhaseState;
  phases: Phases;
  flight: FlightState;
  user: UserState;
  wizard: WizardState;
  navigation: NavigationState;
  phase4: Phase4State;
  claimData: ClaimData;
  travelStatusWizard: TravelStatusWizardState;
  informedDateWizard: InformedDateWizardState;
}

export interface StoreActions {
  validation: ValidationActions;
  core: CoreActions;
  phase: PhaseActions;
  flight: FlightActions;
  user: UserActions;
  wizard: WizardActions;
  navigation: NavigationActions;
  phase4: Phase4Actions;
  claim?: ClaimActions;
  travelStatusWizard: TravelStatusWizardActions;
  informedDateWizard: InformedDateWizardActions;
  global: {
    resetAll: () => void;
  };
}

export type Store = StoreState & { actions: StoreActions };

// Store Actions
export interface UserAction {
  type:
    | "SET_USER_DETAILS"
    | "SET_PASSENGER_DETAILS"
    | "SET_USER_CONSENT"
    | "SET_PERSONAL_DETAILS"
    | "SET_MARKETING_ACCEPTED"
    | "SET_COMPENSATION_AMOUNT"
    | "SET_TERMS_ACCEPTED"
    | "SET_PRIVACY_ACCEPTED";
  payload: any;
}

export interface FlightAction {
  type:
    | "SET_FLIGHT_TYPE"
    | "SET_SEGMENTS"
    | "SET_SELECTED_FLIGHTS"
    | "SET_SEARCH_RESULTS"
    | "SET_CURRENT_SEGMENT_INDEX"
    | "SET_CURRENT_FLIGHT"
    | "ADD_TO_FLIGHT_HISTORY"
    | "SET_ORIGINAL_FLIGHTS"
    | "SET_PHASE_DATA"
    | "RESET_FLIGHT_STATE";
  payload: any;
}

export interface ValidationAction {
  type: "SET_VALIDATION_STATUS" | "SET_VALIDATION_ERRORS" | "RESET_VALIDATION";
  phase: ValidationPhase;
  payload: {
    status?: ValidationStatus;
    errors?: ValidationError[];
  };
}

export type WizardActions = {
  setQuestions: (questions: Question[]) => void;
  setCurrentStep: (step: number) => void;
  setAnswer: (questionId: string, value: any) => void;
  resetWizard: () => void;
  validateStep: (step: number) => boolean;
  completeWizard: () => void;
  checkStepValidity: (step: number) => boolean;
  setStepValidationStatus: (step: number) => boolean;
};

export interface PhaseAction {
  type: "SET_PHASE" | "COMPLETE_PHASE" | "SET_IS_FIRST_VISIT";
  payload: ValidationPhase | boolean;
}

export type RootAction =
  | UserAction
  | FlightAction
  | ValidationAction
  | NavigationAction
  | WizardActions
  | PhaseAction;

// Utility type for deep partial objects
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserActions = {
  setUserDetails: (details: any) => void;
  updateConsents: (consents: Partial<UserState["consents"]>) => void;
  setSignature: (signature: string) => void;
  setHubspotContactId?: (id: string) => void;
  setHubspotDealId?: (id: string) => void;
  setCompensationAmount?: (amount: string) => void;
  resetUser: () => void;
};

export type FlightActions = {
  setFlightType: (type: FlightType) => void;
  addFlightSegment: (segment: FlightSegment) => void;
  updateFlightSegment: (index: number, segment: Partial<FlightSegment>) => void;
  removeFlightSegment: (index: number) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setCurrentFlight: (flight: Flight) => void;
  addToFlightHistory: (flight: Flight) => void;
  clearFlights: () => void;
  setSegments: (segments: FlightSegment[]) => void;
  setOriginalFlights: (flights: Flight[]) => void;
  setPhaseData: (
    phase: ValidationPhase,
    data: {
      segments: FlightSegment[];
      type: FlightType | null;
      selectedFlights: Flight[];
      bookingNumber?: string;
    }
  ) => void;
};

export type NavigationActions = {
  setCurrentPhase: (phase: ValidationPhase) => void;
  addCompletedPhase: (phase: ValidationPhase) => void;
  startTransition: () => void;
  endTransition: () => void;
  resetNavigation: () => void;
  addPhaseCompletedViaContinue: (phase: number) => void;
};

export type ValidationActions = {
  setStepValidation: (phase: ValidationPhase, isValid: boolean) => void;
  setStepCompleted: (phase: ValidationPhase, isComplete: boolean) => void;
  setStepInteraction: (phase: ValidationPhase, hasInteracted: boolean) => void;
  setStepSummary: (phase: ValidationPhase, summary: string) => void;
  addStepError: (phase: ValidationPhase, error: ValidationError) => void;
  clearStepErrors: (phase: ValidationPhase) => void;
  addFieldError: (field: string, error: string) => void;
  clearFieldErrors: (field: string) => void;
  setIsValid: (isValid: boolean) => void;
  setIsComplete: (isComplete: boolean) => void;
  resetValidation: () => void;
};

export type PhaseActions = {
  savePhaseData: (phase: ValidationPhase, data: any) => void;
  completePhase: (phase: ValidationPhase) => void;
  setPhaseError: (phase: ValidationPhase, error: any) => void;
  clearPhaseErrors: (phase: ValidationPhase) => void;
  validatePhase: (phase: ValidationPhase) => boolean;
  canProceedToNextPhase: () => boolean;
};

export type SliceCreator<T> = StateCreator<Store, [], [], T>;

// Claim Types
export interface ClaimData {
  claimId?: string | null;
  claimSubmitted?: boolean;
  lastUpdate?: number;
}

export type ClaimActions = {
  setClaimId: (id: string) => void;
  setClaimSubmitted: (submitted: boolean) => void;
  resetClaim: () => void;
};
