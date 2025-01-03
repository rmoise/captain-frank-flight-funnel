import { useStore } from './store';
import type { Answer } from '@/types/wizard';
import type { StoreState, ValidationStateSteps } from './store';

export interface WizardState {
  // State
  wizardAnswers: Answer[];
  wizardCurrentSteps: Record<string, number>;
  wizardIsCompleted: boolean;
  wizardIsValid: boolean;
  completedWizards: Record<string, boolean>;
  wizardShowingSuccess: boolean;
  wizardSuccessMessage: string;
  wizardIsEditingMoney: boolean;
  wizardLastActiveStep: number | null;
  wizardValidationState: Record<number, boolean>;
  wizardIsValidating: boolean;

  // Actions
  setWizardAnswers: (answers: Answer[]) => void;
  validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => void;
  setWizardValidationState: (state: Record<number, boolean>) => void;
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
  markWizardComplete: (wizardId: string) => void;
  isWizardCompleted: (wizardId: string) => boolean;
  validateQAWizard: () => {
    isValid: boolean;
    answers: Answer[];
    bookingNumber: string;
  };
  setWizardShowingSuccess: (showing: boolean) => void;
  initializeStore: () => void;
}

export const useWizardState = (): WizardState => {
  const state = useStore((state) => ({
    // State
    wizardAnswers: state.wizardAnswers as Answer[],
    wizardCurrentSteps: state.wizardCurrentSteps,
    wizardIsCompleted: state.wizardIsCompleted,
    wizardIsValid: state.wizardIsValid,
    completedWizards: state.completedWizards,
    wizardShowingSuccess: state.wizardShowingSuccess,
    wizardSuccessMessage: state.wizardSuccessMessage,
    wizardIsEditingMoney: state.wizardIsEditingMoney,
    wizardLastActiveStep: state.wizardLastActiveStep,
    wizardValidationState: state.wizardValidationState,
    wizardIsValidating: state.wizardIsValidating,

    // Actions
    setWizardAnswers: state.setWizardAnswers,
    validateAndUpdateStep: state.validateAndUpdateStep,
    setWizardValidationState: state.setWizardValidationState,
    batchUpdateWizardState: state.batchUpdateWizardState,
    markWizardComplete: state.markWizardComplete,
    isWizardCompleted: state.isWizardCompleted,
    validateQAWizard: state.validateQAWizard,
    setWizardShowingSuccess: state.setWizardShowingSuccess,
    initializeStore: state.initializeStore,
  }));

  return state;
};
