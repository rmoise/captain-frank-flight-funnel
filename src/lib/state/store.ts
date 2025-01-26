import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import type { LocationLike } from '@/types/location';
import { formatDateToYYYYMMDD, isValidYYYYMMDD } from '@/utils/dateUtils';
import { parseISO, isValid } from 'date-fns';
import type { ValidationStep } from './types';

// Add FlightSegment type definition at the top of the file
export type FlightSegment = {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
};

// Add initialization state tracking
const isInitializingStore = {
  value: false,
};

// Add validation helper functions
export const validateFlightSelection = (state: StoreStateValues): boolean => {
  // Skip validation during initialization
  if (isInitializingStore.value) {
    return false;
  }

  try {
    let isValid = false;
    console.log('=== Flight Selection Validation ===');
    console.log('Current phase:', state.currentPhase);
    console.log('Selected type:', state.selectedType);

    if (state.selectedType === 'direct') {
      // For phase 1, validate if both locations are filled
      if (state.currentPhase === 1) {
        isValid = !!(
          state.directFlight.fromLocation && state.directFlight.toLocation
        );
        console.log('Phase 1 validation:', {
          fromLocation: state.directFlight.fromLocation,
          toLocation: state.directFlight.toLocation,
          isValid,
        });
      } else {
        // For other phases, require selected flight and date
        isValid = !!(
          state.directFlight.selectedFlight &&
          state.directFlight.date &&
          state.directFlight.fromLocation &&
          state.directFlight.toLocation
        );
        console.log('Other phase validation:', {
          selectedFlight: !!state.directFlight.selectedFlight,
          date: !!state.directFlight.date,
          fromLocation: !!state.directFlight.fromLocation,
          toLocation: !!state.directFlight.toLocation,
          isValid,
        });
      }
    } else {
      // For multi-city flights
      const segments = state.flightSegments;
      console.log('Multi-city segments:', segments);

      if (state.currentPhase === 1) {
        // For phase 1, validate if all segments have both locations
        isValid = !!(
          segments.length >= 2 &&
          segments.every(
            (segment) => segment.fromLocation && segment.toLocation
          ) &&
          // Validate city connections
          segments.every((segment, index) => {
            if (index === 0) return true;
            const prevSegment = segments[index - 1];
            if (!prevSegment.toLocation || !segment.fromLocation) return false;

            const prevCity =
              prevSegment.toLocation.city ||
              prevSegment.toLocation.description ||
              prevSegment.toLocation.label;
            const currentCity =
              segment.fromLocation.city ||
              segment.fromLocation.description ||
              segment.fromLocation.label;

            return prevCity?.toLowerCase() === currentCity?.toLowerCase();
          })
        );
      } else {
        // For phase 3 and above, check if we have all segments and flights
        isValid = !!(
          segments.length >= 2 &&
          segments.length <= 4 &&
          segments.every((segment) => {
            const hasSelectedFlight = !!segment.selectedFlight;
            const hasDate = !!segment.date;
            const hasLocations = !!(segment.fromLocation && segment.toLocation);
            return hasSelectedFlight && hasDate && hasLocations;
          }) &&
          // Validate connections between segments
          segments.every((segment, index) => {
            if (index === 0) return true;
            const prevSegment = segments[index - 1];
            if (!prevSegment.selectedFlight || !segment.selectedFlight)
              return false;

            // Check city connections
            const prevCity = prevSegment.selectedFlight.arrivalCity;
            const currentCity = segment.selectedFlight.departureCity;
            const citiesMatch =
              prevCity?.toLowerCase() === currentCity?.toLowerCase();

            // Check dates
            const prevDate = prevSegment.date;
            const currentDate = segment.date;
            const datesValid =
              prevDate &&
              currentDate &&
              new Date(prevDate) <= new Date(currentDate);

            return citiesMatch && datesValid;
          })
        );
      }
      console.log('Multi-city validation result:', isValid);
    }

    // Create a new validation state object
    const newValidationState = {
      ...state.validationState,
      isFlightValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        [state.currentPhase === 3 ? 1 : 1]: isValid,
      },
      [state.currentPhase === 3 ? 1 : 1]: isValid,
      _timestamp: Date.now(),
    };

    // Update the state immutably
    state.validationState = newValidationState;
    state._lastUpdate = Date.now();

    console.log('Final validation state:', newValidationState);
    console.log('=== End Flight Selection Validation ===');

    return isValid;
  } catch (error) {
    console.error('Error in validateFlightSelection:', error);
    return false;
  }
};

export const validateQAWizard = (
  state: StoreStateValues
): { isValid: boolean; answers: Answer[]; bookingNumber: string } => {
  const { wizardAnswers } = state;
  if (!wizardAnswers || wizardAnswers.length === 0)
    return {
      isValid: false,
      answers: [],
      bookingNumber: state.bookingNumber || '',
    };

  // Don't validate if not submitted
  if (!state.validationState.isWizardSubmitted) {
    console.log('Skipping QA validation - not yet submitted');
    return {
      isValid: false,
      answers: wizardAnswers,
      bookingNumber: state.bookingNumber || '',
    };
  }

  // Check if all required questions are answered
  const issueType = wizardAnswers.find(
    (a) => a.questionId === 'issue_type'
  )?.value;

  if (!issueType)
    return {
      isValid: false,
      answers: wizardAnswers,
      bookingNumber: state.bookingNumber || '',
    };

  let isValid = false;
  const isQA1 = state.currentPhase === 1;
  const isQA2 = state.currentPhase === 2;

  // Additional validation based on issue type
  switch (issueType) {
    case 'delay':
      // Need delay duration
      isValid = wizardAnswers.some((a) => a.questionId === 'delay_duration');
      break;

    case 'cancel':
      // Need cancellation notice and alternative flight info
      const hasCancellationNotice = wizardAnswers.some(
        (a) => a.questionId === 'cancellation_notice'
      );
      const hasAirlineAlternative = wizardAnswers.some(
        (a) => a.questionId === 'alternative_flight_airline_expense'
      );
      const hasRefundStatus = wizardAnswers.some(
        (a) => a.questionId === 'refund_status'
      );

      if (
        !hasCancellationNotice ||
        !hasAirlineAlternative ||
        !hasRefundStatus
      ) {
        isValid = false;
        break;
      }

      // If airline didn't provide alternative, need own alternative info
      const airlineProvidedAlternative =
        wizardAnswers.find(
          (a) => a.questionId === 'alternative_flight_airline_expense'
        )?.value === 'yes';

      if (!airlineProvidedAlternative) {
        isValid = wizardAnswers.some(
          (a) => a.questionId === 'alternative_flight_own_expense'
        );
      } else {
        isValid = true;
      }
      break;

    case 'missed':
      // Need missed costs info
      const hasMissedCosts = wizardAnswers.some(
        (a) => a.questionId === 'missed_costs'
      );
      if (!hasMissedCosts) {
        isValid = false;
        break;
      }

      // If they had costs, need amount
      const hadCosts =
        wizardAnswers.find((a) => a.questionId === 'missed_costs')?.value ===
        'yes';

      if (hadCosts) {
        isValid = wizardAnswers.some(
          (a) => a.questionId === 'missed_costs_amount'
        );
      } else {
        isValid = true;
      }
      break;

    case 'other':
      // No additional questions needed for 'other'
      isValid = true;
      break;

    default:
      isValid = false;
  }

  console.log('QA Wizard validation result:', {
    isValid,
    isQA1,
    isQA2,
    currentPhase: state.currentPhase,
    wizardAnswers,
  });

  // Update validation state while preserving the other QA's state
  const newValidationState = {
    ...state.validationState,
    isWizardValid: isValid,
    isWizardSubmitted: state.validationState.isWizardSubmitted, // Preserve submission state
    stepValidation: {
      ...state.validationState.stepValidation,
      1: state.validationState.stepValidation[1] || false,
      2: isQA1 ? isValid : state.validationState.stepValidation[2],
      3: isQA2 ? isValid : state.validationState.stepValidation[3],
      4: state.validationState.stepValidation[4] || false,
    },
    stepInteraction: {
      ...state.validationState.stepInteraction,
      1: state.validationState.stepInteraction[1] || false,
      2: isQA1 ? true : state.validationState.stepInteraction[2],
      3: isQA2 ? true : state.validationState.stepInteraction[3],
      4: state.validationState.stepInteraction[4] || false,
    },
    1: state.validationState[1] || false,
    2: isQA1 ? isValid : state.validationState[2],
    3: isQA2 ? isValid : state.validationState[3],
    4: state.validationState[4] || false,
    _timestamp: Date.now(),
  };

  // Update validation state
  state.validationState = newValidationState;

  // Update completed steps - only if both valid and interacted
  const stepToValidate = isQA1 ? 2 : isQA2 ? 3 : null;
  if (stepToValidate && isValid) {
    if (!state.completedSteps.includes(stepToValidate)) {
      state.completedSteps = [...state.completedSteps, stepToValidate].sort(
        (a, b) => a - b
      );
    }
  } else if (stepToValidate) {
    state.completedSteps = state.completedSteps.filter(
      (step) => step !== stepToValidate
    );
  }

  // Save validation state and completed steps to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(
      'initialAssessmentValidation',
      JSON.stringify(newValidationState)
    );
    localStorage.setItem(
      'initialAssessmentCompletedSteps',
      JSON.stringify(state.completedSteps)
    );
  }

  return {
    isValid,
    answers: wizardAnswers,
    bookingNumber: state.bookingNumber || '',
  };
};

