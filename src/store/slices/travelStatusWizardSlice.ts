import { StateCreator } from "zustand";
import { Store } from "../types";
import type { Answer } from "@/types/shared/wizard";

// Travel Status Wizard State
export interface TravelStatusWizardState {
  answers: Answer[];
  currentStep: number;
  showingSuccess: boolean;
  isValid: boolean;
  stepValidation: Record<string, boolean>;
  stepInteraction: Record<string, boolean>;
}

// Travel Status Wizard Actions
export interface TravelStatusWizardActions {
  setAnswer: (questionId: string, value: any) => void;
  setCurrentStep: (step: number) => void;
  setShowingSuccess: (isShowing: boolean) => void;
  setIsValid: (isValid: boolean) => void;
  setStepValidation: (stepId: string, isValid: boolean) => void;
  setStepInteraction: (stepId: string, hasInteracted: boolean) => void;
  resetState: () => void;
  completeWizard: () => void;
  checkStepValidity: (step: number) => boolean;
  resetWizard: () => void;
}

// Initial state
const initialState: TravelStatusWizardState = {
  answers: [],
  currentStep: 0,
  showingSuccess: false,
  isValid: false,
  stepValidation: {},
  stepInteraction: {},
};

// Create the slice
export const createTravelStatusWizardSlice: StateCreator<
  Store,
  [],
  [],
  {
    travelStatusWizard: TravelStatusWizardState;
    actions: { travelStatusWizard: TravelStatusWizardActions };
  }
> = (set, get) => {
  return {
    travelStatusWizard: initialState,
    actions: {
      travelStatusWizard: {
        setAnswer: (questionId, value) => {
          set((state) => {
            const currentAnswers = [...state.travelStatusWizard.answers];
            const answer = {
              id: questionId,
              questionId,
              value,
              timestamp: Date.now(),
              isValid: Boolean(value),
              validationErrors: [],
            };

            const existingIndex = currentAnswers.findIndex(
              (a) => a.questionId === questionId
            );

            if (existingIndex !== -1) {
              currentAnswers[existingIndex] = answer;
            } else {
              currentAnswers.push(answer);
            }

            // Also sync with phase4 store
            get().actions.phase4.setWizardAnswer(answer);

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                answers: currentAnswers,
              },
            };
          });
        },

        setCurrentStep: (step) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusCurrentStep: step,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                currentStep: step,
              },
            };
          });
        },

        setShowingSuccess: (isShowing) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusShowingSuccess: isShowing,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                showingSuccess: isShowing,
              },
            };
          });
        },

        setIsValid: (isValid) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusIsValid: isValid,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                isValid,
              },
            };
          });
        },

        setStepValidation: (stepId, isValid) => {
          set((state) => {
            const updatedValidation = {
              ...state.travelStatusWizard.stepValidation,
              [stepId]: isValid,
            };

            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusStepValidation: updatedValidation,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                stepValidation: updatedValidation,
              },
            };
          });
        },

        setStepInteraction: (stepId, hasInteracted) => {
          set((state) => {
            const updatedInteraction = {
              ...state.travelStatusWizard.stepInteraction,
              [stepId]: hasInteracted,
            };

            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusStepInteraction: updatedInteraction,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                stepInteraction: updatedInteraction,
              },
            };
          });
        },

        resetState: () => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.resetTravelStatusState();

            return {
              travelStatusWizard: initialState,
            };
          });
        },

        completeWizard: () => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              travelStatusShowingSuccess: true,
              travelStatusIsValid: true,
            });

            return {
              travelStatusWizard: {
                ...state.travelStatusWizard,
                showingSuccess: true,
                isValid: true,
              },
            };
          });
        },

        // Add the checkStepValidity function
        checkStepValidity: (step) => {
          // This is a simple implementation - you may need to adjust it
          // based on your actual step validation logic
          const state = get().travelStatusWizard;
          const stepId = Object.keys(state.stepValidation)[step];

          if (stepId && state.stepValidation[stepId]) {
            return true;
          }

          // If no specific validation exists, check if there's a corresponding answer
          if (state.answers.length > 0) {
            // Assume step relates to question index
            const questionId = Object.keys(state.stepInteraction)[step];
            return state.answers.some(
              (a) =>
                a.questionId === questionId &&
                a.value !== undefined &&
                a.value !== null
            );
          }

          return false;
        },

        // Add resetWizard as an alias for resetState to maintain compatibility
        resetWizard: () => {
          get().actions.travelStatusWizard.resetState();
        },
      },
    },
  };
};
