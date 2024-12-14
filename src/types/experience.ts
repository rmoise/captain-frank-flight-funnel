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