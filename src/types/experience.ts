export interface Question {
  id: string;
  type: 'radio' | 'number';
  text: string;
  options?: Option[];
  placeholder?: string;
  min?: number;
  max?: number;
  showIf?: (answers: Array<{ questionId: string; value: string }>) => boolean;
}

export interface Answer {
  questionId: string;
  value: string;
}

export interface Option {
  id: string;
  value: string;
  label: string;
}