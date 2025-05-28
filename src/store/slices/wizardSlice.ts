import { StateCreator } from "zustand";
import { Store } from "../types";
import type { Answer } from "@/types/shared/wizard";

// Types for Travel Status Wizard
export interface TravelStatusWizardState {
  answers: Answer[];
  currentStep: number;
  showingSuccess: boolean;
  isValid: boolean;
  stepValidation: Record<string, boolean>;
  stepInteraction: Record<string, boolean>;
}

// Types for Informed Date Wizard
export interface InformedDateWizardState {
  answers: Answer[];
  currentStep: number;
  showingSuccess: boolean;
  isValid: boolean;
  stepValidation: Record<string, boolean>;
  stepInteraction: Record<string, boolean>;
}

// Extended Wizard State to include both specialized wizards
export interface WizardState {
  // Existing general wizard state
  currentStep: number;
  totalSteps: number;
  answers: Answer[];
  questions: any[];
  isValid: boolean;
  isComplete: boolean;
  lastUpdate: number;

  // New specialized wizard states
  travelStatus: TravelStatusWizardState;
  informedDate: InformedDateWizardState;
}

export interface WizardActions {
  // Existing wizard actions
  setQuestions: (questions: any[]) => void;
  setCurrentStep: (step: number) => void;
  setAnswer: (questionId: string, value: any) => void;
  setTotalSteps: (totalSteps: number) => void;
  setValid: (isValid: boolean) => void;

  // Required methods to match store/types.ts
  resetWizard: () => void;
  validateStep: (step: number) => boolean;
  completeWizard: () => void;
  checkStepValidity: (step: number) => boolean;
  setStepValidationStatus: (step: number) => boolean;

  // Deprecated methods (keeping for backward compatibility)
  complete: () => void;
  reset: () => void;

  // New Travel Status wizard actions
  travelStatus: {
    setAnswer: (answer: Answer) => void;
    setCurrentStep: (step: number) => void;
    setShowingSuccess: (isShowing: boolean) => void;
    setIsValid: (isValid: boolean) => void;
    setStepValidation: (stepId: string, isValid: boolean) => void;
    setStepInteraction: (stepId: string, hasInteracted: boolean) => void;
    resetState: () => void;
    completeWizard: () => void;
  };

  // New Informed Date wizard actions
  informedDate: {
    setAnswer: (answer: Answer) => void;
    setCurrentStep: (step: number) => void;
    setShowingSuccess: (isShowing: boolean) => void;
    setIsValid: (isValid: boolean) => void;
    setStepValidation: (stepId: string, isValid: boolean) => void;
    setStepInteraction: (stepId: string, hasInteracted: boolean) => void;
    resetState: () => void;
    completeWizard: () => void;
  };
}

// Initial states
const initialTravelStatusState: TravelStatusWizardState = {
  answers: [],
  currentStep: 0,
  showingSuccess: false,
  isValid: false,
  stepValidation: {},
  stepInteraction: {},
};

const initialInformedDateState: InformedDateWizardState = {
  answers: [],
  currentStep: 0,
  showingSuccess: false,
  isValid: false,
  stepValidation: {},
  stepInteraction: {},
};

export const createWizardSlice: StateCreator<
  Store,
  [],
  [],
  { wizard: WizardState; actions: { wizard: WizardActions } }
