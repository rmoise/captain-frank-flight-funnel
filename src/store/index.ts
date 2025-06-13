import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createUserSlice } from "./slices/userSlice";
import { createFlightSlice } from "./slices/flightSlice";
import { createNavigationSlice } from "./slices/navigationSlice";
import { createValidationSlice } from "./slices/validationSlice";
import { createPhaseSlice } from "./slices/phaseSlice";
import { createWizardSlice } from "./slices/wizardSlice";
import { createCoreSlice, initialCoreState } from "./slices/coreSlice";
import { createPhase4Slice } from "./slices/phase4Slice";
import type { Store, PhaseState, WizardActions } from "./types";
import { ValidationPhase } from "@/types/shared/validation";
import { createClaimSlice } from "./slices/claimSlice";
import type { ClaimActions } from "./types";
import { createTravelStatusWizardSlice } from "./slices/travelStatusWizardSlice";
import { createInformedDateWizardSlice } from "./slices/informedDateWizardSlice";
import { useMemo } from "react";
import { localStorageManager } from "@/utils/helpers";

const isClient = typeof window !== "undefined";

// Add a flag to track if we've already performed initialization
let storeInitialized = false;

// Update the getEnhancedStorage function to use the simplified approach
const getEnhancedStorage = () => ({
  getItem: (name: string) => {
    if (!isClient) return null;
    try {
      const value = localStorageManager.safeGetItem(name);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      console.error(`Error parsing localStorage item "${name}":`, e);
      return null;
    }
  },
  setItem: (name: string, value: any) => {
    if (!isClient) return;

    try {
      const stringifiedValue = JSON.stringify(value);
      localStorageManager.safeSetItem(name, stringifiedValue);
    } catch (e) {
      console.error(`Error setting localStorage item "${name}":`, e);
    }
  },
  removeItem: (name: string) => {
    if (!isClient) return;
    localStorageManager.safeRemoveItem(name);
  },
});

const initializeValidationPhases = (): Record<ValidationPhase, boolean> => {
  const phases = Object.values(ValidationPhase);
  return phases.reduce(
    (acc, phase) => ({
      ...acc,
      [phase]: false,
    }),
    {} as Record<ValidationPhase, boolean>
  );
};

const initializeValidationSummaries = (): Record<ValidationPhase, string> => {
  const phases = Object.values(ValidationPhase);
  return phases.reduce(
    (acc, phase) => ({
      ...acc,
      [phase]: "",
    }),
    {} as Record<ValidationPhase, string>
  );
};

const initializeValidationErrors = (): Record<ValidationPhase, string[]> => {
  const phases = Object.values(ValidationPhase);
  return phases.reduce(
    (acc, phase) => ({
      ...acc,
      [phase]: [],
    }),
    {} as Record<ValidationPhase, string[]>
  );
};

const initialPhaseState: PhaseState = {
  currentPhase: null,
  phases: {},
};

const initialState = {
  user: {
    details: null,
    consents: {
      terms: false,
      privacy: false,
      marketing: false,
    },
    signature: null,
    lastUpdate: Date.now(),
  },
  flight: {
    type: "direct" as const,
    segments: [],
    selectedFlights: [],
    searchResults: [],
    currentSegmentIndex: 0,
    currentFlight: null,
    flightHistory: [],
    originalFlights: [],
    bookingNumber: "",
    phaseData: {},
    lastUpdate: Date.now(),
  },
  navigation: {
    currentPhase: ValidationPhase.INITIAL_ASSESSMENT,
    completedPhases: [],
    isTransitioning: false,
    lastUpdate: Date.now(),
  },
  validation: {
    stepValidation: initializeValidationPhases(),
    stepCompleted: initializeValidationPhases(),
    stepInteraction: initializeValidationPhases(),
    stepSummary: initializeValidationSummaries(),
    errors: initializeValidationErrors(),
    fieldErrors: {},
    isValid: false,
    isComplete: false,
    _timestamp: Date.now(),
  },
  phase: initialPhaseState,
  phases: {},
  wizard: {
    currentStep: 0,
    totalSteps: 0,
    answers: [],
    questions: [],
    isValid: false,
    isComplete: false,
    lastUpdate: Date.now(),
    travelStatus: {
      answers: [],
      currentStep: 0,
      showingSuccess: false,
      isValid: false,
      stepValidation: {},
      stepInteraction: {},
    },
    informedDate: {
      answers: [],
      currentStep: 0,
      showingSuccess: false,
      isValid: false,
      stepValidation: {},
      stepInteraction: {},
    },
  },
  core: initialCoreState,
  // Phase 4 will be initialized by its own slice
  claimData: {
    claimId: null,
    claimSubmitted: false,
    lastUpdate: Date.now(),
  },
};

