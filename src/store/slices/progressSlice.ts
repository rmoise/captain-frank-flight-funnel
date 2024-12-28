import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ProgressState {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
  isInitialized: boolean;
  lastValidPhase: number | null;
}

// Get initial state from localStorage if available on the client side
const getInitialState = (): ProgressState => {
  if (typeof window === 'undefined') {
    return {
      currentPhase: 1,
      completedPhases: [],
      completedSteps: [],
      isInitialized: false,
      lastValidPhase: null,
    };
  }

  const currentUrl = window.location.pathname;
  const urlPhase = getPhaseFromUrl(currentUrl);
  const savedPhase = localStorage.getItem('currentPhase');
  const savedCompletedPhases = localStorage.getItem('completedPhases');
  const savedCompletedSteps = localStorage.getItem('completedSteps');

  // Use URL phase if available, otherwise use saved phase
  const phase = urlPhase || (savedPhase ? parseInt(savedPhase, 10) : 1);

  return {
    currentPhase: phase,
    lastValidPhase: phase,
    completedPhases: savedCompletedPhases
      ? JSON.parse(savedCompletedPhases)
      : [],
    completedSteps: savedCompletedSteps ? JSON.parse(savedCompletedSteps) : [],
    isInitialized: true,
  };
};

function getPhaseFromUrl(url: string): number | null {
  if (url.includes('/phases/initial-assessment')) return 1;
  if (url.includes('/phases/compensation-estimate')) return 2;
  if (url.includes('/phases/flight-details')) return 3;
  if (url.includes('/phases/trip-experience')) return 4;
  if (url.includes('/phases/claim-success')) return 5;
  if (url.includes('/phases/agreement')) return 6;
  return null;
}

const progressSlice = createSlice({
  name: 'progress',
  initialState: getInitialState(),
  reducers: {
    initializeState: (state) => {
      if (typeof window === 'undefined' || state.isInitialized) return;

      const currentUrl = window.location.pathname;
      const urlPhase = getPhaseFromUrl(currentUrl);
      const savedPhase = localStorage.getItem('currentPhase');

      // Use URL phase if available, otherwise use saved phase
      const phase =
        urlPhase ||
        (savedPhase ? parseInt(savedPhase, 10) : state.currentPhase);

      state.currentPhase = phase;
      state.lastValidPhase = phase;
      state.isInitialized = true;

      const savedCompletedPhases = localStorage.getItem('completedPhases');
      const savedCompletedSteps = localStorage.getItem('completedSteps');

      state.completedPhases = savedCompletedPhases
        ? JSON.parse(savedCompletedPhases)
        : state.completedPhases;
      state.completedSteps = savedCompletedSteps
        ? JSON.parse(savedCompletedSteps)
        : state.completedSteps;
    },
    syncWithBookingSlice: (state, action: PayloadAction<number[]>) => {
      state.completedSteps = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('completedSteps', JSON.stringify(action.payload));
      }
    },
    setCurrentPhase: (state, action: PayloadAction<number>) => {
      // Only allow phase changes if:
      // 1. It's a valid phase (1-6)
      // 2. It's the next phase or a previous phase
      const newPhase = action.payload;
      if (
        newPhase >= 1 &&
        newPhase <= 6 &&
        (newPhase === state.currentPhase + 1 || newPhase <= state.currentPhase)
      ) {
        state.currentPhase = newPhase;
        state.lastValidPhase = newPhase;
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentPhase', newPhase.toString());
        }
      } else {
        // If invalid phase change requested, revert to last valid phase
        if (state.lastValidPhase) {
          state.currentPhase = state.lastValidPhase;
          if (typeof window !== 'undefined') {
            localStorage.setItem(
              'currentPhase',
              state.lastValidPhase.toString()
            );
          }
        }
      }
    },
    completePhase: (state, action: PayloadAction<number>) => {
      if (!state.completedPhases.includes(action.payload)) {
        state.completedPhases.push(action.payload);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'completedPhases',
            JSON.stringify(state.completedPhases)
          );
        }
      }
    },
    completeStep: (state, action: PayloadAction<number>) => {
      if (!state.completedSteps.includes(action.payload)) {
        state.completedSteps.push(action.payload);
        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'completedSteps',
            JSON.stringify(state.completedSteps)
          );
        }
      }
    },
    markStepIncomplete: (state, action: PayloadAction<number>) => {
      state.completedSteps = state.completedSteps.filter(
        (step) => step !== action.payload
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'completedSteps',
          JSON.stringify(state.completedSteps)
        );
      }
    },
  },
});

export const {
  initializeState,
  syncWithBookingSlice,
  setCurrentPhase,
  completePhase,
  completeStep,
  markStepIncomplete,
} = progressSlice.actions;
export default progressSlice.reducer;
