import { StoreStateValues } from '../types';

export interface NavigationSlice {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
  currentStep: number;
  phasesCompletedViaContinue: number[];
  openSteps: number[];
  isTransitioningPhases: boolean;
}

export const initialNavigationState: NavigationSlice = {
  currentPhase: 1,
  completedPhases: [],
  completedSteps: [],
  currentStep: 1,
  phasesCompletedViaContinue: [],
  openSteps: [],
  isTransitioningPhases: false,
};

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

export interface NavigationActions {
  setCurrentPhase: (phase: number) => void;
  completePhase: (phase: number) => void;
  completeStep: (step: number) => void;
  goToPreviousPhase: () => string | null;
  setOpenSteps: (steps: number[]) => void;
  initializeNavigationFromUrl: () => void;
  canProceedToNextPhase: () => boolean;
  getPhaseUrl: (phase: number) => string | null;
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
        if (!newCompletedPhases.includes(i)) {
          newCompletedPhases.push(i);
        }
      }
    }

    set(() => ({
      currentPhase: phase,
      completedPhases: Array.from(new Set(newCompletedPhases)).sort(
        (a, b) => a - b
      ),
      _lastUpdate: Date.now(),
    }));
  },

  completePhase: (phase) =>
    set((state) => ({
      completedPhases: Array.from(new Set([...state.completedPhases, phase])),
      completedSteps: Array.from(new Set([...state.completedSteps, phase])),
      phasesCompletedViaContinue: Array.from(
        new Set([...state.phasesCompletedViaContinue, phase])
      ),
    })),

  completeStep: (step) =>
    set((state) => ({
      completedSteps: Array.from(new Set([...state.completedSteps, step])),
    })),

  goToPreviousPhase: () => {
    const state = get();
    const prevPhase = state.currentPhase - 1;
    if (prevPhase < 1) return null;
    return PHASE_TO_URL[prevPhase] || null;
  },

  setOpenSteps: (steps) => set(() => ({ openSteps: steps })),

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

    if (state.currentPhase === 1) {
      const flightValid = state.validationState.isFlightValid;
      const wizardValid = state.validationState.isWizardValid;
      const personalValid = state.validationState.isPersonalValid;
      const termsValid = state.validationState.isTermsValid;

      return flightValid && wizardValid && personalValid && termsValid;
    }

    if (state.currentPhase === 4) {
      const tripExperienceValid = state.wizardAnswers.some((a) =>
        a.questionId.startsWith('travel_status_')
      );
      const informedDateValid = state.wizardAnswers.some((a) =>
        a.questionId.startsWith('informed_date_')
      );
      return tripExperienceValid && informedDateValid;
    }

    return true;
  },

  getPhaseUrl: (phase) => {
    return PHASE_TO_URL[phase] || null;
  },
});
