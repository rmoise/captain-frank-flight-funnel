import { Answer } from './wizard';

export interface Question {
  id: string;
  text: string;
  options: string[];
}

export interface Answer {
  questionId: string;
  selectedOption: string;
}

export interface Experience {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}