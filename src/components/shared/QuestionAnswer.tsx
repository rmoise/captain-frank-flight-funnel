import React from 'react';
import { Question } from '@/types/experience';

interface QuestionAnswerProps {
  question: Question;
  selectedOption: string | null;
  onSelect: (option: string) => void;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">{question.text}</h3>
      <div className="space-y-2">
        {question.options.map((option) => (
          <button
            key={option}
            onClick={() => onSelect(option)}
            className={`w-full text-left px-4 py-3 rounded-lg border ${
              selectedOption === option
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};
