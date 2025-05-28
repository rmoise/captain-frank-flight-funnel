import type { ValidationPhase, IValidator } from "./validation";

/**
 * Basic types
 */
export type QuestionType =
  | "text"
  | "select"
  | "multiselect"
  | "radio"
  | "checkbox"
  | "date"
  | "number"
  | "money"
  | "flight_selector"
  | "journey_fact_flight_selector";
export type AnswerValue = string | number | boolean | string[] | null;
export type WizardType = "travel_status" | "informed_date";

/**
 * Question and Answer types
 */
export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  showConfetti?: boolean;
  showCheck?: boolean;
  externalLink?: string;
  openInNewTab?: boolean;
  description?: string;
  isDisabled?: boolean;
  icon?: string;
  subLabel?: string;
  tooltip?: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  showIf?: (answers: Record<string, Answer>) => boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  relatedQuestions?: Question[];
  description?: string;
  isOptional?: boolean;
  isHidden?: boolean;
  dependsOn?: string[];
  validationRules?: IValidator[];
  errorMessage?: string;
  helpText?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  defaultValue?: AnswerValue;
  autoFocus?: boolean;
  phase?: ValidationPhase;
  translationKey?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  value: AnswerValue;
  timestamp: number;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Wizard State and Actions
 */
export interface WizardState {
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  answers: Answer[];
  questions: Question[];
  isLoading: boolean;
  error?: string;
}

export interface WizardActions {
  setCurrentStep: (step: number) => void;
  setAnswer: (questionId: string, value: AnswerValue) => void;
  resetWizard: () => void;
  validateStep: (step: number) => boolean;
  completeWizard: () => void;
}

export type Wizard = WizardState & WizardActions;

/**
 * Component Props
 */
export interface WizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  wizardType: WizardType;
  selectedFlight?: any; // Replace 'any' with proper Flight type when available
}

/**
 * Validation Types
 */
export interface WizardStepValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  strategy: "all" | "any" | "custom";
  validateStep?: (
    answers: Answer[],
    questions: Question[]
  ) => {
    isValid: boolean;
    errors: string[];
  };
}