export const validatePersonalDetails = (state: StoreStateValues): boolean => {
  const { currentPhase, personalDetails } = state;
  if (!personalDetails) return false;

  // Basic required fields for all phases
  const hasBasicFields = !!(
    personalDetails.salutation?.trim() &&
    personalDetails.firstName?.trim() &&
    personalDetails.lastName?.trim() &&
    personalDetails.email?.trim() &&
    personalDetails.postalCode?.trim()
  );

  // Email validation
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  const hasValidEmail = !!(
    personalDetails.email && emailRegex.test(personalDetails.email)
  );

  // Additional fields required for claim success and agreement phases
  const isClaimSuccessPhase =
    currentPhase === URL_TO_PHASE['/phases/claim-success'] ||
    currentPhase === URL_TO_PHASE['/phases/agreement'];

  const hasClaimSuccessFields = isClaimSuccessPhase
    ? !!(
        personalDetails.phone?.trim() &&
        personalDetails.address?.trim() &&
        personalDetails.postalCode?.trim() &&
        personalDetails.city?.trim() &&
        personalDetails.country?.trim()
      )
    : true;

  return !!(hasBasicFields && hasValidEmail && hasClaimSuccessFields);
};

export const validateTerms = (
  state: StoreStateValues,
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): boolean => {
  const isValid = !!(state.termsAccepted && state.privacyAccepted);

  // Use set to update validation state
  set((state) => ({
    ...state,
    validationState: {
      ...state.validationState,
      isTermsValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        2: isValid,
      },
      stepInteraction: {
        ...state.validationState.stepInteraction,
        2: true,
      },
      2: isValid,
    },
    completedSteps: isValid
      ? Array.from(new Set([...state.completedSteps, 2])).sort((a, b) => a - b)
      : state.completedSteps,
  }));

  return isValid;
};

export const validateSignature = (state: StoreStateValues): boolean => {
  return !!(state.signature && state.hasSignature);
};

// Single implementation of step validation
export const checkStepValidity =
  (state: StoreStateValues) =>
  (step: ValidationStep): boolean => {
    // During Phase 1, all steps should be accessible
    if (state.currentPhase === 1) {
      return true;
    }

    // For other phases, maintain existing validation logic
    return !!(
      state.validationState?.stepValidation?.[step] ||
      state.validationState?.stepInteraction?.[step]
    );
  };

// Add helper function to check if compensation needs recalculation
export const shouldRecalculateCompensation = (
  state: StoreStateValues
): boolean => {
  const {
    compensationCache,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlights,
  } = state;

  // If we have a cached amount and flight data, check if anything has changed
  if (compensationCache.amount !== null && compensationCache.flightData) {
    // Check if flight type changed
    if (selectedType !== compensationCache.flightData.selectedType) return true;

    // For direct flights
    if (selectedType === 'direct') {
      return (
        JSON.stringify(directFlight) !==
        JSON.stringify(compensationCache.flightData.directFlight)
      );
    }

    // For multi-segment flights
    return (
      JSON.stringify(flightSegments) !==
        JSON.stringify(compensationCache.flightData.flightSegments) ||
      JSON.stringify(selectedFlights) !==
        JSON.stringify(compensationCache.flightData.selectedFlights)
    );
  }

  // If no cache exists or amount is null, we need to calculate
  return true;
};

// Add type declaration for window extension
declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
  }
}

// Define validation state first
export interface ValidationState {
  isPersonalValid: boolean;
  isFlightValid: boolean;
  isBookingValid: boolean;
  isWizardValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isWizardSubmitted: boolean;
  isValidating: boolean;
  lastValidationKey?: string;
  stepValidation: Record<ValidationStateSteps, boolean>;
  stepInteraction: Record<ValidationStateSteps, boolean>;
  fieldErrors: Record<string, string>;
  transitionInProgress: boolean;
  [key: number]: boolean;
  _timestamp?: number;
}

export interface StoreState {
  // ... existing code ...
  validationState: ValidationState;
  // ... existing code ...
}

// Export ValidationStateSteps type
export type ValidationStateSteps = 1 | 2 | 3 | 4 | 5;

export const initialValidationState: ValidationState = {
  isPersonalValid: false,
  isFlightValid: false,
  isBookingValid: false,
  isWizardValid: false,
  isTermsValid: false,
  isSignatureValid: false,
  isWizardSubmitted: false,
  isValidating: false,
  lastValidationKey: undefined,
  stepValidation: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
  stepInteraction: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
  fieldErrors: {},
  transitionInProgress: false,
  _timestamp: Date.now(),
};

// Define state slices
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
}

export type WizardStepKey =
  | 'travel_status'
  | 'informed_date'
  | 'issue'
  | 'phase1'
  | 'default';

interface WizardSlice {
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
  wizardSuccessStates: Record<
    WizardStepKey,
    { showing: boolean; message: string }
  >;
  tripExperienceAnswers: Answer[];
}

interface UserSlice {
  personalDetails: PassengerDetails | null;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  signature: string;
  hasSignature: boolean;
}

interface NavigationSlice {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
  currentStep: number;
  phasesCompletedViaContinue: number[]; // Track phases completed via continue button
  openSteps: number[]; // Add openSteps property
}

interface ValidationSlice {
  validationState: ValidationState;
  isValidating: boolean;
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

// Define store actions
export interface StoreActions {
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
  setWizardAnswers: (answers: Answer[]) => void;
  validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => void;
  validateStep: (step: ValidationStateSteps, isValid: boolean) => void;
  setWizardValidationState: (state: Record<number, boolean>) => void;
  markWizardComplete: (wizardId: string) => void;
  isWizardCompleted: (wizardId: string) => boolean;
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  setWizardShowingSuccess: (showing: boolean) => void;
  handleWizardComplete: (
    wizardId: string,
    answers: Answer[],
    successMessage: string
  ) => boolean;
  initializeStore: () => void;
  setCurrentPhase: (phase: number) => void;
  completePhase: (phase: number) => void;
  completeStep: (step: number) => void;
  goToPreviousPhase: () => string | null;
  setBookingNumber: (bookingNumber: string) => void;
  setOpenSteps: (steps: number[]) => void; // Add setOpenSteps action
  setSelectedFlights: (flights: Flight[]) => void;
  initializeNavigationFromUrl: () => void;
  setCurrentSegmentIndex: (index: number) => void;
  setSelectedType: (type: 'direct' | 'multi') => void;
  setDirectFlight: (flight: {
    fromLocation: LocationLike | null;
    toLocation: LocationLike | null;
    date: Date | null;
    selectedFlight: Flight | null;
  }) => void;
  setFromLocation: (location: string | null) => void;
  setToLocation: (location: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setFlightSegments: (
    segments: Array<{
      fromLocation: LocationLike | null;
      toLocation: LocationLike | null;
      date: Date | null;
      selectedFlight: Flight | null;
    }>
  ) => void;
  validateFlightSelection: () => boolean;
  validateBookingNumber: () => void;
  shouldRecalculateCompensation: () => boolean;
  setCompensationCache: (cache: {
    amount: number;
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
    };
  }) => void;
  setCompensationAmount: (amount: number | null) => void;
  setCompensationLoading: (loading: boolean) => void;
  setCompensationError: (error: string | null) => void;
  setPersonalDetails: (details: PassengerDetails | null) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setMarketingAccepted: (accepted: boolean) => void;
  validateTerms: () => boolean;
  isStepValid: (step: ValidationStateSteps) => boolean;
  validatePersonalDetails: () => boolean;
  validateWizardTerms: () => boolean;
  validateTripExperience: () => boolean;
  validateInformedDate: () => boolean;
  handleTripExperienceComplete: () => void;
  handleInformedDateComplete: () => void;
  canProceedToNextPhase: () => boolean;
  setFlightState: (updates: Partial<FlightSlice>) => void;
  setSignature: (signature: string) => void;
  setHasSignature: (hasSignature: boolean) => void;
  validateSignature: () => boolean;
  updateValidationState: (updates: Partial<ValidationState>) => void;
  setEvaluationResult: (result: CompensationSlice['evaluationResult']) => void;
  setLocationError: (error: string | null) => void;
  clearLocationError: () => void;
  resetStore: () => void;
  showLoading: () => void;
  hideLoading: () => void;
  setLastAnsweredQuestion: (questionId: string | null) => void;
  setSearchModalOpen: (isOpen: boolean) => void;
  setSearchTerm: (term: string) => void;
  setDisplayedFlights: (flights: Flight[]) => void;
  setAllFlights: (flights: Flight[]) => void;
  setFlightSearchLoading: (loading: boolean) => void;
  setFlightErrorMessage: (message: string | null) => void;
  setFlightErrorMessages: (messages: {
    from?: string;
    to?: string;
    date?: string;
  }) => void;
  clearFlightErrors: () => void;
  setOriginalFlights: (flights: Flight[]) => void;
}

// Define CompensationCache type
interface CompensationCache {
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
}

// Add evaluation result to CompensationSlice
interface CompensationSlice {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
  compensationCache: CompensationCache;
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

// Combine all slices
export interface StoreState
  extends FlightSlice,
    WizardSlice,
    UserSlice,
    NavigationSlice,
    ValidationSlice,
    CompensationSlice,
    FlightSearchSlice {
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
  validationState: ValidationState;
}

// Initial state
const initialState: StoreState = {
  // Flight related
  selectedType: 'direct',
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: null,
    selectedFlight: null,
  },
  flightSegments: [],
  currentSegmentIndex: 0,
  fromLocation: null,
  toLocation: null,
  selectedDate: null,
  selectedFlights: [],
  originalFlights: [],
  selectedFlight: null,
  flightDetails: null,
  delayDuration: null,

  // Wizard related
  wizardAnswers: [],
  wizardCurrentSteps: {
    travel_status: 0,
    informed_date: 0,
    issue: 0,
    phase1: 0,
    default: 0,
  },
  wizardShowingSuccess: false,
  wizardSuccessMessage: '',
  wizardIsCompleted: false,
  wizardIsValid: false,
  lastAnsweredQuestion: null,
  completedWizards: {},
  lastValidAnswers: [],
  lastValidStep: 0,
  wizardIsEditingMoney: false,
  wizardLastActiveStep: null,
  wizardValidationState: {},
  wizardIsValidating: false,
  wizardSuccessStates: {
    travel_status: { showing: false, message: '' },
    informed_date: { showing: false, message: '' },
    issue: { showing: false, message: '' },
    phase1: { showing: false, message: '' },
    default: { showing: false, message: '' },
  },

