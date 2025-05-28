import type { ValidationPhase } from "@/types/shared/validation";

// NOTE: Reverted previous changes to StoreState/StoreActions
// Keep only Validation-related types here

export interface ValidationState {
  stepValidation: Record<ValidationPhase, boolean>;
  stepCompleted: Record<ValidationPhase, boolean>;
  stepInteraction: Record<ValidationPhase, boolean>;
  stepSummary: Record<ValidationPhase, string>;
  errors: Record<ValidationPhase, string[]>; // Assuming errors per phase
  fieldErrors: Record<string, string[]>;
  isValid: boolean;
  isComplete: boolean;
  _timestamp: number;
}

export interface ValidationActions {
  setStepValidation: (phase: ValidationPhase, isValid: boolean) => void;
  setStepCompleted: (phase: ValidationPhase, isComplete: boolean) => void;
  setStepInteraction: (phase: ValidationPhase, hasInteracted: boolean) => void;
  setStepSummary: (phase: ValidationPhase, summary: string) => void;
  addStepError: (phase: ValidationPhase, error: string) => void; // Assuming error is string
  clearStepErrors: (phase: ValidationPhase) => void;
  addFieldError: (field: string, error: string) => void;
  clearFieldErrors: (field: string) => void;
  setIsValid: (isValid: boolean) => void;
  setIsComplete: (isComplete: boolean) => void;
  resetValidation: () => void;
}

// Removed PhaseValidationState as it wasn't found/used consistently
// Removed ValidationSlice interface placeholder
