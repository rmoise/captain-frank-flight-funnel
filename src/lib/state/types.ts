export type ValidationStateSteps = 1 | 2 | 3 | 4;

export interface ValidationState {
  isFlightValid: boolean;
  isWizardValid: boolean;
  isPersonalValid: boolean;
  isTermsValid: boolean;
  isSignatureValid: boolean;
  isBookingValid: boolean;
  stepValidation: Record<ValidationStateSteps, boolean>;
  stepInteraction: Record<ValidationStateSteps, boolean>;
  fieldErrors: Record<string, string[]>;
  [key: number]: boolean;
  _timestamp?: number;
}
