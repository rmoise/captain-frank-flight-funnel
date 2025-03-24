import useStore from '@/lib/state/store';
import type { Answer } from '@/types/wizard';
import type { Store } from '@/lib/state/store';
import type { StoreState, ValidationStep, WizardSlice } from './types';
import type { WizardActions } from './slices/wizardSlice';

export interface WizardState extends WizardSlice {
  // Additional state and actions specific to wizard state
  initializeStore: () => void;
  validateAndUpdateStep: (step: ValidationStep) => boolean;
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
  setWizardAnswers: (answers: Answer[]) => void;
  setWizardShowingSuccess: (showing: boolean) => void;
  setWizardValidationState: (state: Record<string, boolean>) => void;
  markWizardComplete: (wizardId: string) => void;
  isWizardCompleted: (wizardId: string) => boolean;
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  handleWizardComplete: (wizardId: string, answers: Answer[], successMessage: string) => boolean;
  handleTripExperienceComplete: () => void;
  handleInformedDateComplete: () => void;
  setLastAnsweredQuestion: (questionId: string | null) => void;
  updateWizardAnswer: (questionId: string, answer: string) => void;
  setWizardLastActiveStep: (step: number) => void;
  setWizardIsValid: (isValid: boolean) => void;
  setWizardIsCompleted: (isCompleted: boolean) => void;
}

export const useWizardState = (): WizardState => {
  const store = useStore();
  const wizardAnswers = useStore((state) => state.wizardAnswers);
  const wizardCurrentSteps = useStore((state) => state.wizardCurrentSteps);

  // Cast store to Store type to ensure TypeScript recognizes all actions
  const typedStore = store as Store & WizardActions;

  return {
    // State from WizardSlice
    wizardAnswers,
    wizardCurrentSteps,
    wizardShowingSuccess: typedStore.wizardShowingSuccess,
    wizardSuccessMessage: typedStore.wizardSuccessMessage,
    wizardIsCompleted: typedStore.wizardIsCompleted,
    wizardIsValid: typedStore.wizardIsValid,
    wizardIsValidating: typedStore.wizardIsValidating,
    lastAnsweredQuestion: typedStore.lastAnsweredQuestion,
    completedWizards: typedStore.completedWizards,
    lastValidAnswers: typedStore.lastValidAnswers,
    lastValidStep: typedStore.lastValidStep,
    wizardIsEditingMoney: typedStore.wizardIsEditingMoney,
    wizardLastActiveStep: typedStore.wizardLastActiveStep,
    wizardValidationState: typedStore.wizardValidationState,
    wizardSuccessStates: typedStore.wizardSuccessStates,
    tripExperienceAnswers: typedStore.tripExperienceAnswers,
    wizardQuestions: typedStore.wizardQuestions,

    // Actions
    validateAndUpdateStep: typedStore.validateAndUpdateStep,
    batchUpdateWizardState: typedStore.batchUpdateWizardState,
    setWizardAnswers: typedStore.setWizardAnswers,
    setWizardShowingSuccess: typedStore.setWizardShowingSuccess,
    setWizardValidationState: typedStore.setWizardValidationState,
    markWizardComplete: typedStore.markWizardComplete,
    isWizardCompleted: typedStore.isWizardCompleted,
    validateQAWizard: () => {
      const result = typedStore.validateQAWizard();
      return {
        isValid: result.isValid,
        answers: result.answers,
        bookingNumber: result.bookingNumber
      };
    },
    handleWizardComplete: typedStore.handleWizardComplete,
    handleTripExperienceComplete: typedStore.handleTripExperienceComplete,
    handleInformedDateComplete: typedStore.handleInformedDateComplete,
    setLastAnsweredQuestion: typedStore.setLastAnsweredQuestion,
    updateWizardAnswer: typedStore.updateWizardAnswer,
    setWizardLastActiveStep: typedStore.setWizardLastActiveStep,
    setWizardIsValid: typedStore.setWizardIsValid,
    setWizardIsCompleted: typedStore.setWizardIsCompleted,
    initializeStore: typedStore.initializeStore
  };
};
