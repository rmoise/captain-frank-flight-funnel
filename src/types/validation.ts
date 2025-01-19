export type ValidationStateSteps = 1 | 2 | 3 | 4;

export interface ValidationState {
  isWizardValid: boolean;
  stepValidation: ValidationStateSteps;
  stepInteraction: ValidationStateSteps;
  currentStep: number;
  _timestamp?: number;
  [key: number]: boolean | number | ValidationStateSteps | undefined;
}
