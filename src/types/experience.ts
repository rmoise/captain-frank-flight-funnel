import { Answer } from './wizard';

export interface Question {
  id: string;
  text: string;
  type: 'radio' | 'text' | 'select' | 'number';
  options?: Array<{
    id: string;
    label: string;
    value: string;
    externalLink?: string;
  }>;
  showIf?: (answers: Answer[]) => boolean;
  placeholder?: string;
  min?: number;
}

export type { Answer } from './wizard';

export interface Experience {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}