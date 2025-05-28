export const ValidationPhase = {
  INITIAL_ASSESSMENT: "INITIAL_ASSESSMENT",
  COMPENSATION_ESTIMATE: "COMPENSATION_ESTIMATE",
  PERSONAL_DETAILS: "PERSONAL_DETAILS",
  TERMS_AND_CONDITIONS: "TERMS_AND_CONDITIONS",
  SUMMARY: "SUMMARY",
  CONFIRMATION: "CONFIRMATION",
  FLIGHT_DETAILS: "FLIGHT_DETAILS",
  TRIP_EXPERIENCE: "TRIP_EXPERIENCE",
  CLAIM_SUCCESS: "CLAIM_SUCCESS",
  CLAIM_REJECTED: "CLAIM_REJECTED",
  AGREEMENT: "AGREEMENT",
  CLAIM_SUBMITTED: "CLAIM_SUBMITTED",
  INITIAL: "initial",
  EXPERIENCE: "experience",
  JOURNEY: "journey",
  FINAL: "final",
  // Step-based validation phases for AccordionCardClient
  STEP_1: "STEP_1",
  STEP_2: "STEP_2",
  STEP_3: "STEP_3",
  STEP_4: "STEP_4",
  STEP_5: "STEP_5",
} as const;

export type ValidationPhase =
  (typeof ValidationPhase)[keyof typeof ValidationPhase];

export type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

export interface IValidator {
  validate: () => Promise<ValidationError[]>;
}

export interface ValidationState {
  stepValidation: Record<ValidationPhase, boolean>;
  stepCompleted: Record<ValidationPhase, boolean>;
  stepInteraction: Record<ValidationPhase, boolean>;
  stepSummary: Record<ValidationPhase, string>;
  errors: ValidationError[];
  fieldErrors: Record<string, string[]>;
  isValid: boolean;
  isComplete: boolean;
  _timestamp: number;
}

export interface PhaseValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export type ValidationRecords = Record<ValidationPhase, boolean>;
export type PhaseValidationRecords = Record<
  ValidationPhase,
  PhaseValidationResult
>;

export interface ValidationActions {
  setStepValidation: (phase: ValidationPhase, isValid: boolean) => void;
  setStepCompleted: (phase: ValidationPhase, isCompleted: boolean) => void;
  setStepInteraction: (phase: ValidationPhase, hasInteracted: boolean) => void;
  setStepSummary: (phase: ValidationPhase, summary: string) => void;
  addStepError: (phase: ValidationPhase, error: ValidationError) => void;
  clearStepErrors: (phase: ValidationPhase) => void;
  addFieldError: (field: string, error: string) => void;
  clearFieldErrors: (field: string) => void;
  setIsValid: (isValid: boolean) => void;
  setIsComplete: (isComplete: boolean) => void;
  resetValidation: () => void;
}

export const initialValidationState: ValidationState = {
  stepValidation: Object.keys(ValidationPhase).reduce(
    (acc, phase) => ({
      ...acc,
      [ValidationPhase[phase as keyof typeof ValidationPhase]]: false,
    }),
    {} as Record<ValidationPhase, boolean>
  ),
  stepCompleted: Object.keys(ValidationPhase).reduce(
    (acc, phase) => ({
      ...acc,
      [ValidationPhase[phase as keyof typeof ValidationPhase]]: false,
    }),
    {} as Record<ValidationPhase, boolean>
  ),
  stepInteraction: Object.keys(ValidationPhase).reduce(
    (acc, phase) => ({
      ...acc,
      [ValidationPhase[phase as keyof typeof ValidationPhase]]: false,
    }),
    {} as Record<ValidationPhase, boolean>
  ),
  stepSummary: Object.keys(ValidationPhase).reduce(
    (acc, phase) => ({
      ...acc,
      [ValidationPhase[phase as keyof typeof ValidationPhase]]: "",
    }),
    {} as Record<ValidationPhase, string>
  ),
  errors: [],
  fieldErrors: {},
  isValid: false,
  isComplete: false,
  _timestamp: Date.now(),
};

export const getValidationRules = (phase: ValidationPhase): IValidator[] => {
  const rules: Record<ValidationPhase, IValidator[]> = {
    [ValidationPhase.INITIAL_ASSESSMENT]: [],
    [ValidationPhase.COMPENSATION_ESTIMATE]: [],
    [ValidationPhase.PERSONAL_DETAILS]: [],
    [ValidationPhase.TERMS_AND_CONDITIONS]: [],
    [ValidationPhase.SUMMARY]: [],
    [ValidationPhase.CONFIRMATION]: [],
    [ValidationPhase.FLIGHT_DETAILS]: [],
    [ValidationPhase.TRIP_EXPERIENCE]: [],
    [ValidationPhase.CLAIM_SUCCESS]: [],
    [ValidationPhase.CLAIM_REJECTED]: [],
    [ValidationPhase.AGREEMENT]: [],
    [ValidationPhase.CLAIM_SUBMITTED]: [],
    [ValidationPhase.INITIAL]: [],
    [ValidationPhase.EXPERIENCE]: [],
    [ValidationPhase.JOURNEY]: [],
    [ValidationPhase.FINAL]: [],
    [ValidationPhase.STEP_1]: [],
    [ValidationPhase.STEP_2]: [],
    [ValidationPhase.STEP_3]: [],
    [ValidationPhase.STEP_4]: [],
    [ValidationPhase.STEP_5]: [],
  };

  return rules[phase] || [];
};