> = (set, get) => {
  return {
    wizard: {
      // Existing wizard state
      currentStep: 0,
      totalSteps: 0,
      answers: [],
      questions: [],
      isValid: false,
      isComplete: false,
      lastUpdate: Date.now(),

      // New specialized wizard states
      travelStatus: initialTravelStatusState,
      informedDate: initialInformedDateState,
    },
    actions: {
      wizard: {
        // Existing wizard actions
        setCurrentStep: (step) => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              currentStep: step,
              lastUpdate: Date.now(),
            },
          }));
        },
        setTotalSteps: (totalSteps) => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              totalSteps,
              lastUpdate: Date.now(),
            },
          }));
        },
        setAnswer: (questionId, value) => {
          set((state) => {
            const currentAnswers = [...state.wizard.answers];
            const existingIndex = currentAnswers.findIndex(
              (a) => a.questionId === questionId
            );

            const answer: Answer = {
              id: questionId, // Using questionId as id
              questionId,
              value,
              timestamp: Date.now(),
              isValid: true, // Assuming valid by default
              validationErrors: [], // No errors by default
            };

            if (existingIndex !== -1) {
              currentAnswers[existingIndex] = answer;
            } else {
              currentAnswers.push(answer);
            }

            return {
              wizard: {
                ...state.wizard,
                answers: currentAnswers,
                lastUpdate: Date.now(),
              },
            };
          });
        },
        setQuestions: (questions) => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              questions,
              lastUpdate: Date.now(),
            },
          }));
        },
        setValid: (isValid) => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              isValid,
              lastUpdate: Date.now(),
            },
          }));
        },

        // New required methods to match store/types.ts
        resetWizard: () => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              currentStep: 0,
              isValid: false,
              isComplete: false,
              answers: [],
              lastUpdate: Date.now(),
            },
          }));
        },
        validateStep: (step) => {
          const state = get();
          const questions = state.wizard.questions;
          const answers = state.wizard.answers;

          // Get questions for this step - using index-based approach since Question doesn't have a step property
          // For simplicity, assume the question at index 'step' is the one we want to validate
          const stepQuestion = questions[step];
          if (!stepQuestion) return true; // If no question found, assume valid

          // Check if all required questions have answers
          if (!stepQuestion.required) return true;

          const answer = answers.find((a) => a.questionId === stepQuestion.id);
          return (
            answer !== undefined &&
            answer.value !== undefined &&
            answer.value !== null &&
            answer.value !== ""
          );
        },
        completeWizard: () => {
          set((state) => ({
            wizard: {
              ...state.wizard,
              isComplete: true,
              lastUpdate: Date.now(),
            },
          }));
        },
        checkStepValidity: (step) => {
          const state = get();
          const questions = state.wizard.questions;
          const answers = state.wizard.answers;

          // Using index-based approach since Question doesn't have a step property
          const question = questions[step];

          if (!question) return true; // If no question found, assume valid

          // Skip validation for non-required questions
          if (!question.required) return true;

          // Find answer for this question
          const answer = answers.find((a) => a.questionId === question.id);

          // Check if answer exists and has a valid value
          return (
            answer !== undefined &&
            answer.value !== undefined &&
            answer.value !== null &&
            answer.value !== ""
          );
        },
        setStepValidationStatus: (step) => {
          const isValid = get().actions.wizard.checkStepValidity(step);

          set((state) => ({
            wizard: {
              ...state.wizard,
              // Could store step validation in a map if needed
              isValid: isValid,
              lastUpdate: Date.now(),
            },
          }));

          return isValid;
        },

        // Keep legacy methods for backward compatibility
        complete: () => {
          get().actions.wizard.completeWizard();
        },
        reset: () => {
          get().actions.wizard.resetWizard();
        },

        // New Travel Status wizard actions
        travelStatus: {
          setAnswer: (answer) => {
            set((state) => {
              const currentAnswers = [...state.wizard.travelStatus.answers];
              const existingIndex = currentAnswers.findIndex(
                (a) => a.questionId === answer.questionId
              );

              if (existingIndex !== -1) {
                currentAnswers[existingIndex] = answer;
              } else {
                currentAnswers.push(answer);
              }

              // Also sync with phase4 store
              get().actions.phase4.setWizardAnswer(answer);

              return {
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    answers: currentAnswers,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    currentStep: step,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    showingSuccess: isShowing,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    isValid,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          setStepValidation: (stepId, isValid) => {
            set((state) => {
              const updatedValidation = {
                ...state.wizard.travelStatus.stepValidation,
                [stepId]: isValid,
              };

              // Also sync with phase4 store
              get().actions.phase4.updateValidationState({
                travelStatusStepValidation: updatedValidation,
              });

              return {
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    stepValidation: updatedValidation,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          setStepInteraction: (stepId, hasInteracted) => {
            set((state) => {
              const updatedInteraction = {
                ...state.wizard.travelStatus.stepInteraction,
                [stepId]: hasInteracted,
              };

              // Also sync with phase4 store
              get().actions.phase4.updateValidationState({
                travelStatusStepInteraction: updatedInteraction,
              });

              return {
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    stepInteraction: updatedInteraction,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          resetState: () => {
            set((state) => {
              // Also sync with phase4 store
              get().actions.phase4.resetTravelStatusState();

              return {
                wizard: {
                  ...state.wizard,
                  travelStatus: initialTravelStatusState,
                  lastUpdate: Date.now(),
                },
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
                wizard: {
                  ...state.wizard,
                  travelStatus: {
                    ...state.wizard.travelStatus,
                    showingSuccess: true,
                    isValid: true,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
        },

        // New Informed Date wizard actions
        informedDate: {
          setAnswer: (answer) => {
            set((state) => {
              const currentAnswers = [...state.wizard.informedDate.answers];
              const existingIndex = currentAnswers.findIndex(
                (a) => a.questionId === answer.questionId
              );

              if (existingIndex !== -1) {
                currentAnswers[existingIndex] = answer;
              } else {
                currentAnswers.push(answer);
              }

              // Also sync with phase4 store
              get().actions.phase4.setWizardAnswer(answer);

              return {
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    answers: currentAnswers,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    currentStep: step,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    showingSuccess: isShowing,
                  },
                  lastUpdate: Date.now(),
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
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    isValid,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          setStepValidation: (stepId, isValid) => {
            set((state) => {
              const updatedValidation = {
                ...state.wizard.informedDate.stepValidation,
                [stepId]: isValid,
              };

              // Also sync with phase4 store
              get().actions.phase4.updateValidationState({
                informedDateStepValidation: updatedValidation,
              });

              return {
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    stepValidation: updatedValidation,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          setStepInteraction: (stepId, hasInteracted) => {
            set((state) => {
              const updatedInteraction = {
                ...state.wizard.informedDate.stepInteraction,
                [stepId]: hasInteracted,
              };

              // Also sync with phase4 store
              get().actions.phase4.updateValidationState({
                informedDateStepInteraction: updatedInteraction,
              });

              return {
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    stepInteraction: updatedInteraction,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
          resetState: () => {
            set((state) => {
              // Also sync with phase4 store
              get().actions.phase4.resetInformedDateState();

              return {
                wizard: {
                  ...state.wizard,
                  informedDate: initialInformedDateState,
                  lastUpdate: Date.now(),
                },
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
                wizard: {
                  ...state.wizard,
                  informedDate: {
                    ...state.wizard.informedDate,
                    showingSuccess: true,
                    isValid: true,
                  },
                  lastUpdate: Date.now(),
                },
              };
            });
          },
        },
      },
    },
  };
};
