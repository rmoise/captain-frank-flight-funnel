export interface Answer {
  questionId: string;
  value: string | number | boolean;
  shouldShow?: boolean;
  isActiveSelection?: boolean;
}