  // User related
  personalDetails: null,
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
  signature: '',
  hasSignature: false,

  // Navigation related
  currentPhase: 1,
  completedPhases: [],
  completedSteps: [],
  currentStep: 1,
  phasesCompletedViaContinue: [],
  openSteps: [], // Add initial state for openSteps

  // Validation related
  validationState: {
    ...initialValidationState,
    isBookingValid: false,
    stepValidation: {
      ...initialValidationState.stepValidation,
      2: false,
    },
    2: false,
  },
  isValidating: false,

  // Compensation related
  compensationAmount: null,
  compensationLoading: false,
  compensationError: null,
  compensationCache: {
    amount: null,
    flightData: {
      selectedType: 'direct',
      directFlight: null,
      flightSegments: [],
      selectedFlights: [],
    },
  },
  evaluationResult: {
    status: null,
  },

  // Other state
  locationError: null,
  bookingNumber: '',
  isTransitioningPhases: false,
  isInitializing: false,
  _lastUpdate: Date.now(),
  _lastPersistedState: '',

  // Trip experience related
  tripExperienceAnswers: [],

  isLoading: false,

  // Flight search related
  isSearchModalOpen: false,
  searchTerm: '',
  displayedFlights: [],
  allFlights: [],
  loading: false,
  errorMessage: null,
  errorMessages: {},
};

// URL mappings
export const URL_TO_PHASE: Record<string, number> = {
  '/phases/initial-assessment': 1,
  '/[lang]/phases/initial-assessment': 1,
  '/phases/compensation-estimate': 2,
  '/[lang]/phases/compensation-estimate': 2,
  '/phases/flight-details': 3,
  '/[lang]/phases/flight-details': 3,
  '/phases/trip-experience': 4,
  '/[lang]/phases/trip-experience': 4,
  '/phases/agreement': 5,
  '/[lang]/phases/agreement': 5,
};

export const PHASE_TO_URL: Record<number, string> = {
  1: '/phases/initial-assessment',
  2: '/phases/compensation-estimate',
  3: '/phases/flight-details',
  4: '/phases/trip-experience',
  5: '/phases/agreement',
};

// Add language-aware URL helpers
export const getLanguageAwareUrl = (url: string, lang: string) =>
  `/${lang}${url}`;

// Add new validation function
export const validateAndUpdateWizard = (state: StoreStateValues): boolean => {
  // Get current answers
  const answers = state.wizardAnswers || [];

  // Check if we have any answers
  if (answers.length === 0) return false;

  // Get wizard ID from first answer
  const wizardId = answers[0]?.questionId;
  if (!wizardId) return false;

  // Check if wizard is completed
  if (!state.wizardIsCompleted || !state.completedWizards[wizardId])
    return false;

  // Validate all answers
  const hasValidAnswers = answers.every((answer: Answer) => {
    // Skip validation for questions that shouldn't be shown
    const shouldShow = answer.shouldShow !== false;
    if (!shouldShow) return true;

    // Validate the answer value
    const value = answer?.value;
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'number' && value <= 0) return false;
    if (typeof value === 'boolean' && !value) return false;

    return true;
  });

  return answers.length > 0 && hasValidAnswers && state.wizardIsCompleted;
};

// Initialize store with saved state if available
const getInitialState = () => {
  if (typeof window === 'undefined') return initialState;

  try {
    // Prevent multiple initializations
    if (isInitializingStore.value) {
      return initialState;
    }

    isInitializingStore.value = true;

    const savedValidationState = localStorage.getItem('validationState');
    if (savedValidationState) {
      try {
        const parsedState = JSON.parse(savedValidationState);
        return {
          ...initialState,
          ...parsedState,
          _lastUpdate: Date.now(),
        };
      } catch (error) {
        console.error('Error parsing saved validation state:', error);
      }
    }
  } catch (error) {
    console.error('Error loading saved validation state:', error);
  } finally {
    isInitializingStore.value = false;
  }

  return {
    ...initialState,
    _lastUpdate: Date.now(),
  };
};

