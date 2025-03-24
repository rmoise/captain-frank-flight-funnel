import type { Flight } from '@/types/store';
import type { LocationLike } from '@/types/location';
import type { Answer } from '@/types/store';
import type { Question } from '@/types/experience';
import type { PersonalDetailsSlice } from './slices/personalDetailsSlice';
import type { EvaluationSlice } from './slices/evaluationSlice';

export type ValidationStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface ValidationState {
  stepValidation: Record<ValidationStep, boolean>;
  stepInteraction: Record<ValidationStep, boolean>;
  errors: Record<ValidationStep, string[]>;
  stepCompleted: Record<ValidationStep, boolean>;
  completedSteps: ValidationStep[];
  isPersonalValid: boolean;
  isFlightValid: boolean;
  isBookingValid: boolean;
  isWizardValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isWizardSubmitted: boolean;
  isCompensationValid: boolean;
  questionValidation: Record<string, boolean>;
  fieldErrors: Record<string, string>;
  transitionInProgress: boolean;
  _timestamp: number;
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
  selectedDate: Date | null;
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
  wizardQuestions: Question[];
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
  _lastUpdate?: number;
  _isClaimSuccess: boolean;
  _isClaimRejected: boolean;
  _preventPhaseChange: boolean;
  validationState: ValidationState;
  updateValidationState: (newState: Partial<ValidationState>) => void;
  initializeNavigationFromUrl?: (url: string) => void;
}

export interface ValidationSlice {
  validationState: ValidationState;
  updateValidationState: (newState: Partial<ValidationState>) => void;
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

export interface NavigationState {
  locationError: string | null;
  bookingNumber: string;
  isTransitioningPhases: boolean;
  isInitializing: boolean;
  completedWizards: Record<string, boolean>;
  signature: string;
  hasSignature: boolean;
  _lastUpdate: number;
  _lastPersist?: number;
  _lastPersistedState?: string;
  isLoading: boolean;
  _isRestoring: boolean;
  _isClaimSuccess: boolean;
  _isClaimRejected: boolean;
  _preventPhaseChange: boolean;
  currentPhase: ValidationStep;
  completedPhases: ValidationStep[];
  completedSteps: ValidationStep[];
  openSteps: ValidationStep[];
  validationState: ValidationState;
  selectedDate: Date | null;
  phasesCompletedViaContinue: number[];
}

export interface StoreActions {
  setSelectedDate: (date: Date | null) => void;
  updateValidationState: (newState: Partial<ValidationState>) => void;
  initializeNavigationFromUrl?: (url: string) => void;
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  notifyInteraction: () => void;
  setOnInteract: (callback: () => void) => void;
  resetStore: () => void;
  hideLoading: () => void;
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setMarketingAccepted: (accepted: boolean) => void;
  setSignature: (signature: string) => void;
  setHasSignature: (hasSignature: boolean) => void;
  validateSignature: () => boolean;
  setOriginalFlights: (flights: Flight[]) => void;
  setCurrentPhase: (phase: number) => void;
  validateAndUpdateStep: (step: ValidationStep) => boolean;
  batchUpdateWizardState: (updates: Partial<StoreStateValues>) => void;
}

export interface FlightSelectionSlice {
  selectedType: 'direct' | 'multi';
  directFlight: {
    fromLocation: LocationLike | null;
    toLocation: LocationLike | null;
    date: Date | null;
    selectedFlight: Flight | null;
  };
  flightSegments: FlightSegment[];
  selectedFlights: Flight[];
  selectedDate: Date | null;
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  validationState: ValidationState;
  searchTerm: string;
  isSearchModalOpen: boolean;
  displayedFlights: Flight[];
  isSearchLoading: boolean;
  initState: 'idle' | 'resetting' | 'setting_type' | 'setting_flight' | 'ready' | 'error';
  isComponentReady: boolean;
  hasValidLocations: boolean;
  hasValidFlights: boolean;
  previousValidationState: Record<number, boolean>;
  isMounted: boolean;
  isInitStarted: boolean;
  onInteract: (() => void) | null;
}

export type StoreState = NavigationState &
  FlightSlice &
  WizardSlice &
  UserSlice &
  ValidationSlice &
  CompensationSlice &
  FlightSearchSlice &
  LanguageSlice &
  PersonalDetailsSlice &
  StoreActions &
  FlightSelectionSlice &
  EvaluationSlice & {
    _lastUpdate?: number;
    _lastPersist?: number;
    _lastPersistedState?: string;
    validationState: ValidationState;
    updateValidationState: (newState: Partial<ValidationState>) => void;
    isFirstVisit: boolean;
    isInitialized: boolean;
    setIsFirstVisit: (value: boolean) => void;
    setIsInitialized: (value: boolean) => void;
    _silentUpdate?: boolean;
  };

export interface StoreStateValues extends StoreState {
  _lastSignatureValidation?: number;
  _lastSignatureValidationResult?: boolean;
}

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
  completedSteps: ValidationStep[];
  [key: number]: boolean;
  _timestamp?: number;
  _lastValidation?: number;
  _lastUpdate?: number;
}

export interface StoreActions {
  // ... other actions
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  notifyInteraction: () => void;
  setOnInteract: (callback: () => void) => void;
  // ... rest of the interface
}

export interface Phase4State {
  // Flight selection state
  selectedType: 'direct' | 'multi';
  directFlight: Phase4FlightSegment;
  flightSegments: Phase4FlightSegment[];
  currentSegmentIndex: number;
  fromLocation: string | null;
  toLocation: string | null;
  selectedDate: Date | null;
  selectedFlight: Flight | null;
  selectedFlights: Flight[];
  originalFlights: Flight[];
  isTransitioningPhases: boolean;
  isInitializing: boolean;
  isSearchModalOpen: boolean;
  searchTerm: string;
  displayedFlights: Flight[];
  allFlights: Flight[];
  loading: boolean;
  errorMessage: string | null;
  errorMessages: Record<string, string>;

  // Travel Status QA state
  travelStatusAnswers: Answer[];
  travelStatusCurrentStep: number;
  travelStatusShowingSuccess: boolean;
  travelStatusIsValid: boolean;
  travelStatusStepValidation: Record<number, boolean>;
  travelStatusStepInteraction: Record<number, boolean>;

  // Informed Date QA state
  informedDateAnswers: Answer[];
  informedDateCurrentStep: number;
  informedDateShowingSuccess: boolean;
  informedDateIsValid: boolean;
  informedDateStepValidation: Record<number, boolean>;
  informedDateStepInteraction: Record<number, boolean>;

  // Shared state
  lastAnsweredQuestion: string | null;
  fieldErrors: Record<string, string>;
  _lastUpdate: number;
  _silentUpdate?: boolean;
}

export interface Phase4FlightSegment {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
}
