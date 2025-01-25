import { validateFlightSelection } from '../validationHelpers';
import type { LocationLike } from '@/types/location';
import type { Flight } from '@/types/store';
import type { ValidationState, ValidationStep, StoreState } from '../types';

export interface ValidationMetadata {
  step: number;
  type: string;
  fieldsChecked: string[];
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  step: number;
  errors: string[];
  metadata?: ValidationMetadata;
}

export interface ValidationSlice {
  validationState: ValidationState;
  isValidating: boolean;
}

export interface ValidationActions {
  validateFlightSelection: () => void;
  validateWizard: () => void;
  validateTerms: () => boolean;
  validatePersonalDetails: () => Promise<boolean>;
  setValidating: (isValidating: boolean) => void;
  setValidationState: (validationState: ValidationState) => void;
  isStepValid: (step: ValidationStep) => boolean;
  updateValidationState: (validationState: Partial<ValidationState>) => void;
  validateAndUpdateStep: (step: ValidationStep) => boolean;
}

export interface ValidationStore extends StoreState {
  validationState: ValidationState;
  hasValidLocations: boolean;
  hasValidFlights: boolean;
  selectedType: 'direct' | 'multi';
  directFlight: {
    fromLocation: LocationLike | null;
    toLocation: LocationLike | null;
    date: Date | null;
    selectedFlight: Flight | null;
  };
  flightSegments: Array<{
    fromLocation: LocationLike | null;
    toLocation: LocationLike | null;
    date: Date | null;
    selectedFlight: Flight | null;
  }>;
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

export const initialValidationState: ValidationState = {
  1: true,
  2: true,
  3: true,
  4: true,
  5: true,
  isFlightValid: false,
  isWizardValid: false,
  isPersonalValid: false,
  isTermsValid: false,
  isSignatureValid: false,
  isBookingValid: false,
  isWizardSubmitted: false,
  stepValidation: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
  stepInteraction: {
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
  },
  questionValidation: {},
  errors: {
    1: [],
    2: [],
    3: [],
    4: [],
    5: [],
  },
  fieldErrors: {},
  stepCompleted: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
  completedSteps: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
  transitionInProgress: false,
  _timestamp: Date.now(),
};

// Helper to ensure validation state is complete
export const ensureValidationState = (
  state: Partial<ValidationState> | null | undefined
): ValidationState => {
  if (!state) return initialValidationState;

  return {
    1: true,
    2: true,
    3: true,
    4: true,
    5: true,
    isFlightValid: state.isFlightValid ?? false,
    isWizardValid: state.isWizardValid ?? false,
    isPersonalValid: state.isPersonalValid ?? false,
    isTermsValid: state.isTermsValid ?? false,
    isSignatureValid: state.isSignatureValid ?? false,
    isBookingValid: state.isBookingValid ?? false,
    isWizardSubmitted: state.isWizardSubmitted ?? false,
    stepValidation: {
      ...initialValidationState.stepValidation,
      ...(state.stepValidation || {}),
    },
    stepInteraction: {
      1: true,
      2: true,
      3: true,
      4: true,
      5: true,
      ...(state.stepInteraction || {}),
    },
    questionValidation: state.questionValidation ?? {},
    errors: {
      ...initialValidationState.errors,
      ...(state.errors || {}),
    },
    fieldErrors: state.fieldErrors ?? {},
    stepCompleted: {
      ...initialValidationState.stepCompleted,
      ...(state.stepCompleted || {}),
    },
    completedSteps: {
      ...initialValidationState.completedSteps,
      ...(state.completedSteps || {}),
    },
    transitionInProgress: state.transitionInProgress ?? false,
    _timestamp: state._timestamp ?? Date.now(),
  };
};

export const createValidationSlice = (
  set: (
    partial:
      | Partial<ValidationStore>
      | ((state: ValidationStore) => Partial<ValidationStore>),
    replace?: boolean
  ) => void,
  get: () => ValidationStore
): ValidationActions => ({
  validateFlightSelection: () => {
    const state = get();
    const isFlightValid = validateFlightSelection(state);
    const currentPhase = state.currentPhase as ValidationStep;

    set((state) => {
      const newValidationState: ValidationState = {
        ...state.validationState,
        isFlightValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          [currentPhase]: isFlightValid,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          [currentPhase]: true,
        },
        errors: {
          ...state.validationState.errors,
          [currentPhase]: isFlightValid ? [] : ['Please select a valid flight'],
        },
        transitionInProgress: false,
      };

      console.log('Updated validation state:', newValidationState);

      return {
        validationState: newValidationState,
        hasValidLocations:
          currentPhase === 1 ? isFlightValid : state.hasValidLocations,
        hasValidFlights:
          currentPhase !== 1 ? isFlightValid : state.hasValidFlights,
        completedSteps: isFlightValid
          ? Array.from(new Set([...state.completedSteps, currentPhase])).sort(
              (a: number, b: number) => a - b
            )
          : state.completedSteps.filter(
              (step: number) => step !== currentPhase
            ),
      };
    });
  },

  validateWizard: () => {
    const state = get();
    const isValid = state.wizardAnswers.length > 0;
    set((state) => ({
      validationState: {
        ...state.validationState,
        isWizardValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          2: isValid,
        },
        errors: {
          ...state.validationState.errors,
          2: isValid ? [] : ['Please complete the wizard'],
        },
      },
    }));
  },