// Create the store with combined type
export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...getInitialState(),

      // Actions
      initializeStore: () => {
        const state = get();
        // Skip if already initialized or initializing
        if (state.isInitializing || state._lastUpdate) {
          return;
        }

        try {
          // Set initializing flag
          set({ isInitializing: true });

          // Restore validation state
          const savedValidationState = localStorage.getItem(
            'initialAssessmentValidation'
          );
          const savedCompletedSteps = localStorage.getItem(
            'initialAssessmentCompletedSteps'
          );

          let newState = {
            ...state,
            validationState: {
              ...initialValidationState,
              stepValidation: {
                ...initialValidationState.stepValidation,
                1: true,
              },
              stepInteraction: {
                ...initialValidationState.stepInteraction,
                1: true,
              },
            },
          };

          if (savedValidationState) {
            try {
              const parsedValidation = JSON.parse(savedValidationState);
              newState.validationState = {
                ...newState.validationState,
                ...parsedValidation,
                stepValidation: {
                  ...newState.validationState.stepValidation,
                  ...parsedValidation.stepValidation,
                  1: true,
                },
                stepInteraction: {
                  ...newState.validationState.stepInteraction,
                  ...parsedValidation.stepInteraction,
                  1: true,
                },
              };
            } catch (error) {
              console.error('Error parsing validation state:', error);
            }
          }

          if (savedCompletedSteps) {
            try {
              newState.completedSteps = JSON.parse(savedCompletedSteps);
            } catch (error) {
              console.error('Error parsing completed steps:', error);
            }
          }

          // Update state once with all changes
          set({
            ...newState,
            isInitializing: false,
            _lastUpdate: Date.now(),
          });
        } catch (error) {
          console.error('Error in store initialization:', error);
          // Ensure we clear initializing flag even on error
          set({ isInitializing: false });
        }
      },
      batchUpdateWizardState: (updates: Partial<StoreState>) => {
        set((state) => ({
          ...state,
          ...updates,
          _lastUpdate: Date.now(), // Force re-render by updating timestamp
        }));
      },

      setFlightState: (updates: Partial<FlightSlice>) => {
        const state = get();

        // Create new state with updates
        const newState = {
          ...state,
          ...updates,
        };

        // Run validation with new state
        const isValid = validateFlightSelection(newState);

        // Apply updates with validation results
        set({
          ...newState,
          validationState: {
            ...state.validationState,
            isFlightValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: isValid,
            },
            1: isValid,
            _timestamp: Date.now(),
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, 1])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((step) => step !== 1),
          _lastUpdate: Date.now(),
        });
      },

      setWizardAnswers: (answers: Answer[]) => {
        set((state) => {
          // Format any date answers to YYYY-MM-DD
          const formattedAnswers = answers.map((answer) => {
            if (answer.questionId === 'specific_informed_date') {
              // Ensure the value is not undefined
              if (!answer.value) {
                return answer;
              }

              // If it's already in YYYY-MM-DD format, keep it
              if (
                typeof answer.value === 'string' &&
                isValidYYYYMMDD(answer.value)
              ) {
                return answer;
              }

              // Convert the value to string before formatting
              const stringValue = String(answer.value);
              const formattedDate = formatDateToYYYYMMDD(stringValue);

              return {
                ...answer,
                value: formattedDate || answer.value,
              };
            }
            return answer;
          });

          // Get the prefix of the current answers being set (e.g., 'travel_status', 'informed_date')
          const currentPrefix = formattedAnswers[0]?.questionId?.split('_')[0];

          // Keep all answers that don't start with the current prefix
          const existingAnswers = state.wizardAnswers.filter((a) => {
            const prefix = a.questionId.split('_')[0];
            return prefix !== currentPrefix;
          });

          // Remove duplicates from the new answers
          const uniqueNewAnswers = formattedAnswers.reduce(
            (acc: Answer[], curr) => {
              const existingIndex = acc.findIndex(
                (a) => a.questionId === curr.questionId
              );
              if (existingIndex >= 0) {
                acc[existingIndex] = curr; // Replace with latest answer
              } else {
                acc.push(curr);
              }
              return acc;
            },
            []
          );

          const newAnswers = [...existingAnswers, ...uniqueNewAnswers];

          // Return updated state
          return {
            ...state,
            wizardAnswers: newAnswers,
            _lastUpdate: Date.now(),
          };
        });
      },

      validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => {
        set((state) => {
          // Skip update if validation state hasn't changed
          const currentStepValid = state.validationState.stepValidation[step];
          const currentStepInteraction =
            state.validationState.stepInteraction[step];

          // If nothing would change, return the current state
          if (currentStepValid === isValid && currentStepInteraction === true) {
            return state;
          }

          // Create new validation state only if needed
          const newValidationState = {
            ...state.validationState,
            stepValidation:
              currentStepValid === isValid
                ? state.validationState.stepValidation
                : {
                    ...state.validationState.stepValidation,
                    [step]: isValid,
                  },
            stepInteraction:
              currentStepInteraction === true
                ? state.validationState.stepInteraction
                : {
                    ...state.validationState.stepInteraction,
                    [step]: true,
                  },
            [step]: isValid,
            _timestamp: Date.now(),
          };

          // Only update if validation state actually changed
          if (
            JSON.stringify(newValidationState) ===
            JSON.stringify(state.validationState)
          ) {
            return state;
          }

          return {
            validationState: newValidationState,
          };
        });
      },

      validateStep: (step: ValidationStateSteps, isValid: boolean) => {
        const { validateAndUpdateStep } = get() as StoreState & StoreActions;
        validateAndUpdateStep(step, isValid);
      },

      setWizardValidationState: (state: Record<number, boolean>) =>
        set({ wizardValidationState: state }),

      markWizardComplete: (wizardId: string) =>
        set((state) => ({
          completedWizards: { ...state.completedWizards, [wizardId]: true },
        })),

      isWizardCompleted: (wizardId: string) =>
        get().completedWizards[wizardId] || false,

      validateQAWizard: () => {
        const state = get();
        const result = validateQAWizard(state);

        // If valid, update the store with the current answers and step
        if (result.isValid) {
          const wizardId = state.wizardAnswers[0]?.questionId;
          if (wizardId) {
            const wizardType = wizardId.split('_')[0];
            const currentStep = state.wizardCurrentSteps[wizardType] || 0;

            set({
              wizardIsCompleted: true,
              wizardIsValid: true,
              completedWizards: { ...state.completedWizards, [wizardId]: true },
              // Preserve the current step and answers
              wizardCurrentSteps: {
                ...state.wizardCurrentSteps,
                [wizardType]: currentStep,
              },
              lastAnsweredQuestion: wizardId,
            });
          }
        }

        return result;
      },

      setWizardShowingSuccess: (showing: boolean) =>
        set(() => ({
          wizardShowingSuccess: showing,
        })),

      // Add new action to handle wizard completion
      handleWizardComplete: (
        wizardId: string,
        answers: Answer[],
        successMessage: string
      ): boolean => {
        const state = get();
        // Get wizard type from ID
        let wizardType = wizardId.split('_')[0] as WizardStepKey;

        // Special handling for travel_status and informed_date
        if (wizardId.startsWith('travel_status')) {
          wizardType = 'travel_status';
        } else if (wizardId.startsWith('informed')) {
          wizardType = 'informed_date';
        }

        // Update wizard success states
        const wizardSuccessStates = {
          ...state.wizardSuccessStates,
          [wizardType]: { showing: true, message: successMessage },
        };

        // Ensure we use the correct wizard ID for completion tracking
        const completeWizardId =
          wizardType === 'informed_date' ? 'informed_date' : wizardId;

        // Update the state
        set((state) => ({
          ...state,
          validationState: {
            ...state.validationState,
            isWizardValid: true,
            stepValidation: {
              ...state.validationState.stepValidation,
              2: true,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              2: true,
            },
            2: true,
            _timestamp: Date.now(),
          },
          lastAnsweredQuestion: wizardId,
          wizardAnswers: answers,
          wizardSuccessStates,
          wizardIsCompleted: true,
          wizardIsValid: true,
          completedWizards: {
            ...state.completedWizards,
            [completeWizardId]: true,
          },
          completedSteps: Array.from(
            new Set([...state.completedSteps, 2])
          ).sort((a, b) => a - b),
          _lastUpdate: Date.now(),
        }));

        // Store the wizard type for the timeout
        // const finalWizardType = wizardType;

        // Remove auto-hiding timeout
        if (typeof window !== 'undefined' && window.__wizardSuccessTimeout) {
          clearTimeout(window.__wizardSuccessTimeout);
        }

        return true; // Return true to indicate successful completion
      },

      setCurrentPhase: (phase: number) => {
        console.log('=== Setting Current Phase ===');
        console.log('Current phase:', phase);

        set((state) => {
          // Add the phase to completed phases if not already there
          const uniqueCompletedPhases = Array.from(
            new Set([...state.completedPhases, phase])
          ).sort((a, b) => a - b);

          // For phase 4, try to restore validation state from localStorage first
          let newValidationState = { ...state.validationState };

          if (phase === 4) {
            console.log('=== Initializing Phase 4 State ===');
            if (typeof window !== 'undefined') {
              const savedState = localStorage.getItem('phase4ValidationState');
              if (savedState) {
                try {
                  const parsedState = JSON.parse(savedState);
                  console.log(
                    'Restored Phase 4 validation state:',
                    parsedState
                  );
                  newValidationState = {
                    ...newValidationState,
                    ...parsedState,
                  };
                } catch (error) {
                  console.error(
                    'Error parsing saved phase 4 validation state:',
                    error
                  );
                }
              } else {
                console.log('No saved Phase 4 validation state found');
              }
            }
            console.log('Current wizard answers:', state.wizardAnswers);
            console.log(
              'Current selected flights:',
              state.selectedFlights.map((f) => ({
                id: f.id,
                flightNumber: f.flightNumber,
              }))
            );
          }

          return {
            ...state,
            currentPhase: phase,
            completedPhases: uniqueCompletedPhases,
            validationState: newValidationState,
            _lastUpdate: Date.now(),
          };
        });

        console.log('=== End Setting Current Phase ===');
      },

      completePhase: (phase: number) =>
        set((state) => ({
          completedPhases: Array.from(
            new Set([...state.completedPhases, phase])
          ),
          completedSteps: Array.from(new Set([...state.completedSteps, phase])),
          phasesCompletedViaContinue: Array.from(
            new Set([...state.phasesCompletedViaContinue, phase])
          ),
        })),

      completeStep: (step: number) =>
        set((state) => ({
          completedSteps: Array.from(new Set([...state.completedSteps, step])),
        })),

      goToPreviousPhase: () => {
        const state = get();
        const prevPhase = state.currentPhase - 1;
        if (prevPhase < 1) return null;

        // Get the current URL path to determine language
        const currentPath = window.location.pathname;
        const isGermanRoute = currentPath.startsWith('/de/');
        const langPrefix = isGermanRoute ? '/de' : '';
        const baseUrl = PHASE_TO_URL[prevPhase];

        if (!baseUrl) return null;

        // When going back, we want to preserve the validation state of the previous phase
        const store = get();
        store.setCurrentPhase(prevPhase);

        // Return the URL with language prefix
        return `${langPrefix}${baseUrl}`;
      },

      setBookingNumber: (bookingNumber: string) => {
        const state = get();

        // Preserve existing validation state
        const existingValidationState = { ...state.validationState };
        const existingCompletedSteps = [...state.completedSteps];

        // Create new state with updated booking number
        const newState = {
          ...state,
          bookingNumber,
        };

        // Run validation immediately
        const bookingNumberTrimmed = bookingNumber.trim();
        const isValid =
          bookingNumberTrimmed.length >= 6 &&
          /^[A-Z0-9]+$/i.test(bookingNumberTrimmed);

        // Create new validation state while preserving other validations
        const newValidationState = {
          ...existingValidationState,
          isBookingValid: isValid,
          stepValidation: {
            ...existingValidationState.stepValidation,
            2: isValid,
          },
          2: isValid,
          // Add timestamp to force re-render
          _timestamp: Date.now(),
        };

        // Calculate new completed steps while preserving existing ones
        const newCompletedSteps = isValid
          ? Array.from(new Set([...existingCompletedSteps, 2])).sort(
              (a, b) => a - b
            )
          : existingCompletedSteps.filter((step) => step !== 2);

        // Update state atomically with all changes
        set({
          ...newState,
          validationState: newValidationState,
          completedSteps: newCompletedSteps,
          _lastUpdate: Date.now(),
        });
      },

      setSelectedFlights: (flights: Flight[]) =>
        set((state) => {
          // Skip update if nothing has changed
          if (
            JSON.stringify(state.selectedFlights) === JSON.stringify(flights)
          ) {
            return state;
          }

          // Filter out any null flights and ensure no duplicates by segment index
          const uniqueFlights = flights
            .filter(
              (flight): flight is Flight =>
                flight !== null && typeof flight === 'object' && 'id' in flight
            )
            .reduce((acc: Flight[], flight, index) => {
              // Only add if this flight isn't already in the array at this index
              const existingIndex = acc.findIndex(
                (f) => f && f.id === flight.id
              );
              if (existingIndex === -1 || existingIndex === index) {
                acc[index] = flight;
              }
              return acc;
            }, new Array(flights.length).fill(null));

          // Remove any null entries
          const cleanedFlights = uniqueFlights.filter(
            (f): f is Flight => f !== null
          );

          return {
            ...state,
            selectedFlights: cleanedFlights,
            selectedFlight: cleanedFlights[state.currentSegmentIndex] || null,
            _lastUpdate: Date.now(),
          };
        }),

      initializeNavigationFromUrl: () => {
        const state = get();

        // Get current pathname and phase
        const pathname = window.location.pathname;
        // Remove language prefix before looking up phase
        const basePath = pathname.replace(/^\/de/, '');
        const phase = URL_TO_PHASE[basePath] || 1;

        // Update current phase if different
        if (state.currentPhase !== phase) {
          get().setCurrentPhase(phase);
        }
      },

      setCurrentSegmentIndex: (index: number) =>
        set({ currentSegmentIndex: index }),

      setSelectedType: (type: 'direct' | 'multi') =>
        set((state) => {
          // Skip if type hasn't changed
          if (state.selectedType === type) {
            return state;
          }

          // Preserve existing state
          const existingValidationState = { ...state.validationState };
          const existingCompletedSteps = [...state.completedSteps];

          // Create base state updates with cleared data
          let newState: Partial<StoreState> = {
            selectedType: type,
            selectedDate: null,
            selectedFlight: null,
            selectedFlights: [],
            fromLocation: null,
            toLocation: null,
          };

          // If switching to multi, initialize empty segments
          if (type === 'multi') {
            const newSegments = [
              {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              },
              {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              },
            ];

            newState = {
              ...newState,
              flightSegments: newSegments,
              currentSegmentIndex: 0,
              directFlight: {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              },
            };
          }

          // If switching to direct, initialize empty direct flight
          if (type === 'direct') {
            newState = {
              ...newState,
              directFlight: {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              },
              flightSegments: [],
            };
          }

          // Create updated state with all changes
          const updatedState = {
            ...state,
            ...newState,
          };

          // Run validation with the updated state
          const isValid = validateFlightSelection(updatedState);

          // For phase 3, also validate booking number
          const bookingValid =
            state.currentPhase === 3
              ? validateBookingNumber(state)
              : existingValidationState.isBookingValid;

          // Create final validation state while preserving other validations
          const finalValidationState = {
            ...existingValidationState,
            isFlightValid: isValid,
            isBookingValid: bookingValid,
            stepValidation: {
              ...existingValidationState.stepValidation,
              1: isValid,
              2: bookingValid,
            },
            1: isValid,
            2: bookingValid,
            _timestamp: Date.now(),
          };

          // Calculate completed steps while preserving existing ones
          let finalCompletedSteps = [...existingCompletedSteps];
          if (isValid && !finalCompletedSteps.includes(1)) {
            finalCompletedSteps = Array.from(
              new Set([...finalCompletedSteps, 1])
            ).sort((a, b) => a - b);
          } else if (!isValid) {
            finalCompletedSteps = finalCompletedSteps.filter(
              (step) => step !== 1
            );
          }

          // For phase 3, handle booking validation in completed steps
          if (state.currentPhase === 3) {
            if (bookingValid && !finalCompletedSteps.includes(2)) {
              finalCompletedSteps = Array.from(
                new Set([...finalCompletedSteps, 2])
              ).sort((a, b) => a - b);
            } else if (!bookingValid) {
              finalCompletedSteps = finalCompletedSteps.filter(
                (step) => step !== 2
              );
            }
          }

          // Return final state with all updates
          return {
            ...updatedState,
            validationState: finalValidationState,
            completedSteps: finalCompletedSteps,
            _lastUpdate: Date.now(),
          };
        }),

      setDirectFlight: (flight: FlightSlice['directFlight']) =>
        set({ directFlight: flight }),

      setFromLocation: (location: string | null) => {
        set((state) => {
          // Parse location if it's a string
          let parsedLocation = null;
          try {
            parsedLocation =
              typeof location === 'string' ? JSON.parse(location) : location;
          } catch (e) {
            parsedLocation = location;
          }

          // Create new state with both location updates
          const newState = {
            ...state,
            fromLocation: location,
            directFlight: {
              ...state.directFlight,
              fromLocation: parsedLocation,
            },
          };

          // Run validation with the new state
          const isValid = validateFlightSelection(newState);

          // Update validation state
          const newValidationState = {
            ...state.validationState,
            isFlightValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: isValid,
            },
            1: isValid,
            // Preserve signature validation based on phase
            isSignatureValid:
              state.currentPhase === URL_TO_PHASE['/phases/agreement']
                ? state.validationState.isSignatureValid
                : true,
          };

          // Calculate completed steps based on validation state
          const completedSteps = [];
          if (isValid) {
            completedSteps.push(1);
          }
          if (state.validationState.isWizardValid) {
            completedSteps.push(2);
          }
          if (state.validationState.isPersonalValid) {
            completedSteps.push(3);
          }
          if (state.validationState.isTermsValid) {
            completedSteps.push(4);
          }

          // Return updated state
          const finalState = {
            ...newState,
            validationState: newValidationState,
            completedSteps,
          };

          return finalState;
        });
      },

      setToLocation: (location: string | null) => {
        set((state) => {
          // Parse location if it's a string
          let parsedLocation = null;
          try {
            parsedLocation =
              typeof location === 'string' ? JSON.parse(location) : location;
          } catch (e) {
            parsedLocation = location;
          }

          // Create new state with both location updates
          const newState = {
            ...state,
            toLocation: location,
            directFlight: {
              ...state.directFlight,
              toLocation: parsedLocation,
            },
          };

          // Run validation with the new state

          const isValid = validateFlightSelection(newState);

          // Update validation state
          const newValidationState = {
            ...state.validationState,
            isFlightValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: isValid,
            },
            1: isValid,
            // Preserve signature validation based on phase
            isSignatureValid:
              state.currentPhase === URL_TO_PHASE['/phases/agreement']
                ? state.validationState.isSignatureValid
                : true,
          };

          // Calculate completed steps based on validation state
          const completedSteps = [];
          if (isValid) {
            completedSteps.push(1);
          }
          if (state.validationState.isWizardValid) {
            completedSteps.push(2);
          }
          if (state.validationState.isPersonalValid) {
            completedSteps.push(3);
          }
          if (state.validationState.isTermsValid) {
            completedSteps.push(4);
          }

          // Return updated state
          const finalState = {
            ...newState,
            validationState: newValidationState,
            completedSteps,
          };

          return finalState;
        });
      },

      setSelectedDate: (date: string | null) => set({ selectedDate: date }),

      setSelectedFlight: (flight: Flight | null) => {
        console.log('=== Store - setSelectedFlight ===', {
          flight,
          storeType: 'store',
          timestamp: new Date().toISOString(),
        });
        set((state) => {
          // Create new arrays to avoid mutation
          const newFlightSegments = [...state.flightSegments];
          const newSelectedFlights: (Flight | null)[] = [
            ...state.selectedFlights,
          ];

          // If this is the first flight being set, initialize originalFlights
          const originalFlights =
            state.originalFlights.length > 0
              ? state.originalFlights
              : newSelectedFlights.filter((f): f is Flight => f !== null);

          if (flight) {
            // Ensure we're using the same date for all segments
            const updatedFlight = {
              ...flight,
              date: state.selectedDate || flight.date,
            };

            // Update the flight segment
            newFlightSegments[state.currentSegmentIndex] = {
              ...newFlightSegments[state.currentSegmentIndex],
              selectedFlight: updatedFlight,
            };

            // Update selected flights array
            newSelectedFlights[state.currentSegmentIndex] = updatedFlight;
          } else {
            // If removing a flight, only remove it from the current index
            newFlightSegments[state.currentSegmentIndex] = {
              ...newFlightSegments[state.currentSegmentIndex],
              selectedFlight: null,
            };
            newSelectedFlights[state.currentSegmentIndex] = null;
          }

          // Keep all non-null flights in their original positions
          const updatedSelectedFlights = newSelectedFlights.filter(
            (f): f is Flight => f !== null
          );

          // Calculate validation state
          const hasAllSegments = !!(
            newFlightSegments &&
            newFlightSegments.length >= 2 &&
            newFlightSegments.every(
              (segment) => segment.selectedFlight !== null
            )
          );

          const hasAllFlights = !!(
            updatedSelectedFlights.length === newFlightSegments.length &&
            updatedSelectedFlights.every((f) => f !== null)
          );

          // Check if dates are in chronological order and segments are properly linked
          let datesAreValid = true;
          let segmentsAreLinked = true;

          if (hasAllSegments && newFlightSegments.length >= 2) {
            for (let i = 0; i < newFlightSegments.length - 1; i++) {
              const currentFlight = newFlightSegments[i].selectedFlight;
              const nextFlight = newFlightSegments[i + 1].selectedFlight;

              if (currentFlight && nextFlight) {
                // Check city connections
                if (
                  currentFlight.arrivalCity.toLowerCase() !==
                  nextFlight.departureCity.toLowerCase()
                ) {
                  segmentsAreLinked = false;
                  break;
                }

                // Check flight times
                const currentArrivalTime = new Date(
                  `${currentFlight.date}T${currentFlight.arrivalTime}:00.000Z`
                );
                const nextDepartureTime = new Date(
                  `${nextFlight.date}T${nextFlight.departureTime}:00.000Z`
                );

                if (nextDepartureTime <= currentArrivalTime) {
                  datesAreValid = false;
                  break;
                }

                // Check minimum connection time (30 minutes)
                const timeDiff =
                  nextDepartureTime.getTime() - currentArrivalTime.getTime();
                if (timeDiff < 1800000) {
                  datesAreValid = false;
                  break;
                }
              }
            }
          }

          // Calculate final validation state
          const isValid = flight
            ? hasAllSegments &&
              hasAllFlights &&
              datesAreValid &&
              segmentsAreLinked
            : false;

          // Log state update for debugging
          console.log('Store - Flight State Update:', {
            selectedFlight: flight,
            selectedFlights: updatedSelectedFlights,
            originalFlights,
            flightSegments: newFlightSegments,
            hasAllSegments,
            hasAllFlights,
            datesAreValid,
            segmentsAreLinked,
            isValid,
            storeType: 'store',
          });

          // Return new state with all updates
          return {
            ...state,
            selectedFlight: flight,
            selectedFlights: updatedSelectedFlights,
            originalFlights,
            flightSegments: newFlightSegments,
            currentSegmentIndex: state.currentSegmentIndex,
            validationState: {
              ...state.validationState,
              isFlightValid: isValid,
              stepValidation: {
                ...state.validationState.stepValidation,
                [state.currentPhase]: isValid,
              },
              [state.currentPhase]: isValid,
              _timestamp: Date.now(),
            },
            _lastUpdate: Date.now(),
          };
        });
      },

      setFlightSegments: (segments: FlightSlice['flightSegments']) =>
        set((state) => {
          // Skip update if nothing has changed
          if (
            JSON.stringify(state.flightSegments) === JSON.stringify(segments)
          ) {
            return state;
          }

          // Get all valid selected flights from the new segments, maintaining order
          const updatedSelectedFlights = segments
            .map((segment) => segment.selectedFlight)
            .filter((flight): flight is Flight => flight !== null);

          // Create new state with updated segments and selected flights
          const newState = {
            ...state,
            flightSegments: segments,
            selectedFlights: updatedSelectedFlights,
            selectedFlight:
              updatedSelectedFlights[state.currentSegmentIndex] || null,
            // Reset currentSegmentIndex if it's out of bounds
            currentSegmentIndex: Math.min(
              state.currentSegmentIndex,
              segments.length - 1
            ),
          };

          // Run validation with new state
          const isValid = validateFlightSelection(newState);

          // Return updated state with validation results
          return {
            ...newState,
            validationState: {
              ...state.validationState,
              isFlightValid: isValid,
              stepValidation: {
                ...state.validationState.stepValidation,
                1: isValid,
              },
              1: isValid,
              _timestamp: Date.now(),
            },
            completedSteps: isValid
              ? Array.from(new Set([...state.completedSteps, 1])).sort(
                  (a, b) => a - b
                )
              : state.completedSteps.filter((step) => step !== 1),
            _lastUpdate: Date.now(),
          };
        }),

      validateFlightSelection: () => {
        const state = get();
        const isValid = validateFlightSelection(state);

        // Update validation state
        set((state) => {
          const newValidationState = {
            ...state.validationState,
            isFlightValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: isValid,
            },
            1: isValid,
          };

          // Calculate new completed steps
          const newCompletedSteps = isValid
            ? Array.from(new Set([...state.completedSteps, 1]))
            : state.completedSteps.filter((step) => step !== 1);

          // Save validation state to localStorage if in phase 3
          if (state.currentPhase === 3 && typeof window !== 'undefined') {
            localStorage.setItem(
              'phase3ValidationState',
              JSON.stringify(newValidationState)
            );
          }

          // Return updated state
          return {
            ...state,
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
          };
        });

        return isValid;
      },

      validateBookingNumber: () => {
        const state = get();

        // Only validate booking number in phase 3
        if (state.currentPhase !== 3) {
          return;
        }

        // Get validation result
        const isValid = validateBookingNumber(state);

        // Preserve existing validation state
        const existingValidationState = { ...state.validationState };
        const existingCompletedSteps = [...state.completedSteps];

        // Create new validation state while preserving other validations
        const newValidationState = {
          ...existingValidationState,
          isBookingValid: isValid,
          stepValidation: {
            ...existingValidationState.stepValidation,
            2: isValid,
          },
          2: isValid,
          // Add timestamp to force re-render
          _timestamp: Date.now(),
        };

        // Calculate new completed steps while preserving existing ones
        const newCompletedSteps = isValid
          ? Array.from(new Set([...existingCompletedSteps, 2])).sort(
              (a, b) => a - b
            )
          : existingCompletedSteps.filter((step) => step !== 2);

        // Save validation state to localStorage for phase 3
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'phase3ValidationState',
            JSON.stringify(newValidationState)
          );
        }

        // Update state atomically
        set({
          validationState: newValidationState,
          completedSteps: newCompletedSteps,
          _lastUpdate: Date.now(),
        });
      },

      shouldRecalculateCompensation: () => {
        const state = get();
        return shouldRecalculateCompensation(state);
      },

      setCompensationCache: (cache: CompensationCache) =>
        set({ compensationCache: cache }),

      setCompensationAmount: (amount: number | null) =>
        set({ compensationAmount: amount }),

      setCompensationLoading: (loading: boolean) =>
        set({ compensationLoading: loading }),

      setCompensationError: (error: string | null) =>
        set({ compensationError: error }),

      setPersonalDetails: (details: PassengerDetails | null) => {
        const state = get();

        // Skip update if details haven't changed
        if (JSON.stringify(state.personalDetails) === JSON.stringify(details)) {
          return;
        }

        // Get the step ID based on the current phase
        const stepId =
          state.currentPhase === URL_TO_PHASE['/phases/claim-success'] ||
          state.currentPhase === URL_TO_PHASE['/phases/agreement']
            ? 1 // Step 1 in claim success and agreement phases
            : 3; // Step 3 in phase 1 (initial assessment)

        // If details is null, only reset personal details and preserve other validation state
        if (!details) {
          const newValidationState = {
            ...state.validationState,
            isPersonalValid: false,
            stepValidation: {
              ...state.validationState.stepValidation,
              [stepId]: false,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [stepId]: false,
            },
            [stepId]: false,
            fieldErrors: {},
            _timestamp: Date.now(),
          };

          // Update state atomically
          set({
            personalDetails: null,
            validationState: newValidationState,
            _lastUpdate: Date.now(),
          });

          return;
        }

        // Track validation details
        const validationDetails = {
          hasBasicFields: false,
          hasValidEmail: false,
          hasClaimSuccessFields: false,
        };

        // Track field-level errors
        const fieldErrors: Record<string, string> = {};

        // Basic required fields for all phases
        const basicFields = [
          'salutation',
          'firstName',
          'lastName',
          'email',
        ] as const;
        validationDetails.hasBasicFields = basicFields.every(
          (field) => !!details[field as keyof PassengerDetails]?.trim()
        );

        // Add field-level errors for basic fields
        basicFields.forEach((field) => {
          if (!details[field as keyof PassengerDetails]?.trim()) {
            fieldErrors[field] = 'This field is required';
          }
        });

        // Email validation
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        validationDetails.hasValidEmail = !!(
          details.email && emailRegex.test(details.email)
        );
        if (details.email && !emailRegex.test(details.email)) {
          fieldErrors.email = 'Please enter a valid email address';
        }

        // Additional fields required for claim success and agreement phases
        const isClaimSuccessPhase =
          state.currentPhase === URL_TO_PHASE['/phases/claim-success'] ||
          state.currentPhase === URL_TO_PHASE['/phases/agreement'];

        if (isClaimSuccessPhase) {
          const claimSuccessFields = [
            'phone',
            'address',
            'postalCode',
            'city',
            'country',
          ] as const;
          validationDetails.hasClaimSuccessFields = claimSuccessFields.every(
            (field) => !!details[field as keyof PassengerDetails]?.trim()
          );

          // Add field-level errors for claim success fields
          claimSuccessFields.forEach((field) => {
            if (!details[field as keyof PassengerDetails]?.trim()) {
              fieldErrors[field] = 'This field is required';
            }
          });
        } else {
          validationDetails.hasClaimSuccessFields = true;
        }

        // Calculate final validation state
        const isValid =
          validationDetails.hasBasicFields &&
          validationDetails.hasValidEmail &&
          validationDetails.hasClaimSuccessFields;

        // Check if any field has been filled out to determine interaction
        const hasInteracted = Object.values(details).some((value) =>
          value?.trim()
        );

        // Skip validation state update if nothing has changed
        const currentValidationState = state.validationState;
        if (
          currentValidationState.isPersonalValid === isValid &&
          currentValidationState.stepValidation[stepId] === isValid &&
          currentValidationState.stepInteraction[stepId] === hasInteracted &&
          currentValidationState[stepId] === isValid &&
          JSON.stringify(currentValidationState.fieldErrors) ===
            JSON.stringify(fieldErrors)
        ) {
          // Only update personal details if they've changed
          set({
            personalDetails: details,
            _lastUpdate: Date.now(),
          });
          return;
        }

        // Update validation state
        const newValidationState = {
          ...state.validationState,
          isPersonalValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            [stepId]: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            [stepId]: hasInteracted,
          },
          [stepId]: isValid,
          fieldErrors,
          _timestamp: Date.now(),
        };

        // Calculate new completed steps - only if both valid and interacted
        const newCompletedSteps = [...state.completedSteps];
        if (isValid && hasInteracted && !newCompletedSteps.includes(stepId)) {
          newCompletedSteps.push(stepId);
          newCompletedSteps.sort((a, b) => a - b);
        } else if (!isValid || !hasInteracted) {
          const index = newCompletedSteps.indexOf(stepId);
          if (index !== -1) {
            newCompletedSteps.splice(index, 1);
          }
        }

        // Update state
        set({
          personalDetails: details,
          validationState: newValidationState,
          completedSteps: newCompletedSteps,
          _lastUpdate: Date.now(),
        });
      },

      setTermsAccepted: (accepted: boolean) => {
        set((state) => {
          // Determine which step to validate based on phase
          const step = state.currentPhase === 1 ? 4 : 2;

          // Check both terms and privacy policy
          const isValid = accepted && state.privacyAccepted;

          // Create new validation state
          const newValidationState = {
            ...state.validationState,
            isTermsValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              [step]: isValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [step]: true,
            },
            [step]: isValid,
            _timestamp: Date.now(),
          };

          // Calculate new completed steps
          const newCompletedSteps = isValid
            ? Array.from(new Set([...state.completedSteps, step])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((s) => s !== step);

          // Return updated state
          return {
            ...state,
            termsAccepted: accepted,
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
            _lastUpdate: Date.now(),
          };
        });
      },

      setPrivacyAccepted: (accepted: boolean) => {
        set((state) => {
          // Determine which step to validate based on phase
          const step = state.currentPhase === 1 ? 4 : 2;

          // Check both terms and privacy policy
          const isValid = state.termsAccepted && accepted;

          // Create new validation state
          const newValidationState = {
            ...state.validationState,
            isTermsValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              [step]: isValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [step]: true,
            },
            [step]: isValid,
            _timestamp: Date.now(),
          };

          // Calculate new completed steps
          const newCompletedSteps = isValid
            ? Array.from(new Set([...state.completedSteps, step])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((s) => s !== step);

          // Return updated state
          return {
            ...state,
            privacyAccepted: accepted,
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
            _lastUpdate: Date.now(),
          };
        });
      },

      setMarketingAccepted: (accepted: boolean) =>
        set({ marketingAccepted: accepted }),

      validateTerms: () => {
        const state = get();
        const isValid = !!(state.termsAccepted && state.privacyAccepted);
        const step = state.currentPhase === 1 ? 4 : 2; // Use step 4 for phase 1, step 2 for others

        set((state) => ({
          ...state,
          validationState: {
            ...state.validationState,
            isTermsValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              [step]: isValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [step]: true,
            },
            [step]: isValid,
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, step])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((s) => s !== step),
        }));

        return isValid;
      },

      isStepValid: (step: ValidationStateSteps) => {
        const state = get();
        console.log('=== Checking Step Validity ===');
        console.log('Step:', step);
        console.log('Current phase:', state.currentPhase);
        console.log('Validation state:', state.validationState);
        const result = checkStepValidity(state)(step);
        console.log('Step validity result:', result);
        console.log('=== End Step Validity Check ===');
        return result;
      },

      validatePersonalDetails: () => {
        const state = get();
        return validatePersonalDetails(state);
      },

      validateWizardTerms: () => {
        const state = get();
        const isValid = state.termsAccepted && state.privacyAccepted;
        const currentStep = Object.values(state.wizardCurrentSteps)[0] || 0;

        set((state) => ({
          wizardValidationState: {
            ...state.wizardValidationState,
            [currentStep]: isValid,
          },
          wizardIsValid: isValid,
        }));

        return isValid;
      },

      validateTripExperience: () => {
        const state = get();
        const isValid = validateTripExperience(state);

        // Update validation state
        set((state) => ({
          validationState: {
            ...state.validationState,
            stepValidation: {
              ...state.validationState.stepValidation,
              2: isValid,
            },
            2: isValid,
            _timestamp: Date.now(),
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, 2])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((step) => step !== 2),
        }));

        return isValid;
      },

      validateInformedDate: () => {
        const state = get();
        const isValid = validateInformedDate(state);

        // Update validation state
        set((state) => ({
          validationState: {
            ...state.validationState,
            stepValidation: {
              ...state.validationState.stepValidation,
              3: isValid,
            },
            3: isValid,
            _timestamp: Date.now(),
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, 3])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((step) => step !== 3),
        }));

        return isValid;
      },

      handleTripExperienceComplete: () => {
        console.log('=== Handling Trip Experience Complete ===');
        const state = get();
        const isValid = validateTripExperience(state);

        // Check if we need to clear selected flights
        const travelStatus = state.wizardAnswers.find(
          (a) => a.questionId === 'travel_status'
        )?.value;
        const shouldClearFlights =
          travelStatus === 'none' || travelStatus === 'self';

        console.log('Trip Experience Validation:', {
          isValid,
          wizardAnswers: state.wizardAnswers,
          selectedFlights: state.selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
          })),
          travelStatus,
          shouldClearFlights,
        });

        // Create new validation state that preserves both QA sections
        const newValidationState = {
          ...state.validationState,
          isWizardValid: state.validationState.isWizardValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            2: isValid,
            3: state.validationState.stepValidation[3], // Preserve second QA
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            2: true,
            3: state.validationState.stepInteraction[3], // Preserve second QA
          },
          2: isValid,
          3: state.validationState[3], // Preserve second QA
          _timestamp: Date.now(),
        };

        console.log('New validation state:', newValidationState);

        // Save validation state to localStorage for phase 4
        if (typeof window !== 'undefined' && state.currentPhase === 4) {
          localStorage.setItem(
            'phase4ValidationState',
            JSON.stringify(newValidationState)
          );
          console.log('Saved Phase 4 validation state to localStorage');
        }

        // Update state with cleared flights if needed
        set((state) => ({
          ...state,
          validationState: newValidationState,
          selectedFlights: shouldClearFlights ? [] : state.selectedFlights,
          _lastUpdate: Date.now(),
        }));

        return isValid;
      },

      handleInformedDateComplete: () => {
        console.log('=== Handling Informed Date Complete ===');
        const state = get();
        const isValid = validateInformedDate(state);

        console.log('Informed Date Validation:', {
          isValid,
          wizardAnswers: state.wizardAnswers,
        });

        // Create new validation state that preserves both QA sections
        const newValidationState = {
          ...state.validationState,
          isWizardValid: state.validationState.isWizardValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            2: state.validationState.stepValidation[2], // Preserve first QA
            3: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            2: state.validationState.stepInteraction[2], // Preserve first QA
            3: true,
          },
          2: state.validationState[2], // Preserve first QA
          3: isValid,
          _timestamp: Date.now(),
        };

        console.log('New validation state:', newValidationState);

        // Save validation state to localStorage for phase 4
        if (typeof window !== 'undefined' && state.currentPhase === 4) {
          localStorage.setItem(
            'phase4ValidationState',
            JSON.stringify(newValidationState)
          );
          console.log('Saved Phase 4 validation state to localStorage');
        }

        // Update state
        set((state) => {
          const newState = {
            validationState: newValidationState,
            completedSteps: isValid
              ? Array.from(new Set([...state.completedSteps, 3])).sort(
                  (a, b) => a - b
                )
              : state.completedSteps.filter((step) => step !== 3),
            completedWizards: {
              ...state.completedWizards,
              informed_date: isValid,
            },
            _lastUpdate: Date.now(),
          };
          console.log('Updated store state:', newState);
          return newState;
        });

        console.log('=== End Handling Informed Date Complete ===');
      },

      canProceedToNextPhase: () => {
        const state = get();

        // For phase 1 (initial assessment)
        if (state.currentPhase === 1) {
          // Check if all required steps are valid
          const flightValid = state.validationState.isFlightValid;
          const wizardValid = state.validationState.isWizardValid;
          const personalValid = state.validationState.isPersonalValid;
          const termsValid = state.validationState.isTermsValid;

          return flightValid && wizardValid && personalValid && termsValid;
        }

        // For phase 4 (trip experience)
        if (state.currentPhase === 4) {
          const tripExperienceValid = state.wizardAnswers.some((a) =>
            a.questionId.startsWith('travel_status_')
          );
          const informedDateValid = state.wizardAnswers.some((a) =>
            a.questionId.startsWith('informed_date_')
          );
          return tripExperienceValid && informedDateValid;
        }

        // Default to true for other phases
        return true;
      },

      setSignature: (signature: string) => {
        const state = get();
        const newState = {
          ...state,
          signature,
        };

        // Run validation
        const isValid = validateSignature(newState);

        set({
          ...newState,
          validationState: {
            ...state.validationState,
            isSignatureValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              4: isValid,
            },
            4: isValid,
          },
        });
      },

      setHasSignature: (hasSignature: boolean) => {
        const state = get();
        const newState = {
          ...state,
          hasSignature,
        };

        // Run validation
        const isValid = validateSignature(newState);

        set({
          ...newState,
          validationState: {
            ...state.validationState,
            isSignatureValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              4: isValid,
            },
            4: isValid,
          },
        });
      },

      validateSignature: () => {
        const state = get();
        const isValid = validateSignature(state);

        set((state) => ({
          ...state,
          validationState: {
            ...state.validationState,
            isSignatureValid: isValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              4: isValid,
            },
            4: isValid,
          },
        }));

        return isValid;
      },

      updateValidationState: (updates: Partial<ValidationState>) => {
        set((state) => {
          // Deep compare the current validation state with the updates
          const hasChanges = Object.entries(updates).some(([key, value]) => {
            if (key === 'stepValidation' || key === 'stepInteraction') {
              return Object.entries(
                value as Record<ValidationStateSteps, boolean>
              ).some(([stepId, stepValue]) => {
                const numericKey = Number(stepId) as ValidationStateSteps;
                return state.validationState[key][numericKey] !== stepValue;
              });
            }
            if (key === 'fieldErrors') {
              return (
                JSON.stringify(state.validationState[key]) !==
                JSON.stringify(value)
              );
            }
            return (
              state.validationState[key as keyof ValidationState] !== value
            );
          });

          // Only update if there are actual changes
          if (!hasChanges) {
            return state;
          }

          return {
            ...state,
            validationState: {
              ...state.validationState,
              ...updates,
              _timestamp: Date.now(),
            },
          };
        });
      },

      setEvaluationResult: (result: CompensationSlice['evaluationResult']) =>
        set((state) => ({
          ...state,
          evaluationResult: result,
        })),

      setLocationError: (error: string | null) =>
        set((state) => ({
          ...state,
          locationError: error,
        })),

      clearLocationError: () =>
        set((state) => ({
          ...state,
          locationError: null,
        })),

      resetStore: () =>
        set(() => ({
          ...initialState,
          _lastUpdate: Date.now(),
        })),

      showLoading: () => set({ isLoading: true }),
      hideLoading: () => set({ isLoading: false }),
      setLastAnsweredQuestion: (questionId: string | null) =>
        set((state) => ({
          ...state,
          lastAnsweredQuestion: questionId,
          _lastUpdate: Date.now(),
        })),
      setSearchModalOpen: (isOpen: boolean) =>
        set({ isSearchModalOpen: isOpen }),
      setSearchTerm: (term: string) => set({ searchTerm: term }),
      setDisplayedFlights: (flights: Flight[]) =>
        set({ displayedFlights: flights }),
      setAllFlights: (flights: Flight[]) => set({ allFlights: flights }),
      setFlightSearchLoading: (loading: boolean) => set({ loading }),
      setFlightErrorMessage: (message: string | null) =>
        set({ errorMessage: message }),
      setFlightErrorMessages: (messages: {
        from?: string;
        to?: string;
        date?: string;
      }) =>
        set((state) => ({
          errorMessages: {
            ...state.errorMessages,
            ...messages,
          },
        })),
      clearFlightErrors: () =>
        set({
          errorMessage: null,
          errorMessages: {},
        }),
      setOpenSteps: (steps: number[]) => set({ openSteps: steps }),
      setOriginalFlights: (flights: Flight[]) =>
        set((state) => {
          // Skip update if nothing has changed
          if (
            JSON.stringify(state.originalFlights) === JSON.stringify(flights)
          ) {
            return state;
          }

          return {
            ...state,
            originalFlights: flights,
            _lastUpdate: Date.now(),
          };
        }),
    }),
    {
      name: 'captain-frank-store',
      storage: createJSONStorage(() => sessionStorage),
      onRehydrateStorage: () => (state) => {
        // Only set initialization flags if state exists
        if (state && !state._lastUpdate) {
          state.isInitializing = false;
          state._lastUpdate = Date.now();
        }
      },
    }
  )
);
// Add StoreStateValues type
export type StoreStateValues = Omit<StoreState, keyof StoreActions> & {
  _lastUpdate?: number;
};

