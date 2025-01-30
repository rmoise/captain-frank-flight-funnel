import { useStore } from './store';
import type { Answer } from '@/types/wizard';
import type { StoreState, ValidationStateSteps } from './store';

interface WizardStateSlice {
  isCompleted: boolean;
  isValid: boolean;
  successMessage: string;
}

interface WizardActionsSlice {
  validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => void;
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
}

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

// Type for the store that includes both state and actions
type StoreStateWithActions = StoreState & {
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
};

const selectWizardState = (state: StoreStateWithActions): WizardStateSlice => ({
  isCompleted: state.wizardIsCompleted,
  isValid: state.wizardIsValid,
  successMessage: state.wizardSuccessMessage,
});

const selectWizardActions = (
  state: StoreStateWithActions
): WizardActionsSlice => ({
  validateAndUpdateStep: state.validateAndUpdateStep,
  batchUpdateWizardState: state.batchUpdateWizardState,
});

export const useWizardState = (): WizardState => {
  const wizardAnswers = useStore(
    (state: StoreStateWithActions) => state.wizardAnswers
  );
  const wizardCurrentSteps = useStore(
    (state: StoreStateWithActions) => state.wizardCurrentSteps
  );
  const wizardState = useStore(selectWizardState);
  const wizardActions = useStore(selectWizardActions);

  return {
    // State
    wizardAnswers,
    wizardCurrentSteps,
    wizardIsCompleted: wizardState.isCompleted,
    wizardIsValid: wizardState.isValid,
    wizardSuccessMessage: wizardState.successMessage,
    completedWizards: {},
    wizardShowingSuccess: false,
    wizardIsEditingMoney: false,
    wizardLastActiveStep: null,
    wizardValidationState: {},
    wizardIsValidating: false,

    // Actions
    ...wizardActions,
    setWizardAnswers: () => {},
    setWizardValidationState: () => {},
    markWizardComplete: () => {},
    isWizardCompleted: () => false,
    validateQAWizard: () => ({
      isValid: false,
      answers: [],
      bookingNumber: '',
    }),
    setWizardShowingSuccess: () => {},
    initializeStore: () => {},
  };
};