  validateTerms: () => {
    const state = get();
    const isValid = state.termsAccepted && state.privacyAccepted;
    set((state) => ({
      validationState: {
        ...state.validationState,
        isTermsValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          4: isValid,
        },
        errors: {
          ...state.validationState.errors,
          4: isValid ? [] : ['Please accept the terms and privacy policy'],
        },
      },
    }));
    return isValid;
  },

  validatePersonalDetails: async () => {
    const state = get();
    const { personalDetails } = state;

    // If no personal details exist, return false immediately
    if (!personalDetails) {
      set((state) => ({
        validationState: {
          ...state.validationState,
          isPersonalValid: false,
          stepValidation: {
            ...state.validationState.stepValidation,
            3: false,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            3: true,
          },
          errors: {
            ...state.validationState.errors,
            3: ['Please fill in your personal details'],
          },
        },
      }));
      return false;
    }

    // Validate required fields
    const errors: string[] = [];
    if (!personalDetails.firstName) errors.push('First name is required');
    if (!personalDetails.lastName) errors.push('Last name is required');
    if (!personalDetails.email) errors.push('Email is required');
    if (!personalDetails.phone) errors.push('Phone number is required');

    const isValid = errors.length === 0;

    set((state) => ({
      validationState: {
        ...state.validationState,
        isPersonalValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          3: isValid,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          3: true,
        },
        errors: {
          ...state.validationState.errors,
          3: errors,
        },
      },
    }));

    return isValid;
  },

  setValidating: (isValidating) => {
    set(() => ({
      isValidating,
      _lastUpdate: Date.now(),
    }));
  },

  setValidationState: (validationState) => {
    set(() => ({
      validationState,
      _lastUpdate: Date.now(),
    }));
  },

  isStepValid: (step: ValidationStep) => {
    const state = get();
    return Boolean(state.validationState.stepValidation[step]);
  },

  updateValidationState: (validationState) => {
    console.log(
      'ValidationSlice - Updating validation state:',
      validationState
    );

    set((state) => {
      const currentPhase = state.currentPhase as ValidationStep;
      const newState = {
        ...state,
        validationState: {
          ...state.validationState,
          ...validationState,
          stepValidation: {
            ...state.validationState.stepValidation,
            ...validationState.stepValidation,
            [currentPhase]:
              validationState.stepValidation?.[currentPhase] ?? false,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            ...validationState.stepInteraction,
            [currentPhase]: true,
          },
          errors: {
            ...state.validationState.errors,
            ...validationState.errors,
            [currentPhase]: validationState.errors?.[currentPhase] ?? [],
          },
        },
        completedSteps: validationState.stepValidation?.[currentPhase]
          ? Array.from(new Set([...state.completedSteps, currentPhase])).sort(
              (a: number, b: number) => a - b
            )
          : state.completedSteps.filter(
              (step: number) => step !== currentPhase
            ),
      };

      console.log('ValidationSlice - Updated state:', newState);
      return newState;
    });
  },

  validateAndUpdateStep: (step: ValidationStep) => {
    const state = get();
    let isValid = false;

    switch (step) {
      case 1:
        isValid = validateFlightSelection(state);
        break;
      case 2:
        isValid = state.validationState.isWizardValid;
        break;
      case 3:
        isValid = state.validationState.isPersonalValid;
        break;
      case 4:
        isValid = state.validationState.isTermsValid;
        break;
      case 5:
        // Step 5 is valid if all previous steps are valid
        isValid =
          state.validationState.stepValidation[1] &&
          state.validationState.stepValidation[2] &&
          state.validationState.stepValidation[3] &&
          state.validationState.stepValidation[4];
        break;
      default:
        isValid = false;
    }

    set((state) => ({
      validationState: {
        ...state.validationState,
        stepValidation: {
          ...state.validationState.stepValidation,
          [step]: isValid,
        },
      },
    }));

    return isValid;
  },
});