// Selector hooks with shallow comparison
export const useWizardState = () => {
  const state = useStore((state) => ({
    wizardAnswers: state.wizardAnswers,
    wizardCurrentSteps: state.wizardCurrentSteps,
    wizardIsCompleted: state.wizardIsCompleted,
    wizardIsValid: state.wizardIsValid,
    completedWizards: state.completedWizards,
    wizardShowingSuccess: state.wizardShowingSuccess,
    wizardSuccessMessage: state.wizardSuccessMessage,
    wizardIsEditingMoney: state.wizardIsEditingMoney,
    wizardLastActiveStep: state.wizardLastActiveStep,
    wizardValidationState: state.wizardValidationState,
    wizardIsValidating: state.wizardIsValidating,
    lastAnsweredQuestion: state.lastAnsweredQuestion,
    tripExperienceAnswers: state.wizardAnswers.filter((answer: Answer) =>
      answer.questionId.startsWith('travel_status_')
    ),
  }));

  const actions = useStore((state) => ({
    setWizardAnswers: state.setWizardAnswers,
    setWizardShowingSuccess: state.setWizardShowingSuccess,
    validateAndUpdateStep: state.validateAndUpdateStep,
    setWizardValidationState: state.setWizardValidationState,
    batchUpdateWizardState: state.batchUpdateWizardState,
    markWizardComplete: state.markWizardComplete,
    isWizardCompleted: state.isWizardCompleted,
  }));

  return {
    ...state,
    ...actions,
  };
};

