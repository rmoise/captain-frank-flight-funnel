import type { Answer } from './wizard';

export interface ExperienceState {
  answers: Answer[];
  currentStep: number;
  isComplete: boolean;
}

export interface Question {
  id: string;
  text: string;
  type: 'radio' | 'money' | 'date' | 'flight_selector';
  label?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{
    id: string;
    value: string;
    label: string;
    showConfetti?: boolean;
    showCheck?: boolean;
    externalLink?: string;
    openInNewTab?: boolean;
  }>;
  showIf?: (answers: Answer[]) => boolean;
  relatedQuestions?: Question[];
}

export interface ExperienceStep {
  id: string;
  title: string;
  questions: Question[];
  isComplete: boolean;
}
