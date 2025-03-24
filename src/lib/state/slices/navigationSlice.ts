import { StoreStateValues, ValidationStep } from '../types';

export interface NavigationSlice {
  currentPhase: ValidationStep;
  completedPhases: ValidationStep[];
  completedSteps: ValidationStep[];
  currentStep: ValidationStep;
  phasesCompletedViaContinue: ValidationStep[];
  openSteps: ValidationStep[];
  isTransitioningPhases: boolean;
  compensationAmount: number;
}

export const initialNavigationState: NavigationSlice = {
  currentPhase: 1,
  completedPhases: [],
  completedSteps: [],
  currentStep: 1,
  phasesCompletedViaContinue: [],
  openSteps: [],
  isTransitioningPhases: false,
  compensationAmount: 0,
};

export const URL_TO_PHASE: Record<string, ValidationStep> = {
  '/phases/initial-assessment': 1,
  '/phases/compensation-estimate': 2,
  '/phases/flight-details': 3,
  '/phases/trip-experience': 4,
  '/phases/claim-success': 5,
  '/phases/claim-rejected': 5,
  '/phases/agreement': 6,
  '/phases/claim-submitted': 7,
};

export const PHASE_TO_URL: Record<ValidationStep, string> = {
  1: '/phases/initial-assessment',
  2: '/phases/compensation-estimate',
  3: '/phases/flight-details',
  4: '/phases/trip-experience',
  5: '/phases/claim-success',
  6: '/phases/agreement',
  7: '/phases/claim-submitted',
};

export interface NavigationActions {
  setCurrentPhase: (phase: ValidationStep) => void;
  completePhase: (phase: ValidationStep) => void;
  completeStep: (step: ValidationStep) => void;
  goToPreviousPhase: () => string | null;
  setOpenSteps: (steps: ValidationStep[]) => void;
  initializeNavigationFromUrl: () => void;
  canProceedToNextPhase: () => boolean;
  getPhaseUrl: (phase: ValidationStep) => string | null;
}