const createStore = () => {
  return create<Store>()(
    persist(
      (set, get, api) => {
        const userActions = createUserSlice(set, get, api);
        const flightActions = createFlightSlice(set, get, api);
        const navigationActions = createNavigationSlice(set, get, api);
        const validationActions = createValidationSlice(set, get, api);
        const phaseActions = createPhaseSlice(set, get, api);
        const wizardSlice = createWizardSlice(set, get, api);
        const coreActions = createCoreSlice(set, get, api);
        const phase4Slice = createPhase4Slice(set, get, api);
        const claimActions = createClaimSlice(set, get, api);
        const travelStatusWizardSlice = createTravelStatusWizardSlice(
          set,
          get,
          api
        );
        const informedDateWizardSlice = createInformedDateWizardSlice(
          set,
          get,
          api
        );

        // Ensure wizard actions match the WizardActions interface
        const wizardActions: WizardActions = {
          ...wizardSlice.actions.wizard,
          // Add any missing methods required by WizardActions
          setAnswer: (questionId: string, value: any) =>
            wizardSlice.actions.wizard.setAnswer(questionId, value),
          resetWizard: () => wizardSlice.actions.wizard.resetWizard(),
          validateStep: (step: number) =>
            wizardSlice.actions.wizard.validateStep(step),
          completeWizard: () => wizardSlice.actions.wizard.completeWizard(),
          checkStepValidity: (step: number) =>
            wizardSlice.actions.wizard.checkStepValidity(step),
          setStepValidationStatus: (step: number) =>
            wizardSlice.actions.wizard.setStepValidationStatus(step),
        };

        return {
          user: initialState.user,
          flight: initialState.flight,
          navigation: initialState.navigation,
          validation: initialState.validation,
          phase: initialState.phase,
          phases: initialState.phases,
          wizard: wizardSlice.wizard,
          core: initialState.core,
          phase4: phase4Slice.phase4,
          claimData: initialState.claimData,
          travelStatusWizard: travelStatusWizardSlice.travelStatusWizard,
          informedDateWizard: informedDateWizardSlice.informedDateWizard,
          actions: {
            user: userActions,
            flight: flightActions,
            navigation: navigationActions,
            validation: validationActions,
            phase: phaseActions,
            wizard: wizardActions,
            core: { ...coreActions },
            phase4: phase4Slice.actions.phase4,
            claim: claimActions,
            travelStatusWizard:
              travelStatusWizardSlice.actions.travelStatusWizard,
            informedDateWizard:
              informedDateWizardSlice.actions.informedDateWizard,
            global: {
              resetAll: () => {
                // Reset all slices to their initial state
                userActions.resetUser();
                flightActions.clearFlights();
                navigationActions.resetNavigation();
                validationActions.resetValidation();
                wizardActions.resetWizard();
                phase4Slice.actions.phase4.resetStore();
                claimActions.resetClaim();

                // Clear localStorage completely for a fresh start
                if (typeof window !== "undefined") {
                  try {
                    localStorage.removeItem("captain-frank-store");
                    console.log("[Global Reset] Cleared localStorage");
                  } catch (e) {
                    console.error(
                      "[Global Reset] Error clearing localStorage:",
                      e
                    );
                  }
                }

                // Reset to initial state completely
                set((state) => ({
                  ...initialState,
                  core: {
                    ...initialState.core,
                    isInitialized: true,
                    lastUpdate: new Date(),
                  },
                  actions: state.actions, // Preserve actions
                }));

                console.log("[Global Reset] All state reset to initial values");
              },
            },
          },
        };
      },
      {
        name: "captain-frank-store",
        storage: getEnhancedStorage(),
        partialize: (state) => {
          // Extract only essential data to persist
          const { actions, ...stateWithoutActions } = state;

          // Create a minimal flight state that excludes large search results but keeps originalFlights
          const minimalFlightState = {
            type: state.flight.type,
            segments: state.flight.segments,
            selectedFlights: state.flight.selectedFlights,
            originalFlights: state.flight.originalFlights, // CRITICAL: Keep originalFlights for persistence
            currentSegmentIndex: state.flight.currentSegmentIndex,
            currentFlight: state.flight.currentFlight,
            bookingNumber: state.flight.bookingNumber,
            lastUpdate: state.flight.lastUpdate,
          };

          // Only store essential wizard data
          const minimalWizardState = {
            currentStep: state.wizard.currentStep,
            totalSteps: state.wizard.totalSteps,
            answers: state.wizard.answers,
            isValid: state.wizard.isValid,
            isComplete: state.wizard.isComplete,
            lastUpdate: state.wizard.lastUpdate,
          };

          // Select minimal data from travelStatusWizard and informedDateWizard
          const minimalTravelStatusWizard = {
            currentStep: state.travelStatusWizard?.currentStep,
            answers: state.travelStatusWizard?.answers,
            isValid: state.travelStatusWizard?.isValid,
            showingSuccess: state.travelStatusWizard?.showingSuccess,
          };

          const minimalInformedDateWizard = {
            currentStep: state.informedDateWizard?.currentStep,
            answers: state.informedDateWizard?.answers,
            isValid: state.informedDateWizard?.isValid,
            showingSuccess: state.informedDateWizard?.showingSuccess,
          };

          return {
            ...stateWithoutActions,
            flight: minimalFlightState,
            wizard: minimalWizardState,
            travelStatusWizard: minimalTravelStatusWizard,
            informedDateWizard: minimalInformedDateWizard,
            // Exclude large objects that don't need persistence
            searchResults: undefined,
            flightHistory: undefined,
            // originalFlights is now included in minimalFlightState above
          };
        },
        onRehydrateStorage: (state) => {
          console.log("[Store Storage] Hydration starting...");
          const startTime = performance.now();

          return (state, error) => {
            const endTime = performance.now();
            if (error) {
              console.error(
                "[Store Storage] An error occurred during hydration:",
                error
              );
            } else {
              console.log(
                `[Store Storage] Hydration finished in ${(
                  endTime - startTime
                ).toFixed(2)}ms`
              );

              if (state && !storeInitialized) {
                console.log(
                  "[Store Storage] Setting core initialized on first hydration"
                );
                // Set initialized immediately
                state.core = {
                  ...state.core,
                  isInitialized: true,
                  lastUpdate: new Date(),
                };
                storeInitialized = true;
              }
            }
          };
        },
      }
    )
  );
};

