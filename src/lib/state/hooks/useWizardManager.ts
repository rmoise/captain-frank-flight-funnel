'use client';

import { useStore } from '@/lib/state/store';

export function useWizardManager() {
  const store = useStore();

  return {
    // Expose the current wizard state
    wizardCurrentSteps: store.wizardCurrentSteps,
    wizardAnswers: store.wizardAnswers,
    wizardIsValidating: store.wizardIsValidating,
    wizardValidationState: store.wizardValidationState,
    wizardIsCompleted: store.wizardIsCompleted,
    wizardSuccessMessage: store.wizardSuccessMessage,
    wizardShowingSuccess: store.wizardShowingSuccess,
    wizardIsEditingMoney: store.wizardIsEditingMoney,
    wizardLastActiveStep: store.wizardLastActiveStep,

    // Expose the update function
    batchUpdateWizardState: store.batchUpdateWizardState,

    // Expose the validation function
    validateAndUpdateStep: store.validateAndUpdateStep,
  };
}
