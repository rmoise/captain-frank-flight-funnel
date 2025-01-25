import type { Flight } from '@/types/store';
import type { LocationLike } from '@/types/location';
import type { Answer } from '@/types/store';

export type ValidationStep = 1 | 2 | 3 | 4 | 5;

export interface ValidationState {
  1: boolean;
  2: boolean;
  3: boolean;
  4: boolean;
  5: boolean;
  isPersonalValid: boolean;
  isFlightValid: boolean;
  isBookingValid: boolean;
  isWizardValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isWizardSubmitted: boolean;
  stepValidation: Record<ValidationStep, boolean>;
  stepInteraction: Record<ValidationStep, boolean>;
  questionValidation: Record<string, boolean>;
  errors: Record<ValidationStep, string[]>;
  fieldErrors: Record<string, string>;
  stepCompleted: { [key in ValidationStep]: boolean };
  completedSteps: { [key in ValidationStep]: boolean };
  transitionInProgress: boolean;
  _timestamp?: number;
}

export interface FlightSegment {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
  _isDeleting?: boolean;
}

export interface FlightSlice {
  selectedType: 'direct' | 'multi';
  directFlight: FlightSegment;
  flightSegments: FlightSegment[];
  currentSegmentIndex: number;
  fromLocation: string | null;
  toLocation: string | null;
  selectedDate: string | null;
  selectedFlights: Flight[];
  originalFlights: Flight[];
  selectedFlight: Flight | null;
  flightDetails: Flight | null;
  delayDuration: number | null;
  _lastUpdate?: number;
  isFlightValid?: boolean;
  _lastValidation?: number;
}

export interface WizardSlice {
  wizardAnswers: Answer[];
  wizardCurrentSteps: Record<string, number>;
  wizardShowingSuccess: boolean;
  wizardSuccessMessage: string;
  wizardIsCompleted: boolean;
  wizardIsValid: boolean;
  wizardIsValidating: boolean;
  lastAnsweredQuestion: string | null;
  completedWizards: Record<string, boolean>;
  lastValidAnswers: Answer[];
  lastValidStep: number;
  wizardIsEditingMoney: boolean;
  wizardLastActiveStep: number | null;
  wizardValidationState: Record<string, boolean>;
  wizardSuccessStates: Record<string, { showing: boolean; message: string }>;
  tripExperienceAnswers: Answer[];
}

export interface PersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  salutation: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
  country?: string;
}

export interface UserSlice {
  personalDetails: PersonalDetails | null;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  signature: string;
  hasSignature: boolean;
}

export interface NavigationSlice {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
  currentStep: number;
  phasesCompletedViaContinue: number[];
  openSteps: number[];
}

export interface ValidationSlice {
  validationState: ValidationState;
  isValidating: boolean;
}

export interface CompensationSlice {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
  compensationCache: {
    amount: number | null;
    flightData: {
      selectedType: 'direct' | 'multi';
      directFlight: {
        fromLocation: LocationLike | null;
        toLocation: LocationLike | null;
        date: Date | null;
        selectedFlight: Flight | null;
      } | null;
      flightSegments: Array<{
        fromLocation: LocationLike | null;
        toLocation: LocationLike | null;
        date: Date | null;
        selectedFlight: Flight | null;
      }>;
      selectedFlights: Flight[];
    } | null;
  };
  evaluationResult: {
    status: 'accept' | 'reject' | null;
    guid?: string;
    recommendation_guid?: string;
    contract?: {
      amount: number;
      provision: number;
    };
    rejection_reasons?: string[];
    journey_booked_flightids?: string[];
    journey_fact_flightids?: string[];
    information_received_at?: string;
    travel_status?: string;
    delay_duration?: string;
  };
}

export interface FlightSearchSlice {
  isSearchModalOpen: boolean;
  searchTerm: string;
  displayedFlights: Flight[];
  allFlights: Flight[];
  loading: boolean;
  errorMessage: string | null;
  errorMessages: {
    from?: string;
    to?: string;
    date?: string;
  };
}

export interface LanguageSlice {
  currentLanguage: string;
  supportedLanguages: string[];
  defaultLanguage: string;
}

export interface StoreState
  extends FlightSlice,
    WizardSlice,
    UserSlice,
    NavigationSlice,
    ValidationSlice,
    CompensationSlice,
    FlightSearchSlice,
    LanguageSlice {
  locationError: string | null;
  bookingNumber: string;
  isTransitioningPhases: boolean;
  isInitializing: boolean;
  completedWizards: Record<string, boolean>;
  signature: string;
  hasSignature: boolean;
  _lastUpdate?: number;
  _lastPersist?: number;
  _lastPersistedState?: string;
  isLoading: boolean;
  _isRestoring: boolean;
}

export type StoreStateValues = StoreState;

export type StoreStatePartial = Partial<StoreState>;

export interface ValidationStore {
  isPersonalValid: boolean;
  isFlightValid: boolean;
  isBookingValid: boolean;
  isWizardValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isWizardSubmitted: boolean;
  isValidating: boolean;
  lastValidationKey?: string;
  stepValidation: Record<ValidationStep, boolean>;
  stepInteraction: Record<ValidationStep, boolean>;
  fieldErrors: Record<string, string>;
  transitionInProgress: boolean;
  [key: number]: boolean;
  _timestamp?: number;
  _lastValidation?: number;
  _lastUpdate?: number;
}

export interface StoreActions {
  // ... other actions
  validateQAWizard: () => {
    isValid: { isValid: boolean; answers: Answer[]; bookingNumber: string };
    answers: Answer[];
    bookingNumber: string;
  };
  // ... rest of the interface
}
