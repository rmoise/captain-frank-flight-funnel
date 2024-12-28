import type { RootState } from '@/store';

export const selectCurrentPhase = (state: RootState) =>
  state.progress.currentPhase;
export const selectCompletedPhases = (state: RootState) =>
  state.progress.completedPhases;
export const selectCompletedSteps = (state: RootState) =>
  state.progress.completedSteps;
