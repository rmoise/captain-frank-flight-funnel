import React, { useCallback, useEffect, useState } from 'react';
import { Question } from '@/types/experience';

interface QuestionAnswerProps {
  question: Question;
  selectedOption: string;
  currentStep: number;
  totalSteps: number;
  onSelect: (questionId: string, value: string) => void;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  currentStep,
  totalSteps,
  onSelect,
}) => {
  // Local state for the selected value
  const [localValue, setLocalValue] = useState(selectedOption);

  // Handle answer selection
  const handleSelect = useCallback(
    (value: string) => {
      console.log('QuestionAnswer handleSelect:', {
        questionId: question.id,
        value,
        currentValue: localValue,
      });
      setLocalValue(value);
      onSelect(question.id, value);
    },
    [question.id, onSelect, localValue]
  );

  // Update local value when selected option changes
  useEffect(() => {
    console.log('QuestionAnswer useEffect:', {
      selectedOption,
      localValue,
    });
    if (selectedOption !== localValue) {
      setLocalValue(selectedOption);
    }
  }, [selectedOption, localValue]);

  // Render question input based on type
  const renderQuestionInput = () => {
    console.log('QuestionAnswer renderQuestionInput:', {
      questionType: question.type,
      questionId: question.id,
      questionText: question.text,
      options: question.options,
      selectedOption: localValue,
    });

    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-4">
            {question.options?.map(
              (option: { value: string | number; label: string }) => {
                const isSelected = localValue === option.value.toString();
                console.log('Rendering radio option:', {
                  questionId: question.id,
                  optionValue: option.value,
                  selectedOption: localValue,
                  isSelected,
                });
                return (
                  <div
                    key={option.value.toString()}
                    className="flex items-center"
                  >
                    <input
                      type="radio"
                      id={`${question.id}-${option.value}`}
                      name={question.id}
                      value={option.value.toString()}
                      checked={isSelected}
                      onChange={(e) => handleSelect(e.target.value)}
                      className="h-4 w-4 text-[#F54538] border-gray-300 focus:ring-[#F54538]"
                    />
                    <label
                      htmlFor={`${question.id}-${option.value}`}
                      className="ml-3 block text-sm font-medium text-gray-700"
                    >
                      {option.label}
                    </label>
                  </div>
                );
              }
            )}
          </div>
        );
      // Add other question types here if needed
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{question.text}</h3>
          <span className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </span>
        </div>
        {renderQuestionInput()}
      </div>
    </div>
  );
};