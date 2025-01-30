export type ValidationStateSteps = 1 | 2 | 3 | 4;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ValidationState {
  isFlightValid: boolean;
  isBookingValid: boolean;
  isTermsValid: boolean;
  stepValidation: Record<number, boolean>;
  stepInteraction: Record<number, boolean>;
  errors: string[];
  _timestamp: number;
  [key: number]: boolean;
}