export const useStore = createStore();

// Now that useStore is defined, optimize the initialization
useStore.persist.onFinishHydration(() => {
  console.log("[Store Storage] onFinishHydration callback triggered");

  // Get current state and setState directly from the store instance
  const currentState = useStore.getState();

  if (!currentState.core.isInitialized && !storeInitialized) {
    console.log(
      "[Store Storage] Core is not initialized. Setting isInitialized to true."
    );
    useStore.setState((state) => ({
      core: {
        ...state.core,
        isInitialized: true,
        lastUpdate: new Date(),
      },
    }));
    storeInitialized = true;
  } else {
    console.log("[Store Storage] Core already initialized. No state change.");
  }
});

export const useUser = () => {
  const store = useStore();
  return {
    ...store.user,
    ...store.actions.user,
  };
};

export const useUserActions = () => {
  const store = useStore();
  return store.actions.user;
};

export const useFlight = () => {
  const store = useStore();
  return {
    ...store.flight,
    ...store.actions.flight,
  };
};

export const useFlightActions = () => {
  const store = useStore();
  return store.actions.flight;
};

export const useNavigation = () => {
  const store = useStore();
  return {
    ...store.navigation,
    ...store.actions.navigation,
  };
};

export const useNavigationActions = () => {
  const store = useStore();
  return store.actions.navigation;
};

export const useValidation = () => {
  const store = useStore();
  return {
    ...store.validation,
    ...store.actions.validation,
  };
};

export const useValidationActions = () => {
  const store = useStore();
  return store.actions.validation;
};

export const usePhase = () => {
  const store = useStore();
  return {
    ...store.phase,
    ...store.actions.phase,
  };
};

export const usePhaseActions = () => {
  const store = useStore();
  return store.actions.phase;
};

export const useWizard = () => {
  const store = useStore();
  return {
    currentStep: store.wizard.currentStep,
    totalSteps: store.wizard.totalSteps,
    answers: store.wizard.answers,
    questions: store.wizard.questions,
    isValid: store.wizard.isValid,
    isComplete: store.wizard.isComplete,
    isLoading: store.wizard.isLoading,
    error: store.wizard.error,
    lastUpdate: store.wizard.lastUpdate,
    setQuestions: store.actions.wizard.setQuestions,
    setCurrentStep: store.actions.wizard.setCurrentStep,
    setAnswer: store.actions.wizard.setAnswer,
    resetWizard: store.actions.wizard.resetWizard,
    validateStep: store.actions.wizard.validateStep,
    completeWizard: store.actions.wizard.completeWizard,
    checkStepValidity: store.actions.wizard.checkStepValidity,
    setStepValidationStatus: store.actions.wizard.setStepValidationStatus,
  };
};

export const usePhase4 = () => {
  const store = useStore();
  return {
    ...store.phase4,
    ...store.actions.phase4,
  };
};

export const useClaim = () => {
  const store = useStore();
  return {
    ...store.claimData,
    ...store.actions.claim,
  };
};

export const useTravelStatusWizard = (selector: any, deps: any[] = []) => {
  // First get the raw store state and actions
  const travelStatusWizard = useStore((state) => state.travelStatusWizard);
  const travelStatusWizardActions = useStore(
    (state) => state.actions.travelStatusWizard
  );

  // Then use useMemo to create a stable combined object
  return useMemo(() => {
    const combined = {
      ...travelStatusWizard,
      ...travelStatusWizardActions,
    };
    return selector(combined);
  }, [selector, travelStatusWizard, travelStatusWizardActions, ...deps]);
};

export const useInformedDateWizard = (selector: any, deps: any[] = []) => {
  // First get the raw store state and actions
  const informedDateWizard = useStore((state) => state.informedDateWizard);
  const informedDateWizardActions = useStore(
    (state) => state.actions.informedDateWizard
  );

  // Then use useMemo to create a stable combined object
  return useMemo(() => {
    const combined = {
      ...informedDateWizard,
      ...informedDateWizardActions,
    };
    return selector(combined);
  }, [selector, informedDateWizard, informedDateWizardActions, ...deps]);
};

export default useStore;
