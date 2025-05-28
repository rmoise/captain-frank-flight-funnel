"use server";

import { ValidationPhase } from "../../types/shared/validation";

interface ValidationStateAction {
  phase: ValidationPhase;
  isValid: boolean;
}

/**
 * Server action to update validation state
 */
export async function updateValidationState(
  phase: ValidationPhase,
  isValid: boolean
): Promise<ValidationStateAction> {
  // Server-side validation logic can be added here as needed
  return {
    phase,
    isValid,
  };
}
