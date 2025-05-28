import { ValidationPhase } from "@/types/shared/validation";
import { Store, NavigationState, NavigationActions } from "../types";
import { StateCreator } from "zustand";

// Using Partial<Record> since not all ValidationPhase values have corresponding URLs
export const PHASE_TO_URL: Partial<Record<ValidationPhase, string>> = {
  INITIAL_ASSESSMENT: "/phases/initial-assessment",
  COMPENSATION_ESTIMATE: "/phases/compensation-estimate",
  PERSONAL_DETAILS: "/phases/personal-details",
  TERMS_AND_CONDITIONS: "/phases/terms-and-conditions",
  SUMMARY: "/phases/summary",
  CONFIRMATION: "/phases/confirmation",
  FLIGHT_DETAILS: "/phases/flight-details",
  TRIP_EXPERIENCE: "/phases/trip-experience",
  CLAIM_SUCCESS: "/phases/claim-success",
  CLAIM_REJECTED: "/phases/claim-rejected",
  AGREEMENT: "/phases/agreement",
  CLAIM_SUBMITTED: "/phases/claim-submitted",
  initial: "/phases/initial",
  experience: "/phases/experience",
  journey: "/phases/journey",
  final: "/phases/final",
};

export const initialNavigationState: NavigationState = {
  currentPhase: ValidationPhase.INITIAL_ASSESSMENT,
  completedPhases: [],
  isTransitioning: false,
  lastUpdate: Date.now(),
  phasesCompletedViaContinue: [],
};

export const createNavigationSlice: StateCreator<
  Store,
  [],
  [],
  NavigationActions
> = (set) => ({
  setCurrentPhase: (phase: ValidationPhase) =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        currentPhase: phase,
        lastUpdate: Date.now(),
      },
    })),
  addCompletedPhase: (phase: ValidationPhase) =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        completedPhases: state.navigation.completedPhases.includes(phase)
          ? state.navigation.completedPhases
          : [...state.navigation.completedPhases, phase],
        lastUpdate: Date.now(),
      },
    })),
  startTransition: () =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        isTransitioning: true,
        lastUpdate: Date.now(),
      },
    })),
  endTransition: () =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        isTransitioning: false,
        lastUpdate: Date.now(),
      },
    })),
  resetNavigation: () =>
    set(() => ({
      navigation: {
        ...initialNavigationState,
        lastUpdate: Date.now(),
      },
    })),
  addPhaseCompletedViaContinue: (phase: number) =>
    set((state) => ({
      navigation: {
        ...state.navigation,
        phasesCompletedViaContinue:
          state.navigation.phasesCompletedViaContinue?.includes(phase)
            ? state.navigation.phasesCompletedViaContinue
            : [...(state.navigation.phasesCompletedViaContinue || []), phase],
        lastUpdate: Date.now(),
      },
    })),
});