// Add type for the wizard state
export interface WizardStateType {
  wizardAnswers: Answer[];
  wizardCurrentSteps: Record<string, number>;
  wizardIsCompleted: boolean;
  wizardIsValid: boolean;
  completedWizards: Record<string, boolean>;
  wizardShowingSuccess: boolean;
  wizardSuccessMessage: string;
  wizardIsEditingMoney: boolean;
  wizardLastActiveStep: number | null;
  wizardValidationState: Record<string, boolean>;
  wizardIsValidating: boolean;
  lastAnsweredQuestion: string | null;
  tripExperienceAnswers: Answer[];
  setWizardAnswers: (answers: Answer[]) => void;
  setWizardShowingSuccess: (showing: boolean) => void;
  validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => void;
  setWizardValidationState: (state: Record<string, boolean>) => void;
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
  markWizardComplete: (wizardId: string) => void;
  isWizardCompleted: (wizardId: string) => boolean;
}

export const validateBookingNumber = (state: StoreStateValues): boolean => {
  // Only validate booking number in phase 3
  if (state.currentPhase !== 3) {
    return false;
  }

  // Don't validate if booking number is not set
  if (!state.bookingNumber) {
    return false;
  }

  // Booking number should be at least 6 characters long and alphanumeric
  const bookingNumber = state.bookingNumber.trim();
  const isValid =
    bookingNumber.length >= 6 && /^[A-Z0-9]+$/i.test(bookingNumber);

  // Preserve existing validation state
  const existingValidationState = { ...state.validationState };
  const existingCompletedSteps = [...state.completedSteps];

  // Create new validation state while preserving other validations
  const newValidationState = {
    ...existingValidationState,
    isBookingValid: isValid,
    stepValidation: {
      ...existingValidationState.stepValidation,
      2: isValid,
    },
    2: isValid,
    // Add timestamp to force re-render
    _timestamp: Date.now(),
  };

  // Update state without openSteps
  state.validationState = newValidationState;
  state.completedSteps = existingCompletedSteps;
  state._lastUpdate = Date.now();

  return isValid;
};

