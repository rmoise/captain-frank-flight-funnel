import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import type { LocationLike } from '@/types/location';
import { formatDateToYYYYMMDD, isValidYYYYMMDD } from '@/utils/dateUtils';
import { parseISO, isValid } from 'date-fns';

// Add FlightSegment type definition at the top of the file
export type FlightSegment = {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  date: Date | null;
  selectedFlight: Flight | null;
};

// Add validation helper functions
export const validateFlightSelection = (state: StoreStateValues): boolean => {
  try {
    let isValid = false;

    if (state.selectedType === 'direct') {
      // For phase 1, validate if both locations are filled
      if (state.currentPhase === 1) {
        isValid = !!(
          state.directFlight.fromLocation && state.directFlight.toLocation
        );
      } else {
        // For other phases, require selected flight
        isValid = !!state.directFlight.selectedFlight;
      }
    } else {
      // For multi-city flights
      const segments = state.flightSegments;

      if (state.currentPhase === 1) {
        // For phase 1, validate if first segment has both locations
        isValid = !!(
          segments.length >= 2 &&
          segments[0]?.fromLocation &&
          segments[0]?.toLocation
        );
      } else {
        // For other phases, check if we have all segments and flights
        const hasAllSegments = segments.length >= 2;
        const hasAllFlights = segments.every(
          (segment) => !!segment.selectedFlight
        );

        if (!hasAllSegments || !hasAllFlights) {
          isValid = false;
        } else {
          // Validate flight times between consecutive segments
          isValid = segments.every((segment, index) => {
            if (index === segments.length - 1) return true;
            return validateFlightTimes(
              segment.selectedFlight!,
              segments[index + 1].selectedFlight!
            );
          });
        }
      }
    }

    // Create a new validation state object
    const newValidationState: ValidationState = {
      ...state.validationState,
      isFlightValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        1: isValid,
      },
      1: isValid,
      _timestamp: Date.now(),
    };

    // Create a new completed steps array
    const newCompletedSteps = isValid
      ? Array.from(new Set([...state.completedSteps, 1])).sort((a, b) => a - b)
      : state.completedSteps.filter((step) => step !== 1);

    // Create a new open steps array
    const newOpenSteps = Array.from(new Set([...state.openSteps, 1]));

    // Update the state immutably
    state.validationState = newValidationState;
    state.completedSteps = newCompletedSteps;
    state.openSteps = newOpenSteps;
    state._lastUpdate = Date.now();

    return isValid;
  } catch (error) {
    console.error('Error in validateFlightSelection:', error);
    return false;
  }
};

export const validateQAWizard = (state: StoreStateValues) => {
  const answers = state.wizardAnswers || [];

  // Check if we have any answers at all
  if (answers.length === 0) {
    return {
      isValid: false,
      answers: [],
      bookingNumber: state.bookingNumber || '',
    };
  }

  // Get the first answer's questionId to identify the wizard
  const wizardId = answers[0]?.questionId;
  if (!wizardId) {
    return {
      isValid: false,
      answers: [],
      bookingNumber: state.bookingNumber || '',
    };
  }

  // Check if all visible questions have valid answers
  const hasValidAnswers = answers.every((answer: Answer) => {
    // Skip validation for questions that shouldn't be shown
    if (answer.shouldShow === false) return true;

    // Validate the answer value
    const value = answer?.value;
    if (value === undefined || value === null) return false;
    if (typeof value === 'string' && value.trim() === '') return false;
    if (typeof value === 'number' && value <= 0) return false;
    if (Array.isArray(value) && value.length === 0) return false;
    if (typeof value === 'boolean' && !value) return false;

    return true;
  });

  // Return valid only if we have answers and they're all valid
  const isValid = answers.length > 0 && hasValidAnswers;

  // Update validation state - only check signature in agreement phase
  state.validationState = {
    ...state.validationState,
    isWizardValid: isValid,
    stepValidation: {
      ...state.validationState.stepValidation,
      2: isValid,
    },
    stepInteraction: {
      ...state.validationState.stepInteraction,
      2: true, // Set interaction state to true since we have answers
    },
    2: isValid,
    // Only consider signature validation in agreement phase
    isSignatureValid:
      state.currentPhase === URL_TO_PHASE['/phases/agreement']
        ? !!(state.signature && state.hasSignature)
        : true,
  };

  // Update completed steps
  if (isValid && !state.completedSteps.includes(2)) {
    state.completedSteps.push(2);
    state.completedSteps.sort((a, b) => a - b);
  } else if (!isValid) {
    state.completedSteps = state.completedSteps.filter((step) => step !== 2);
  }

  return {
    isValid,
    answers,
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
    personalDetails.email?.trim()
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
        personalDetails.zipCode?.trim() &&
        personalDetails.city?.trim() &&
        personalDetails.country?.trim()
      )
    : true;

  const isValid = hasBasicFields && hasValidEmail && hasClaimSuccessFields;

  // Check if any field has been filled out to determine interaction
  const hasInteracted = Object.values(personalDetails).some((value) =>
    value?.trim()
  );

  // Get the step ID based on the phase
  const stepId = isClaimSuccessPhase ? 1 : 3;

  // Update validation state
  state.validationState = {
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
    _timestamp: Date.now(),
  };

  // Update completed steps - only if both valid and interacted
  if (isValid && hasInteracted && !state.completedSteps.includes(stepId)) {
    state.completedSteps = Array.from(
      new Set([...state.completedSteps, stepId])
    ).sort((a, b) => a - b);
  } else if (!isValid || !hasInteracted) {
    state.completedSteps = state.completedSteps.filter(
      (step) => step !== stepId
    );
  }

  return isValid;
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
      : state.completedSteps.filter((step) => step !== 2),
  }));

  return isValid;
};