export const createNavigationSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  get: () => StoreStateValues
): NavigationActions => ({
  setCurrentPhase: (phase) => {
    const state = get();
    const newCompletedPhases = [...state.completedPhases];

    if (phase < state.currentPhase) {
      newCompletedPhases.push(state.currentPhase);
    } else {
      for (let i = 1; i < phase; i++) {
        const validationStep = i as ValidationStep;
        if (!newCompletedPhases.includes(validationStep)) {
          newCompletedPhases.push(validationStep);
        }
      }
    }

    // Preserve the compensation amount during phase transitions
    const compensationAmount = state.compensationAmount;

    set(() => ({
      currentPhase: phase,
      completedPhases: Array.from(new Set(newCompletedPhases)).sort((a, b) => a - b),
      compensationAmount: compensationAmount, // Explicitly preserve the compensation amount
      _lastUpdate: Date.now(),
    }));
  },

  completePhase: (phase) => {
    const state = get();
    const validationStep = phase as ValidationStep;

    // Only add the phase if it's not already in completedPhases
    const newCompletedPhases = state.completedPhases.includes(validationStep)
      ? state.completedPhases
      : [...state.completedPhases, validationStep].sort((a, b) => a - b);

    // Always update phasesCompletedViaContinue when completing a phase
    const newPhasesCompletedViaContinue = Array.from(
      new Set([...state.phasesCompletedViaContinue, validationStep])
    ).sort((a, b) => a - b);

    // Save to localStorage to ensure persistence
    try {
      localStorage.setItem('completedPhases', JSON.stringify(newCompletedPhases));
      localStorage.setItem('phasesCompletedViaContinue', JSON.stringify(newPhasesCompletedViaContinue));
    } catch (error) {
      console.error('Error saving phase completion state:', error);
    }

    set(() => ({
      ...state,
      completedPhases: newCompletedPhases,
      completedSteps: Array.from(new Set([...state.completedSteps, validationStep])) as ValidationStep[],
      phasesCompletedViaContinue: newPhasesCompletedViaContinue as ValidationStep[],
      _lastUpdate: Date.now(),
    }));
  },

  completeStep: (step) =>
    set((state) => ({
      completedSteps: Array.from(new Set([...state.completedSteps, step])) as ValidationStep[],
      _lastUpdate: Date.now(),
    })),

  goToPreviousPhase: () => {
    const state = get();
    const prevPhase = (state.currentPhase - 1) as ValidationStep;
    if (prevPhase < 1) return null;
    return PHASE_TO_URL[prevPhase] || null;
  },

  setOpenSteps: (steps) => set(() => ({
    openSteps: steps,
    _lastUpdate: Date.now(),
  })),

  initializeNavigationFromUrl: () => {
    const pathname = window.location.pathname;
    const phase = URL_TO_PHASE[pathname] || 1;

    set((state) => ({
      ...state,
      currentPhase: phase,
      _lastUpdate: Date.now(),
    }));
  },

  canProceedToNextPhase: () => {
    const state = get();

    console.log('=== Navigation Slice - Checking Phase Progress ===', {
      currentPhase: state.currentPhase,
      compensationAmount: state.compensationAmount,
      validationState: state.validationState,
      timestamp: new Date().toISOString()
    });

    if (state.currentPhase === 1) {
      // Check all required steps for phase 1
      const wizardValid = state.validationState.stepValidation[2] && state.validationState.stepInteraction[2];
      const flightValid = state.validationState.stepValidation[1] && state.validationState.stepInteraction[1];
      const personalValid = state.validationState.stepValidation[3] && state.validationState.stepInteraction[3];
      const termsValid = state.validationState.stepValidation[4] && state.validationState.stepInteraction[4];

      const canProceed = Boolean(wizardValid && flightValid && personalValid && termsValid);
      console.log('=== Phase 1 Validation Check ===', {
        wizardValid,
        flightValid,
        personalValid,
        termsValid,
        canProceed,
        timestamp: new Date().toISOString()
      });

      return canProceed;
    }

    if (state.currentPhase === 2) {
      // For phase 2, check if we have a valid compensation amount
      const hasValidAmount = (state.compensationAmount ?? 0) > 0;
      const isValidationComplete = state.validationState.isCompensationValid;
      const hasStepValidation = state.validationState.stepValidation[2];
      const hasStepInteraction = state.validationState.stepInteraction[2];

      console.log('=== Phase 2 Validation Check - Detailed ===', {
        hasValidAmount,
        isValidationComplete,
        hasStepValidation,
        hasStepInteraction,
        compensationAmount: state.compensationAmount,
        validationState: {
          isCompensationValid: state.validationState.isCompensationValid,
          stepValidation: state.validationState.stepValidation,
          stepInteraction: state.validationState.stepInteraction,
          stepCompleted: state.validationState.stepCompleted,
          completedSteps: state.validationState.completedSteps
        },
        canProceed: hasValidAmount && isValidationComplete && hasStepValidation && hasStepInteraction,
        timestamp: new Date().toISOString()
      });

      return hasValidAmount && isValidationComplete && hasStepValidation && hasStepInteraction;
    }

    if (state.currentPhase === 4) {
      const tripExperienceValid = state.wizardAnswers.some((a) =>
        a.questionId.startsWith('travel_status_')
      );
      const informedDateValid = state.wizardAnswers.some((a) =>
        a.questionId.startsWith('informed_date_')
      );

      const canProceed = tripExperienceValid && informedDateValid;
      console.log('=== Phase 4 Validation Check ===', {
        tripExperienceValid,
        informedDateValid,
        canProceed,
        timestamp: new Date().toISOString()
      });

      return canProceed;
    }

    return true;
  },

  getPhaseUrl: (phase) => {
    return PHASE_TO_URL[phase] || null;
  },
});
