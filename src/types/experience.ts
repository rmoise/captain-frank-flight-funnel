import type { Answer } from './wizard';

export type QuestionType = 'radio' | 'money' | 'date' | 'flight_selector';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
  showConfetti?: boolean;
  showCheck?: boolean;
  externalLink?: string;
  openInNewTab?: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: QuestionOption[];
  showIf?: (answers: Answer[]) => boolean;
  label?: string;
  placeholder?: string;
  required?: boolean;
  relatedQuestions?: Question[];
}

export type Questions = Question[];

export interface ExperienceState {
  answers: Answer[];
  currentStep: number;
  isComplete: boolean;
}

export interface ExperienceStep {
  id: string;
  title: string;
  questions: Question[];
  isComplete: boolean;
}
