import { useRouter } from "next/navigation";
import { ValidationPhase } from "@/types/shared/validation";
import { navigateToPhase } from "./phaseNavigation";

// Map of phases to their numeric values
const phaseToNumber: Record<ValidationPhase, number> = {
  // Application phases
  [ValidationPhase.INITIAL_ASSESSMENT]: 1,
  [ValidationPhase.COMPENSATION_ESTIMATE]: 2,
  [ValidationPhase.PERSONAL_DETAILS]: 3,
  [ValidationPhase.TERMS_AND_CONDITIONS]: 4,
  [ValidationPhase.SUMMARY]: 5,
  [ValidationPhase.CONFIRMATION]: 6,
  [ValidationPhase.FLIGHT_DETAILS]: 7,
  [ValidationPhase.TRIP_EXPERIENCE]: 8,
  [ValidationPhase.CLAIM_SUCCESS]: 9,
  [ValidationPhase.CLAIM_REJECTED]: 10,
  [ValidationPhase.AGREEMENT]: 11,
  [ValidationPhase.CLAIM_SUBMITTED]: 12,

  // Wizard phases
  [ValidationPhase.INITIAL]: 13,
  [ValidationPhase.EXPERIENCE]: 14,
  [ValidationPhase.JOURNEY]: 15,
  [ValidationPhase.FINAL]: 16,

  // Step-based validation phases
  [ValidationPhase.STEP_1]: 17,
  [ValidationPhase.STEP_2]: 18,
  [ValidationPhase.STEP_3]: 19,
  [ValidationPhase.STEP_4]: 20,
  [ValidationPhase.STEP_5]: 21,
};

// Map of numeric values to phases
const numberToPhase: Record<number, ValidationPhase> = {
  1: ValidationPhase.INITIAL_ASSESSMENT,
  2: ValidationPhase.COMPENSATION_ESTIMATE,
  3: ValidationPhase.PERSONAL_DETAILS,
  4: ValidationPhase.TERMS_AND_CONDITIONS,
  5: ValidationPhase.SUMMARY,
  6: ValidationPhase.CONFIRMATION,
  7: ValidationPhase.FLIGHT_DETAILS,
  8: ValidationPhase.TRIP_EXPERIENCE,
  9: ValidationPhase.CLAIM_SUCCESS,
  10: ValidationPhase.CLAIM_REJECTED,
  11: ValidationPhase.AGREEMENT,
  12: ValidationPhase.CLAIM_SUBMITTED,

  13: ValidationPhase.INITIAL,
  14: ValidationPhase.EXPERIENCE,
  15: ValidationPhase.JOURNEY,
  16: ValidationPhase.FINAL,

  // Step-based validation phases
  17: ValidationPhase.STEP_1,
  18: ValidationPhase.STEP_2,
  19: ValidationPhase.STEP_3,
  20: ValidationPhase.STEP_4,
  21: ValidationPhase.STEP_5,
};

export const navigateToNextPhase = (
  currentPhase: ValidationPhase,
  router: ReturnType<typeof useRouter>,
  options: { force?: boolean; lang?: string } = {}
) => {
  const currentPhaseNumber = phaseToNumber[currentPhase];
  const nextPhaseNumber = currentPhaseNumber + 1;

  // Check if next phase exists
  if (nextPhaseNumber in numberToPhase) {
    navigateToPhase(nextPhaseNumber, router, options);
  } else {
    console.warn(`No next phase after ${currentPhase}`);
  }
};

export const navigateToPreviousPhase = (
  currentPhase: ValidationPhase,
  router: ReturnType<typeof useRouter>,
  options: { force?: boolean; lang?: string } = {}
) => {
  const currentPhaseNumber = phaseToNumber[currentPhase];
  const previousPhaseNumber = currentPhaseNumber - 1;

  // Check if previous phase exists
  if (previousPhaseNumber in numberToPhase) {
    navigateToPhase(previousPhaseNumber, router, options);
  } else {
    console.warn(`No previous phase before ${currentPhase}`);
  }
};

export const getPhaseNumber = (phase: ValidationPhase): number => {
  return phaseToNumber[phase] || 1; // Default to 1 if phase not found
};

export const getPhaseFromNumber = (number: number): ValidationPhase => {
  return numberToPhase[number] || ValidationPhase.INITIAL_ASSESSMENT; // Default to initial assessment if number not found
};

export const isFirstPhase = (phase: ValidationPhase): boolean => {
  return phaseToNumber[phase] === 1;
};

export const isLastPhase = (phase: ValidationPhase): boolean => {
  return phaseToNumber[phase] === Object.keys(numberToPhase).length;
};
