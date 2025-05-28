import { StateCreator } from "zustand";
import { Store } from "../types";
import type { Answer } from "@/types/shared/wizard";

// Informed Date Wizard State
export interface InformedDateWizardState {
  answers: Answer[];
  currentStep: number;
  showingSuccess: boolean;
  isValid: boolean;
  stepValidation: Record<string, boolean>;
  stepInteraction: Record<string, boolean>;
}

// Informed Date Wizard Actions
export interface InformedDateWizardActions {
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
const initialState: InformedDateWizardState = {
  answers: [],
  currentStep: 0,
  showingSuccess: false,
  isValid: false,
  stepValidation: {},
  stepInteraction: {},
};

// Create the slice
export const createInformedDateWizardSlice: StateCreator<
  Store,
  [],
  [],
  {
    informedDateWizard: InformedDateWizardState;
    actions: { informedDateWizard: InformedDateWizardActions };
  }
> = (set, get) => {
  return {
    informedDateWizard: initialState,
    actions: {
      informedDateWizard: {
        setAnswer: (questionId, value) => {
          set((state) => {
            const currentAnswers = [...state.informedDateWizard.answers];
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
              informedDateWizard: {
                ...state.informedDateWizard,
                answers: currentAnswers,
              },
            };
          });
        },

        setCurrentStep: (step) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateCurrentStep: step,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
                currentStep: step,
              },
            };
          });
        },

        setShowingSuccess: (isShowing) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateShowingSuccess: isShowing,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
                showingSuccess: isShowing,
              },
            };
          });
        },

        setIsValid: (isValid) => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateIsValid: isValid,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
                isValid,
              },
            };
          });
        },

        setStepValidation: (stepId, isValid) => {
          set((state) => {
            const updatedValidation = {
              ...state.informedDateWizard.stepValidation,
              [stepId]: isValid,
            };

            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateStepValidation: updatedValidation,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
                stepValidation: updatedValidation,
              },
            };
          });
        },

        setStepInteraction: (stepId, hasInteracted) => {
          set((state) => {
            const updatedInteraction = {
              ...state.informedDateWizard.stepInteraction,
              [stepId]: hasInteracted,
            };

            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateStepInteraction: updatedInteraction,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
                stepInteraction: updatedInteraction,
              },
            };
          });
        },

        resetState: () => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.resetInformedDateState();

            return {
              informedDateWizard: initialState,
            };
          });
        },

        completeWizard: () => {
          set((state) => {
            // Also sync with phase4 store
            get().actions.phase4.updateValidationState({
              informedDateShowingSuccess: true,
              informedDateIsValid: true,
            });

            return {
              informedDateWizard: {
                ...state.informedDateWizard,
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
          const state = get().informedDateWizard;
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
          get().actions.informedDateWizard.resetState();
        },
      },
    },
  };
};