export const validateSignature = (state: StoreStateValues): boolean => {
  return !!(state.signature && state.hasSignature);
};

// Single implementation of step validation
export const checkStepValidity =
  (state: StoreStateValues) =>
  (step: ValidationStateSteps): boolean => {
    // For step 1, always use isFlightValid
    if (step === 1) {
      // In phase 5 (claim success), check both validation and interaction
      if (state.currentPhase === URL_TO_PHASE['/phases/claim-success']) {
        return !!(
          state.validationState?.isPersonalValid &&
          state.validationState?.stepInteraction?.[step]
        );
      }
      return state.validationState?.isFlightValid || false;
    }

    // For other steps, check both step validation, numeric index, and interaction state
    return !!(
      state.validationState?.[step] &&
      state.validationState?.stepValidation?.[step] &&
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
export type ValidationState = {
  isFlightValid: boolean;
  isWizardValid: boolean;
  isPersonalValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isBookingValid: boolean;
  stepValidation: Record<ValidationStateSteps, boolean>;
  stepInteraction: Record<ValidationStateSteps, boolean>;
  fieldErrors: Record<string, string>;
  [key: number]: boolean;
  _timestamp?: number;
};

// Export ValidationStateSteps type
export type ValidationStateSteps = 1 | 2 | 3 | 4;

export const initialValidationState: ValidationState = {
  isFlightValid: false,
  isWizardValid: false,
  isPersonalValid: false,
  isTermsValid: false,
  isSignatureValid: true,
  isBookingValid: false,
  stepValidation: {
    1: false,
    2: false,
    3: false,
    4: false,
  },
  stepInteraction: {
    1: false,
    2: false,
    3: false,
    4: false,
  },
  fieldErrors: {},
  1: false,
  2: false,
  3: false,
  4: false,
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
  openSteps: number[];
  phasesCompletedViaContinue: number[]; // Track phases completed via continue button
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
  setOpenSteps: (steps: number[]) => void;
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
  currentStep: 1,
  completedSteps: [],
  openSteps: [1],
  phasesCompletedViaContinue: [],

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
  '/phases/compensation-estimate': 2,
  '/phases/flight-details': 3,
  '/phases/trip-experience': 4,
  '/phases/claim-success': 5,
  '/phases/claim-rejected': 5,
  '/phases/agreement': 6,
  '/phases/claim-submitted': 7,
};

export const PHASE_TO_URL: Record<number, string> = {
  1: '/phases/initial-assessment',
  2: '/phases/compensation-estimate',
  3: '/phases/flight-details',
  4: '/phases/trip-experience',
  5: '/phases/claim-success',
  6: '/phases/agreement',
  7: '/phases/claim-submitted',
};

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

// Create the store with combined type
export const useStore = create<StoreState & StoreActions>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialState,

      // Actions
      batchUpdateWizardState: (updates: Partial<StoreState>) => {
        const state = get();

        // Create new state with all updates
        const newState = {
          ...state,
          ...updates,
          _lastUpdate: Date.now(),
        };

        // Run validation with new state
        const isValid = validateFlightSelection(newState);

        // Apply all updates with validation in a single operation
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
          openSteps: Array.from(new Set([...state.openSteps, 1])),
        });
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
          openSteps: Array.from(new Set([...state.openSteps, 1])),
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

          const newAnswers = [...existingAnswers, ...formattedAnswers];

          // Return updated state
          return {
            ...state,
            wizardAnswers: newAnswers,
            _lastUpdate: Date.now(),
          };
        });
      },

      validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => {
        set((state) => ({
          validationState: {
            ...state.validationState,
            stepValidation: {
              ...state.validationState.stepValidation,
              [step]: isValid,
            },
            [step]: isValid,
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, step]))
            : state.completedSteps.filter((s) => s !== step),
        }));
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
        set({
          ...state,
          validationState: {
            ...state.validationState,
            isWizardValid: true,
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
        });

        // Store the wizard type for the timeout
        const finalWizardType = wizardType;

        // Clear success message after 3 seconds
        if (typeof window !== 'undefined') {
          window.__wizardSuccessTimeout &&
            clearTimeout(window.__wizardSuccessTimeout);
          window.__wizardSuccessTimeout = setTimeout(() => {
            const currentState = get();

            set({
              ...currentState,
              wizardSuccessStates: {
                ...currentState.wizardSuccessStates,
                [finalWizardType]: { showing: false, message: '' },
              },
            });
          }, 3000);
        }

        return true; // Return true to indicate successful completion
      },

      initializeStore: () => set({ isInitializing: false }),

      setCurrentPhase: (phase: number) => {
        const state = get();

        // When going backwards, preserve all completed phases
        const newCompletedPhases = [...state.completedPhases];
        if (phase < state.currentPhase) {
          // Keep all completed phases when going backwards
          newCompletedPhases.push(state.currentPhase);
        } else {
          // Add all phases up to but not including the current phase
          for (let i = 1; i < phase; i++) {
            if (!newCompletedPhases.includes(i)) {
              newCompletedPhases.push(i);
            }
          }
        }

        // Sort and deduplicate completed phases
        const uniqueCompletedPhases = Array.from(
          new Set(newCompletedPhases)
        ).sort((a, b) => a - b);

        // Always preserve phase 4 validation state if it was completed
        const phase4Completed = state.completedPhases.includes(4);
        const phase4StepsCompleted =
          state.completedSteps.includes(2) && state.completedSteps.includes(3);

        // If transitioning to phase 1, preserve wizard answers and validation
        if (phase === 1) {
          // Get existing validation states
          const flightValid = validateFlightSelection(state);
          const wizardValid = validateQAWizard(state).isValid;
          const personalValid = validatePersonalDetails(state);
          const termsValid = !!(state.termsAccepted && state.privacyAccepted);

          // Create new validation state while preserving existing validations
          const newValidationState = {
            ...state.validationState,
            isFlightValid: flightValid,
            isWizardValid: wizardValid,
            isPersonalValid: personalValid,
            isTermsValid: termsValid,
            stepValidation: {
              ...state.validationState.stepValidation,
              1: flightValid,
              2: phase4Completed
                ? state.validationState.stepValidation[2]
                : wizardValid,
              3: phase4Completed
                ? state.validationState.stepValidation[3]
                : personalValid,
              4: termsValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              1:
                !!state.directFlight?.selectedFlight ||
                state.selectedFlights?.length > 0,
              2: state.wizardAnswers.length > 0,
              3: personalValid,
              4: termsValid,
            },
            1: flightValid,
            2: phase4Completed ? state.validationState[2] : wizardValid,
            3: phase4Completed ? state.validationState[3] : personalValid,
            4: termsValid,
            _timestamp: Date.now(),
          };

          // Calculate new completed steps while preserving phase 4 steps if completed
          const newCompletedSteps = [
            ...(flightValid ? [1] : []),
            ...(phase4Completed && phase4StepsCompleted ? [2, 3] : []),
            ...(termsValid ? [4] : []),
          ].sort((a, b) => a - b);

          // Update state with preserved validation and wizard state
          set({
            currentPhase: phase,
            completedPhases: Array.from(new Set(uniqueCompletedPhases)).sort(
              (a, b) => a - b
            ),
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
            wizardIsValid: wizardValid,
            wizardIsCompleted: state.wizardIsCompleted,
            lastAnsweredQuestion: state.lastAnsweredQuestion,
            wizardAnswers: state.wizardAnswers,
            wizardCurrentSteps: state.wizardCurrentSteps,
            wizardValidationState: state.wizardValidationState,
            wizardLastActiveStep: state.wizardLastActiveStep,
            _lastUpdate: Date.now(),
          });
          return;
        }

        // If transitioning to phase 4 (trip experience), handle wizard state
        if (phase === 4) {
          // Get existing wizard answers
          const tripExperienceAnswers = state.wizardAnswers.filter((a) =>
            a.questionId.startsWith('travel_status_')
          );
          const informedDateAnswers = state.wizardAnswers.filter((a) =>
            a.questionId.startsWith('informed_date_')
          );

          // Check if we have valid answers
          const hasTravelStatus = tripExperienceAnswers.some(
            (a) => a.questionId === 'travel_status' && a.value
          );
          const hasInformedDate = informedDateAnswers.some(
            (a) => a.questionId === 'informed_date' && a.value
          );

          // Get last answered question
          const lastTravelStatusQuestion =
            tripExperienceAnswers.length > 0
              ? tripExperienceAnswers[tripExperienceAnswers.length - 1]
                  .questionId
              : null;
          const lastInformedDateQuestion =
            informedDateAnswers.length > 0
              ? informedDateAnswers[informedDateAnswers.length - 1].questionId
              : null;
          const lastAnsweredQuestion =
            lastInformedDateQuestion ||
            lastTravelStatusQuestion ||
            state.lastAnsweredQuestion;

          // Validate travel status and informed date
          const travelStatusValid = validateTripExperience(state);
          const informedDateValid = validateInformedDate(state);

          // Update validation state while preserving existing state
          const newValidationState = {
            ...state.validationState,
            stepValidation: {
              ...state.validationState.stepValidation,
              2: travelStatusValid,
              3: informedDateValid,
            },
            stepInteraction: {
              ...state.validationState.stepInteraction,
              2: hasTravelStatus,
              3: hasInformedDate,
            },
            2: travelStatusValid,
            3: informedDateValid,
            isWizardValid: travelStatusValid && informedDateValid,
            _timestamp: Date.now(),
          };

          // Update state with all changes
          set({
            currentPhase: phase,
            validationState: newValidationState,
            completedSteps: Array.from(
              new Set([
                ...state.completedSteps,
                ...(travelStatusValid ? [2] : []),
                ...(informedDateValid ? [3] : []),
              ])
            ).sort((a, b) => a - b),
            completedWizards: {
              ...state.completedWizards,
              travel_status: travelStatusValid,
              informed_date: informedDateValid,
            },
            wizardIsCompleted: travelStatusValid && informedDateValid,
            wizardIsValid: travelStatusValid && informedDateValid,
            wizardCurrentSteps: {
              ...state.wizardCurrentSteps,
              travel_status: hasTravelStatus ? tripExperienceAnswers.length : 0,
              informed_date: hasInformedDate ? informedDateAnswers.length : 0,
            },
            lastAnsweredQuestion,
            tripExperienceAnswers,
            _lastUpdate: Date.now(),
          });
          return;
        }

        // For other phases, preserve existing validation state
        const existingValidationState = { ...state.validationState };
        const existingCompletedSteps = [...state.completedSteps];

        // If we're in phase 1, validate terms
        if (phase === 1) {
          const store = get();
          store.validateTerms();

          // Get existing validation states
          const flightValid = validateFlightSelection(state);
          const wizardValid = existingValidationState.isWizardValid;
          const personalValid = existingValidationState.isPersonalValid;
          const termsValid = !!(state.termsAccepted && state.privacyAccepted);

          // Create new validation state while preserving existing validations
          const newValidationState = {
            ...existingValidationState,
            isFlightValid: flightValid,
            isWizardValid: wizardValid,
            isPersonalValid: personalValid,
            isTermsValid: termsValid,
            stepValidation: {
              ...existingValidationState.stepValidation,
              1: flightValid,
              2: wizardValid,
              3: personalValid,
              4: termsValid,
            },
            stepInteraction: {
              ...existingValidationState.stepInteraction,
              1:
                !!state.directFlight?.selectedFlight ||
                state.selectedFlights?.length > 0,
              2: wizardValid,
              3: personalValid,
              4: termsValid,
            },
            1: flightValid,
            2: wizardValid,
            3: personalValid,
            4: termsValid,
            _timestamp: Date.now(),
          };

          // Calculate new completed steps while preserving only properly completed phases
          const newCompletedSteps = [
            ...(flightValid ? [1] : []),
            ...(wizardValid ? [2] : []),
            ...(personalValid ? [3] : []),
            ...(termsValid ? [4] : []),
          ]
            .filter((step) => step <= 2 || state.completedPhases.includes(step))
            .sort((a, b) => a - b);

          // Update state with preserved validation
          set({
            currentPhase: phase,
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
            _lastUpdate: Date.now(),
          });
        }
        // If we're in phase 5 (claim success), validate personal details
        else if (phase === 5) {
          // Reset validation state for personal details and force revalidation
          const newValidationState = {
            ...existingValidationState,
            isPersonalValid: false,
            stepValidation: {
              ...existingValidationState.stepValidation,
              1: false,
            },
            stepInteraction: {
              ...existingValidationState.stepInteraction,
              1: false, // Explicitly reset interaction state for step 1
            },
            1: false,
            fieldErrors: {},
            _timestamp: Date.now(),
          };

          // Update state with reset validation and remove step 1 from completed steps
          set({
            currentPhase: phase,
            validationState: newValidationState,
            completedSteps: existingCompletedSteps.filter((step) => step !== 1),
            _lastUpdate: Date.now(),
          });
        }
        // For phase 3, validate booking number
        else if (phase === 3) {
          const bookingValid = validateBookingNumber(state);

          // Check flight validation
          const flightValid =
            state.selectedType === 'direct'
              ? !!state.directFlight?.selectedFlight
              : state.flightSegments?.length >= 2 &&
                state.flightSegments?.every(
                  (segment) => segment.selectedFlight
                ) &&
                state.selectedFlights?.length === state.flightSegments?.length;

          // Create new validation state while preserving existing validations
          const newValidationState = {
            ...existingValidationState,
            isBookingValid: bookingValid,
            isFlightValid: flightValid,
            stepValidation: {
              ...existingValidationState.stepValidation,
              1: flightValid,
              2: bookingValid,
            },
            stepInteraction: {
              ...existingValidationState.stepInteraction,
              1:
                state.selectedType === 'direct'
                  ? !!state.directFlight?.selectedFlight
                  : state.selectedFlights?.length > 0,
              2: !!state.bookingNumber?.trim(),
            },
            1: flightValid,
            2: bookingValid,
            _timestamp: Date.now(),
          };

          // Calculate new completed steps
          const newCompletedSteps = [
            ...(flightValid ? [1] : []),
            ...(bookingValid ? [2] : []),
            ...(state.completedSteps.includes(3) ? [3] : []),
          ].sort((a, b) => a - b);

          // Update state with preserved validation
          set({
            currentPhase: phase,
            isTransitioningPhases: false,
            validationState: newValidationState,
            completedSteps: newCompletedSteps,
            _lastUpdate: Date.now(),
          });
        } else {
          // For other phase transitions, preserve validation state
          set({
            currentPhase: phase,
            isTransitioningPhases: false,
            validationState: existingValidationState,
            completedSteps: existingCompletedSteps,
            _lastUpdate: Date.now(),
          });
        }
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
        return PHASE_TO_URL[prevPhase] || null;
      },

      setBookingNumber: (bookingNumber: string) => {
        const state = get();

        // Preserve existing validation state
        const existingValidationState = { ...state.validationState };
        const existingCompletedSteps = [...state.completedSteps];
        const existingOpenSteps = [...state.openSteps];

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

        // Calculate new open steps
        const newOpenSteps = isValid
          ? Array.from(new Set([...existingOpenSteps, 2]))
          : existingOpenSteps;

        // Update state atomically with all changes
        set({
          ...newState,
          validationState: newValidationState,
          completedSteps: newCompletedSteps,
          openSteps: newOpenSteps,
          // Force immediate UI update
          _lastUpdate: Date.now(),
        });
      },

      setSelectedFlights: (flights: Flight[]) => {
        set((state) => {
          // Filter out null flights first
          const validFlights = flights.filter((f): f is Flight => f !== null);

          // Skip update if nothing has changed
          const hasFlightsChanged =
            JSON.stringify(state.selectedFlights) !==
            JSON.stringify(validFlights);
          const hasSelectedFlightChanged =
            JSON.stringify(state.directFlight?.selectedFlight) !==
            JSON.stringify(validFlights[0] || null);

          if (!hasFlightsChanged && !hasSelectedFlightChanged) {
            return state;
          }

          // Create new state with all updates in a single operation
          const newState = {
            ...state,
            selectedFlights: validFlights,
            selectedFlight: validFlights[0] || null,
            directFlight: {
              ...state.directFlight,
              selectedFlight: validFlights[0] || null,
            },
          };

          // Run validation
          const isValid = validateFlightSelection(newState);

          // Return final state with all updates
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
            },
            completedSteps: isValid
              ? Array.from(new Set([...state.completedSteps, 1]))
              : state.completedSteps.filter((step) => step !== 1),
          };
        });
      },

      initializeNavigationFromUrl: () => {
        const state = get();

        // Get current pathname and phase
        const pathname = window.location.pathname;
        const phase = URL_TO_PHASE[pathname] || 1;

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

          // Create base state updates
          let newState: Partial<StoreState> = {
            selectedType: type,
          };

          // If switching to multi, initialize segments
          if (type === 'multi' && state.selectedType === 'direct') {
            const newSegments = [
              {
                fromLocation: state.directFlight.fromLocation,
                toLocation: state.directFlight.toLocation,
                date: state.directFlight.date,
                selectedFlight: state.directFlight.selectedFlight, // Preserve selected flight
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
              selectedFlights: state.directFlight.selectedFlight
                ? [state.directFlight.selectedFlight]
                : [], // Preserve selected flights
              selectedFlight: state.directFlight.selectedFlight, // Preserve selected flight
            };
          }

          // If switching to direct, use first segment's locations
          if (type === 'direct' && state.selectedType === 'multi') {
            const firstSegment = state.flightSegments[0];

            const newDirectFlight = {
              ...state.directFlight,
              fromLocation: firstSegment?.fromLocation || null,
              toLocation: firstSegment?.toLocation || null,
              date: firstSegment?.date || null,
              selectedFlight: firstSegment?.selectedFlight || null,
            };

            newState = {
              ...newState,
              directFlight: newDirectFlight,
              selectedFlights: firstSegment?.selectedFlight
                ? [firstSegment.selectedFlight]
                : [], // Preserve selected flights
              selectedFlight: firstSegment?.selectedFlight || null, // Preserve selected flight
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
            openSteps: Array.from(new Set([...state.openSteps, 1])),
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
        set((state) => {
          console.log('=== setSelectedFlight START ===');
          console.log('Input flight:', flight);
          console.log('Current state:', {
            selectedType: state.selectedType,
            currentSegmentIndex: state.currentSegmentIndex,
            flightSegments: state.flightSegments,
            selectedFlights: state.selectedFlights,
            selectedFlight: state.selectedFlight,
            directFlight: state.directFlight,
          });

          // For direct flights
          if (state.selectedType === 'direct') {
            console.log('Processing direct flight selection');
            const newDirectFlight = {
              ...state.directFlight,
              selectedFlight: flight,
            };

            const newState = {
              ...state,
              selectedFlight: flight,
              selectedFlights: flight ? [flight] : [],
              directFlight: newDirectFlight,
              validationState: {
                ...state.validationState,
                isFlightValid: !!flight,
                stepValidation: {
                  ...state.validationState.stepValidation,
                  1: !!flight,
                },
                1: !!flight,
                isSignatureValid:
                  state.currentPhase === URL_TO_PHASE['/phases/agreement']
                    ? state.validationState.isSignatureValid
                    : true,
                _timestamp: Date.now(),
              },
              completedSteps: flight
                ? Array.from(new Set([...state.completedSteps, 1])).sort(
                    (a, b) => a - b
                  )
                : state.completedSteps.filter((step) => step !== 1),
              openSteps: Array.from(new Set([...state.openSteps, 1])),
              _lastUpdate: Date.now(),
            };

            console.log('New state for direct flight:', newState);
            return newState;
          }

          // For multi-segment flights
          console.log('Processing multi-segment flight selection');

          // Create a new array of selected flights
          const newSelectedFlights = [...state.selectedFlights];

          // Update or add the flight at the current segment index
          if (flight) {
            // Ensure we're using the same date for all segments
            const updatedFlight = {
              ...flight,
              date: state.selectedDate || flight.date,
            };

            // If we're updating an existing index
            if (state.currentSegmentIndex < newSelectedFlights.length) {
              newSelectedFlights[state.currentSegmentIndex] = updatedFlight;
            } else {
              // If we're adding a new flight
              newSelectedFlights.push(updatedFlight);
            }
          } else {
            // If removing a flight, remove it from the array
            newSelectedFlights.splice(state.currentSegmentIndex, 1);
          }

          console.log('Updated selectedFlights:', newSelectedFlights);

          // Update flight segments
          const newFlightSegments = state.flightSegments.map(
            (segment, index) =>
              index === state.currentSegmentIndex
                ? {
                    ...segment,
                    selectedFlight: flight
                      ? {
                          ...flight,
                          date: state.selectedDate || flight.date,
                        }
                      : null,
                  }
                : segment
          );
          console.log('Updated flightSegments:', newFlightSegments);

          // Calculate validation state
          const hasAllSegments = !!(
            newFlightSegments &&
            newFlightSegments.length >= 2 &&
            newFlightSegments.every(
              (segment) => segment.selectedFlight !== null
            )
          );
          const hasAllFlights = !!(
            newSelectedFlights.length === newFlightSegments.length &&
            newSelectedFlights.every((f) => f !== null)
          );

          // Check if dates are in chronological order
          let datesAreValid = true;
          if (hasAllSegments && newFlightSegments.length >= 2) {
            for (let i = 0; i < newFlightSegments.length - 1; i++) {
              const currentFlight = newFlightSegments[i].selectedFlight;
              const nextFlight = newFlightSegments[i + 1].selectedFlight;

              if (currentFlight && nextFlight) {
                const currentArrivalTime = new Date(
                  `${currentFlight.date}T${currentFlight.arrivalTime}:00.000Z`
                );
                const nextDepartureTime = new Date(
                  `${nextFlight.date}T${nextFlight.departureTime}:00.000Z`
                );

                console.log('Validating flight times:', {
                  currentFlight: {
                    date: currentFlight.date,
                    arrivalTime: currentFlight.arrivalTime,
                    fullArrivalTime: currentArrivalTime.toISOString(),
                  },
                  nextFlight: {
                    date: nextFlight.date,
                    departureTime: nextFlight.departureTime,
                    fullDepartureTime: nextDepartureTime.toISOString(),
                  },
                  timeDiff:
                    (nextDepartureTime.getTime() -
                      currentArrivalTime.getTime()) /
                    60000, // in minutes
                });

                // First check if dates are in chronological order
                if (nextDepartureTime <= currentArrivalTime) {
                  datesAreValid = false;
                  console.log(
                    'Invalid flight order - second flight departs before first flight arrives:',
                    {
                      currentFlight: {
                        date: currentFlight.date,
                        arrivalTime: currentFlight.arrivalTime,
                        fullTime: currentArrivalTime.toLocaleString(),
                      },
                      nextFlight: {
                        date: nextFlight.date,
                        departureTime: nextFlight.departureTime,
                        fullTime: nextDepartureTime.toLocaleString(),
                      },
                    }
                  );
                  break;
                }

                // Then check minimum connection time
                const timeDiff =
                  nextDepartureTime.getTime() - currentArrivalTime.getTime();
                if (timeDiff < 1800000) {
                  // 30 minutes in milliseconds
                  datesAreValid = false;
                  console.log('Connection time too short:', {
                    currentFlight: {
                      date: currentFlight.date,
                      arrivalTime: currentFlight.arrivalTime,
                    },
                    nextFlight: {
                      date: nextFlight.date,
                      departureTime: nextFlight.departureTime,
                    },
                    timeDiff: timeDiff / 60000, // Convert to minutes for logging
                  });
                  break;
                }
              }
            }
          }

          // Check if segments are properly linked
          let segmentsAreLinked = true;
          if (hasAllSegments && newFlightSegments.length >= 2) {
            for (let i = 0; i < newFlightSegments.length - 1; i++) {
              const currentFlight = newFlightSegments[i].selectedFlight;
              const nextFlight = newFlightSegments[i + 1].selectedFlight;

              if (currentFlight && nextFlight) {
                // Check if arrival city of current flight matches departure city of next flight
                if (currentFlight.arrivalCity !== nextFlight.departureCity) {
                  segmentsAreLinked = false;
                  console.log('Segments not properly linked:', {
                    currentFlight,
                    nextFlight,
                  });
                  break;
                }
              }
            }
          }

          const isValid =
            hasAllSegments &&
            hasAllFlights &&
            datesAreValid &&
            segmentsAreLinked;

          console.log('Validation results:', {
            hasAllSegments,
            hasAllFlights,
            datesAreValid,
            segmentsAreLinked,
            isValid,
          });

          // Calculate new segment index
          const newSegmentIndex =
            flight && state.currentSegmentIndex < newFlightSegments.length - 1
              ? state.currentSegmentIndex + 1
              : state.currentSegmentIndex;
          console.log('New segment index:', newSegmentIndex);

          // Return new state with all updates in a single atomic operation
          const newState = {
            ...state,
            selectedFlight: flight,
            selectedFlights: newSelectedFlights.filter(
              (f): f is Flight => f !== null
            ),
            flightSegments: newFlightSegments,
            currentSegmentIndex: newSegmentIndex,
            validationState: {
              ...state.validationState,
              isFlightValid: isValid,
              stepValidation: {
                ...state.validationState.stepValidation,
                1: isValid,
              },
              1: isValid,
              isSignatureValid:
                state.currentPhase === URL_TO_PHASE['/phases/agreement']
                  ? state.validationState.isSignatureValid
                  : true,
              _timestamp: Date.now(),
            },
            completedSteps: isValid
              ? Array.from(new Set([...state.completedSteps, 1])).sort(
                  (a, b) => a - b
                )
              : state.completedSteps.filter((step) => step !== 1),
            openSteps: Array.from(new Set([...state.openSteps, 1])),
            _lastUpdate: Date.now(),
          };

          console.log('Final new state:', newState);
          console.log('=== setSelectedFlight END ===');
          return newState;
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

          // Create new state with updated segments
          const newState = {
            ...state,
            flightSegments: segments,
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
        const existingOpenSteps = [...state.openSteps];

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

        // Calculate new open steps
        const newOpenSteps = isValid
          ? Array.from(new Set([...existingOpenSteps, 2]))
          : existingOpenSteps;

        // Update state atomically
        set({
          validationState: newValidationState,
          completedSteps: newCompletedSteps,
          openSteps: newOpenSteps,
          // Force immediate UI update
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
          (field) => !!details[field]?.trim()
        );

        // Add field-level errors for basic fields
        basicFields.forEach((field) => {
          if (!details[field]?.trim()) {
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
            'zipCode',
            'city',
            'country',
          ] as const;
          validationDetails.hasClaimSuccessFields = claimSuccessFields.every(
            (field) => !!details[field]?.trim()
          );

          // Add field-level errors for claim success fields
          claimSuccessFields.forEach((field) => {
            if (!details[field]?.trim()) {
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

      setOpenSteps: (steps: number[]) => set({ openSteps: steps }),

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
        return checkStepValidity(state)(step);
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
        const state = get();
        // Get all relevant answers
        const answers = state.wizardAnswers.filter(
          (a) =>
            a.questionId === 'travel_status' ||
            a.questionId === 'refund_status' ||
            a.questionId === 'ticket_cost'
        );

        // Check if we have the main travel status answer
        const hasTravelStatus = answers.some(
          (a) =>
            a.questionId === 'travel_status' &&
            ['none', 'self', 'provided'].includes(String(a.value))
        );

        // Get travel status value
        const travelStatusAnswer = answers.find(
          (a) => a.questionId === 'travel_status'
        );
        const travelStatus = travelStatusAnswer?.value;

        // Get refund status value
        const refundStatus = answers.find(
          (a) => a.questionId === 'refund_status'
        )?.value;

        // Check if ticket cost is needed and provided
        const needsTicketCost =
          travelStatus === 'none' && refundStatus === 'no';
        const hasTicketCost = needsTicketCost
          ? answers.some((a) => a.questionId === 'ticket_cost' && a.value)
          : true;

        // If we have a travel status answer and all required fields, it's valid
        const isValid = hasTravelStatus && (!needsTicketCost || hasTicketCost);

        // Update validation state
        set((state) => {
          // First, get all non-travel status answers
          const otherAnswers = state.wizardAnswers.filter(
            (a) =>
              a.questionId !== 'travel_status' &&
              a.questionId !== 'refund_status' &&
              a.questionId !== 'ticket_cost'
          );

          // Then, prepare the travel status answers with correct visibility and converted value
          const travelAnswers = answers.map((a) => {
            const shouldShow =
              a.questionId === 'travel_status' ||
              (a.questionId === 'refund_status' && travelStatus === 'none') ||
              (a.questionId === 'ticket_cost' && needsTicketCost);

            // Convert travel status value if needed
            const value =
              a.questionId === 'travel_status' && a.value === 'none'
                ? 'no_travel'
                : a.value;

            return {
              ...a,
              shouldShow,
              value,
            };
          });

          return {
            validationState: {
              ...state.validationState,
              stepValidation: {
                ...state.validationState.stepValidation,
                2: isValid,
              },
              stepInteraction: {
                ...state.validationState.stepInteraction,
                2: true,
              },
              2: isValid,
              _timestamp: Date.now(),
            },
            completedSteps: isValid
              ? Array.from(new Set([...state.completedSteps, 2])).sort(
                  (a, b) => a - b
                )
              : state.completedSteps.filter((step) => step !== 2),
            completedWizards: {
              ...state.completedWizards,
              travel_status: isValid,
            },
            // Combine other answers with travel status answers
            wizardAnswers: [...otherAnswers, ...travelAnswers],
            _lastUpdate: Date.now(),
          };
        });

        return isValid;
      },

      handleInformedDateComplete: () => {
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
            stepInteraction: {
              ...state.validationState.stepInteraction,
              3: true,
            },
            3: isValid,
            _timestamp: Date.now(),
          },
          completedSteps: isValid
            ? Array.from(new Set([...state.completedSteps, 3])).sort(
                (a, b) => a - b
              )
            : state.completedSteps.filter((step) => step !== 3),
          completedWizards: {
            ...state.completedWizards,
            informed_date: isValid,
          },
          // Filter and update wizard answers
          wizardAnswers: state.wizardAnswers
            .filter((a) => !a.questionId.startsWith('informed_date'))
            .concat(
              state.wizardAnswers.filter((a) =>
                a.questionId.startsWith('informed_date')
              )
            ),
          _lastUpdate: Date.now(),
        }));
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
          // Check if any values have actually changed
          const hasChanges = Object.entries(updates).some(([key, value]) => {
            if (key === 'stepValidation' || key === 'stepInteraction') {
              const stateValue =
                state.validationState[
                  key as 'stepValidation' | 'stepInteraction'
                ];
              return Object.entries(
                value as Record<ValidationStateSteps, boolean>
              ).some(([stepKey, stepValue]) => {
                const numericKey = Number(stepKey) as ValidationStateSteps;
                return stateValue[numericKey] !== stepValue;
              });
            }
            return (
              state.validationState[key as keyof ValidationState] !== value
            );
          });

          // Skip update if nothing has changed
          if (!hasChanges) {
            return state;
          }

          // Apply updates
          return {
            ...state,
            validationState: {
              ...state.validationState,
              ...updates,
              stepValidation: {
                ...state.validationState.stepValidation,
                ...(updates.stepValidation || {}),
              },
              stepInteraction: {
                ...state.validationState.stepInteraction,
                ...(updates.stepInteraction || {}),
              },
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
    }),
    {
      name: 'wizard-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (
        state: StoreState & StoreActions
      ): Partial<StoreState & StoreActions> | null => {
        // Debounce logging and state persistence
        const now = Date.now();
        if (!state._lastPersist || now - state._lastPersist > 5000) {
          // Increased debounce time to 5 seconds
          // Only persist if state has actually changed
          const currentState = {
            directFlight: state.directFlight,
            flightSegments: state.flightSegments,
            selectedDate: state.selectedDate,
            personalDetails: state.personalDetails,
          };

          const stateKey = JSON.stringify(currentState);
          if (state._lastPersistedState !== stateKey) {
            console.log('Persisting state:', currentState);
            state._lastPersist = now;
            state._lastPersistedState = stateKey;

            return {
              // Flight related
              selectedType: state.selectedType,
              directFlight: state.directFlight,
              flightSegments: state.flightSegments,
              currentSegmentIndex: state.currentSegmentIndex,
              fromLocation: state.fromLocation,
              toLocation: state.toLocation,
              selectedDate: state.selectedDate,
              selectedFlights: state.selectedFlights,
              selectedFlight: state.selectedFlight,
              flightDetails: state.flightDetails,
              delayDuration: state.delayDuration,

              // User related
              personalDetails: state.personalDetails,
              termsAccepted: state.termsAccepted,
              privacyAccepted: state.privacyAccepted,
              marketingAccepted: state.marketingAccepted,
              signature: state.signature,
              hasSignature: state.hasSignature,

              // Navigation related
              currentPhase: state.currentPhase,
              completedPhases: state.completedPhases,
              completedSteps: state.completedSteps,
              openSteps: state.openSteps,
              phasesCompletedViaContinue: state.phasesCompletedViaContinue,

              // Validation related
              validationState: state.validationState,

              // Wizard related
              wizardAnswers: state.wizardAnswers,
              wizardCurrentSteps: state.wizardCurrentSteps,
              wizardIsCompleted: state.wizardIsCompleted,
              wizardIsValid: state.wizardIsValid,
              completedWizards: state.completedWizards,
              lastAnsweredQuestion: state.lastAnsweredQuestion,
              tripExperienceAnswers: state.tripExperienceAnswers,
            };
          }
        }

        // Return null to skip persistence if within debounce period or no changes
        return null;
      },
      onRehydrateStorage: () => {
        return (state: (StoreState & StoreActions) | undefined) => {
          if (state) {
            console.log('Before rehydration:', {
              directFlight: state.directFlight,
              flightSegments: state.flightSegments,
              selectedDate: state.selectedDate,
            });

            // Transform dates in the rehydrated state using separate functions
            if (state.directFlight) {
              state.directFlight = transformDatesSingle(state.directFlight);
            }
            if (state.flightSegments) {
              state.flightSegments = transformDatesArray(state.flightSegments);
            }

            console.log('After rehydration:', {
              directFlight: state.directFlight,
              flightSegments: state.flightSegments,
              selectedDate: state.selectedDate,
            });

            // Reset wizard success states
            state.wizardSuccessStates = {
              travel_status: { showing: false, message: '' },
              informed_date: { showing: false, message: '' },
              issue: { showing: false, message: '' },
              phase1: { showing: false, message: '' },
              default: { showing: false, message: '' },
            };
            state.wizardShowingSuccess = false;
            state.wizardSuccessMessage = '';

            // For phase 4 (trip experience), handle wizard state
            if (state.currentPhase === 4) {
              // Get existing wizard answers
              const tripExperienceAnswers = state.wizardAnswers.filter((a) =>
                a.questionId.startsWith('travel_status_')
              );
              const informedDateAnswers = state.wizardAnswers.filter((a) =>
                a.questionId.startsWith('informed_date_')
              );

              // Check if we have valid answers
              const hasTravelStatus = tripExperienceAnswers.some(
                (a) => a.questionId === 'travel_status' && a.value
              );
              const hasInformedDate = informedDateAnswers.some(
                (a) => a.questionId === 'informed_date' && a.value
              );

              // Get last answered question
              const lastTravelStatusQuestion =
                tripExperienceAnswers.length > 0
                  ? tripExperienceAnswers[tripExperienceAnswers.length - 1]
                      .questionId
                  : null;
              const lastInformedDateQuestion =
                informedDateAnswers.length > 0
                  ? informedDateAnswers[informedDateAnswers.length - 1]
                      .questionId
                  : null;
              state.lastAnsweredQuestion =
                lastInformedDateQuestion ||
                lastTravelStatusQuestion ||
                state.lastAnsweredQuestion;

              // Validate travel status and informed date
              const travelStatusValid = validateTripExperience(state);
              const informedDateValid = validateInformedDate(state);

              // Update validation state while preserving existing state
              state.validationState = {
                ...state.validationState,
                stepValidation: {
                  ...state.validationState.stepValidation,
                  2: travelStatusValid,
                  3: informedDateValid,
                },
                stepInteraction: {
                  ...state.validationState.stepInteraction,
                  2: hasTravelStatus,
                  3: hasInformedDate,
                },
                2: travelStatusValid,
                3: informedDateValid,
                isWizardValid: travelStatusValid && informedDateValid,
                _timestamp: Date.now(),
              };

              // Update completed wizards
              state.completedWizards = {
                ...state.completedWizards,
                travel_status: travelStatusValid,
                informed_date: informedDateValid,
              };

              // Update completed steps
              state.completedSteps = [
                ...state.completedSteps.filter(
                  (stepNum: number) => stepNum !== 2 && stepNum !== 3
                ),
                ...(travelStatusValid ? [2] : []),
                ...(informedDateValid ? [3] : []),
              ].sort((a, b) => a - b);

              // Update wizard state
              state.wizardIsCompleted = travelStatusValid && informedDateValid;
              state.wizardIsValid = travelStatusValid && informedDateValid;
              state.tripExperienceAnswers = tripExperienceAnswers;
              state.wizardCurrentSteps = {
                ...state.wizardCurrentSteps,
                travel_status: hasTravelStatus
                  ? tripExperienceAnswers.length
                  : 0,
                informed_date: hasInformedDate ? informedDateAnswers.length : 0,
              };
            }

            // Add timestamp to force re-render
            state._lastUpdate = Date.now();
          }
        };
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
  const existingOpenSteps = [...state.openSteps];

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

  // Update validation state
  state.validationState = newValidationState;

  // Update completed steps while preserving existing ones
  if (isValid && !existingCompletedSteps.includes(2)) {
    state.completedSteps = Array.from(
      new Set([...existingCompletedSteps, 2])
    ).sort((a, b) => a - b);
  } else if (!isValid) {
    state.completedSteps = existingCompletedSteps.filter((step) => step !== 2);
  }

  // Always ensure step 2 is in openSteps when valid
  if (isValid) {
    state.openSteps = Array.from(new Set([...existingOpenSteps, 2]));
  }

  // Force immediate UI update
  state._lastUpdate = Date.now();

  return isValid;
};

export const validateTripExperience = (state: StoreStateValues): boolean => {
  // Get all travel status related answers
  const answers = state.wizardAnswers.filter((a) =>
    a.questionId.startsWith('travel_status')
  );

  // Check if we have the main travel status answer with a valid value
  const validTravelStatuses = ['none', 'self', 'provided'];
  const hasTravelStatus = answers.some(
    (a) =>
      a.questionId === 'travel_status' &&
      validTravelStatuses.includes(String(a.value))
  );

  return hasTravelStatus;
};

export const validateInformedDate = (state: StoreStateValues): boolean => {
  // Get all informed date related answers
  const answers = state.wizardAnswers.filter((a) =>
    a.questionId.startsWith('informed_date')
  );

  // Check if we have the main informed date answer
  const hasInformedDate = answers.some(
    (a) => a.questionId === 'informed_date' && a.value
  );
  const informedDate = answers
    .find((a) => a.questionId === 'informed_date')
    ?.value?.toString();

  let informedDateValid = hasInformedDate;
  if (informedDate === 'specific_date') {
    const specificDate = answers
      .find((a) => a.questionId === 'specific_informed_date')
      ?.value?.toString();

    // Check if we have a specific date value
    if (!specificDate) {
      return false;
    }

    // Validate the date format
    try {
      const date = parseISO(specificDate);
      informedDateValid = isValid(date);
    } catch (e) {
      informedDateValid = false;
    }
  }

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
