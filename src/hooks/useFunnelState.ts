import { useCallback, useEffect } from 'react';
import useStore from '@/lib/state/store';
import type { ValidationStep } from '@/lib/state/types';
import { ensureValidationState } from '@/lib/state/slices/validationSlice';

// Map phase numbers to validation steps
const PHASE_TO_STEP: Record<number, ValidationStep> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

export function useFunnelState() {
  const {
    validationState,
    updateValidationState,
    selectedFlights,
    wizardAnswers,
    personalDetails,
    termsAccepted,
    privacyAccepted,
    currentPhase,
  } = useStore();

  // Handle transitions between steps
  const handleStepTransition = useCallback(async (fromStep: ValidationStep) => {
    const state = useStore.getState();
    const currentValidationState = ensureValidationState(state.validationState);
    const validFromStep = fromStep;
    const canTransition = currentValidationState.stepValidation[validFromStep];
    const delay = currentValidationState.stepInteraction[validFromStep]
      ? 500
      : 0;

    return { canTransition, delay };
  }, []);

  // Validate current step
  const validateCurrentStep = useCallback(async () => {
    const validationStep = PHASE_TO_STEP[currentPhase] || 1;
    let isValid = false;

    switch (validationStep) {
      case 1: // Flight selection
        isValid = selectedFlights?.length > 0;
        break;
      case 2: // Wizard answers
        isValid = wizardAnswers?.length > 0;
        break;
      case 3: // Personal details
        isValid = !!(
          personalDetails?.firstName &&
          personalDetails?.lastName &&
          personalDetails?.email
        );
        break;
      case 4: // Terms
        isValid = termsAccepted && privacyAccepted;
        break;
      default:
        isValid = false;
    }

    // Ensure validationState is properly initialized with all required steps
    const currentValidationState = ensureValidationState(validationState);

    // Check if the validation state has changed
    const currentStepValidation =
      currentValidationState.stepValidation[validationStep];
    if (isValid !== currentStepValidation) {
      updateValidationState({
        ...currentValidationState,
        stepValidation: {
          ...currentValidationState.stepValidation,
          [validationStep]: isValid,
        },
      });
    }

    return isValid;
  }, [
    currentPhase,
    selectedFlights,
    wizardAnswers,
    personalDetails,
    termsAccepted,
    privacyAccepted,
    validationState,
    updateValidationState,
  ]);

  // Auto-validate when dependencies change
  useEffect(() => {
    validateCurrentStep();
  }, [
    validateCurrentStep,
    selectedFlights,
    wizardAnswers,
    personalDetails,
    termsAccepted,
    privacyAccepted,
  ]);

  // Get next step
  const getNextStep = useCallback((currentStep: ValidationStep) => {
    return (
      currentStep < 4 ? ((currentStep + 1) as ValidationStep) : null
    ) as ValidationStep | null;
  }, []);

  return {
    handleStepTransition,
    validateCurrentStep,
    getNextStep,
    validationState: ensureValidationState(validationState),
    currentPhase,
  };
}