export const validateTripExperience = (state: StoreStateValues): boolean => {
  console.log('=== validateTripExperience START ===');

  // Get all travel status related answers
  const answers = state.wizardAnswers.filter((a) =>
    a.questionId.startsWith('travel_status')
  );

  console.log('Travel status answers:', answers);

  // Check if we have the main travel status answer with a valid value
  const validTravelStatuses = [
    'none',
    'self',
    'provided',
    'took_alternative_own',
  ];
  const travelStatus = answers.find(
    (a) => a.questionId === 'travel_status'
  )?.value;

  const hasTravelStatus = Boolean(
    travelStatus && validTravelStatuses.includes(String(travelStatus))
  );

  console.log('Travel status validation:', {
    travelStatus,
    hasTravelStatus,
    selectedFlights: state.selectedFlights?.map((f) => ({
      id: f.id,
      flightNumber: f.flightNumber,
    })),
  });

  // For 'provided' or 'took_alternative_own' status, also check if flights are selected
  let isValid = hasTravelStatus;
  if (
    hasTravelStatus &&
    (travelStatus === 'provided' || travelStatus === 'took_alternative_own')
  ) {
    const hasSelectedFlight =
      state.selectedFlights && state.selectedFlights.length > 0;
    const hasAlternativeFlightAnswer = answers.some(
      (a) =>
        (a.questionId === 'alternative_flight_airline_expense' &&
          travelStatus === 'provided') ||
        (a.questionId === 'alternative_flight_own_expense' &&
          travelStatus === 'took_alternative_own')
    );
    isValid = hasSelectedFlight && hasAlternativeFlightAnswer;
  }

  console.log('=== validateTripExperience END ===', {
    isValid,
    travelStatus,
    hasFlights: state.selectedFlights?.length > 0,
  });
  return isValid;
};

