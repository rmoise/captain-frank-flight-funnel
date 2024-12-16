import { Answer } from './wizard';

export interface Question {
  id: string;
  text: string;
  type: 'radio' | 'number';
  options?: {
    value: string;
    label: string;
    externalLink?: string;
    id?: string;
  }[];
  showIf?: (answers: Array<{ questionId: string; value: string }>) => boolean;
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