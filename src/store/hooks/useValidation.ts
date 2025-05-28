import { useCallback } from "react";
import useStore from "@/store";
import {
  ValidationPhase,
  ValidationState,
  ValidationActions,
} from "@/types/shared/validation";

interface StepValidationState {
  isValid: boolean;
  isComplete: boolean;
  hasInteracted: boolean;
  timestamp: number;
}

interface ValidationHookActions {
  setStepValidation: (phase: ValidationPhase, isValid: boolean) => void;
  setStepCompleted: (phase: ValidationPhase, isComplete: boolean) => void;
  getStepValidation: (phase: ValidationPhase) => StepValidationState;
  setStepSummary: (phase: ValidationPhase, summary: string) => void;
}

export function useValidation(): ValidationHookActions {
  const store = useStore();

  const setStepValidation = useCallback(
    (phase: ValidationPhase, isValid: boolean) => {
      store.actions.validation.setStepValidation(phase, isValid);
    },
    [store.actions.validation]
  );

  const setStepCompleted = useCallback(
    (phase: ValidationPhase, isComplete: boolean) => {
      store.actions.validation.setStepCompleted(phase, isComplete);
    },
    [store.actions.validation]
  );

  const setStepSummary = useCallback(
    (phase: ValidationPhase, summary: string) => {
      store.actions.validation.setStepSummary(phase, summary);
    },
    [store.actions.validation]
  );

  const getStepValidation = useCallback(
    (phase: ValidationPhase): StepValidationState => {
      return {
        isValid: store.validation.stepValidation[phase] || false,
        isComplete: store.validation.stepCompleted[phase] || false,
        hasInteracted: store.validation.stepInteraction[phase] || false,
        timestamp: store.validation._timestamp,
      };
    },
    [store.validation]
  );

  return {
    setStepValidation,
    setStepCompleted,
    getStepValidation,
    setStepSummary,
  };
}