export const validateInformedDate = (state: StoreStateValues): boolean => {
  console.log('=== validateInformedDate START ===');

  // Get all informed date related answers
  const answers = state.wizardAnswers.filter((a) =>
    a.questionId.startsWith('informed_date')
  );

  console.log('Informed date answers:', answers);

  // Check if we have the main informed date answer
  const hasInformedDate = answers.some(
    (a) => a.questionId === 'informed_date' && a.value
  );
  const informedDate = answers
    .find((a) => a.questionId === 'informed_date')
    ?.value?.toString();

  let informedDateValid = hasInformedDate;

  console.log('Initial informed date validation:', {
    hasInformedDate,
    informedDate,
    informedDateValid,
  });

  // Handle different date cases
  if (informedDate === 'on_departure') {
    // For on_departure, we just need to have a booked flight with a date
    informedDateValid =
      state.originalFlights.length > 0 &&
      state.originalFlights[0]?.date != null;

    console.log('On departure validation:', {
      hasOriginalFlights: state.originalFlights.length > 0,
      firstFlightDate: state.originalFlights[0]?.date,
      informedDateValid,
    });
  } else if (informedDate === 'specific_date') {
    const specificDate = answers
      .find((a) => a.questionId === 'specific_informed_date')
      ?.value?.toString();

    console.log('Specific date validation:', { specificDate });

    // Check if we have a specific date value
    if (!specificDate) {
      console.log('=== validateInformedDate END ===', { isValid: false });
      return false;
    }

    // Validate the date format
    try {
      const date = parseISO(specificDate);
      informedDateValid = isValid(date);
      console.log('Date format validation:', {
        parsedDate: date,
        isValid: informedDateValid,
      });
    } catch (e) {
      console.error('Date parsing error:', e);
      informedDateValid = false;
    }
  }

  console.log('=== validateInformedDate END ===', {
    isValid: informedDateValid,
  });
  return informedDateValid;
};

// Add validateFlightTimes function at the top
export const validateFlightTimes = (
  currentFlight: Flight,
  nextFlight: Flight
): boolean => {
  if (!currentFlight || !nextFlight) return false;

  const currentArrivalTime = new Date(
    `${currentFlight.date}T${currentFlight.arrivalTime}:00.000Z`
  );
  const nextDepartureTime = new Date(
    `${nextFlight.date}T${nextFlight.departureTime}:00.000Z`
  );

  // Check if dates are in chronological order
  if (nextDepartureTime <= currentArrivalTime) {
    return false;
  }

  // Check minimum connection time (30 minutes)
  const timeDiff = nextDepartureTime.getTime() - currentArrivalTime.getTime();
  return timeDiff >= 1800000; // 30 minutes in milliseconds
};

// Add separate transform functions for single objects and arrays
export const transformDatesSingle = (data: FlightSegment): FlightSegment => ({
  ...data,
  date: data.date ? new Date(data.date) : null,
});

export const transformDatesArray = (data: FlightSegment[]): FlightSegment[] =>
  data.map((item) => ({
    ...item,
    date: item.date ? new Date(item.date) : null,
  }));

// Add helper function to get phase from URL
export const getPhaseFromUrl = (url: string): number => {
  // Remove language prefix if present
  const normalizedUrl = url.replace(/^\/[a-z]{2}/, '');
  return URL_TO_PHASE[normalizedUrl] || 1;
};

// Add a new function to initialize validation state from storage
export const initializeValidationState = (state: StoreStateValues) => {
  if (typeof window === 'undefined') return;

  // Check if already initialized to prevent multiple initializations
  if (state._lastUpdate) return;

  try {
    // Restore validation state
    const savedValidationState = localStorage.getItem(
      'initialAssessmentValidation'
    );
    const savedCompletedSteps = localStorage.getItem(
      'initialAssessmentCompletedSteps'
    );

    // Initialize with default validation state
    state.validationState = {
      isPersonalValid: false,
      isFlightValid: false,
      isBookingValid: false,
      isWizardValid: false,
      isTermsValid: false,
      isSignatureValid: false,
      isWizardSubmitted: false,
      isValidating: false,
      stepValidation: {
        1: true, // Always enable first step
        2: false,
        3: false,
        4: false,
        5: false,
      },
      stepInteraction: {
        1: true, // Always enable first step interaction
        2: false,
        3: false,
        4: false,
        5: false,
      },
      fieldErrors: {},
      transitionInProgress: false,
      _timestamp: Date.now(),
    };

    // Merge with saved state if exists
    if (savedValidationState) {
      const parsedValidation = JSON.parse(savedValidationState);
      state.validationState = {
        ...state.validationState,
        ...parsedValidation,
        stepValidation: {
          ...state.validationState.stepValidation,
          ...parsedValidation.stepValidation,
          1: true, // Always enable first step
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          ...parsedValidation.stepInteraction,
          1: true, // Always enable first step interaction
        },
      };
    }

    if (savedCompletedSteps) {
      const parsedSteps = JSON.parse(savedCompletedSteps);
      state.completedSteps = parsedSteps;
    }

    // Set last update to prevent multiple initializations
    state._lastUpdate = Date.now();
  } catch (error) {
    console.error('Error initializing validation state:', error);
  }
};

// ... existing code ...

export interface LocationData {
  value: string;
  label: string;
  description?: string;
  city?: string;
  dropdownLabel: string;
}

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  city?: string;
  dropdownLabel: string;
}

export interface SearchResult {
  value: string;
  label: string;
  description?: string;
  city?: string;
  dropdownLabel: string;
}
