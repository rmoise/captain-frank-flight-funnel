import React, { useState, useEffect } from 'react';
import { Question } from '@/types/experience';
import { motion, AnimatePresence } from 'framer-motion';
import { MoneyInput } from '@/components/MoneyInput';

interface QuestionAnswerProps {
  question: Question;
  selectedOption: string | null;
  onSelect: (questionId: string, value: string) => void;
  currentStep: number;
  totalSteps: number;
  direction: number;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
  currentStep,
  totalSteps,
  direction,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(selectedOption);

  useEffect(() => {
    setLocalValue(selectedOption);
  }, [selectedOption]);

  const handleMoneyInputChange = (value: string) => {
    // Remove any non-numeric characters except decimal point and negative sign
    const numericValue = value.replace(/[^\d.-]/g, '');

    // Handle empty string case
    if (numericValue === '') {
      setLocalValue('');
      onSelect(question.id, '');
      return;
    }

    // Parse the numeric value
    const parsedValue = parseFloat(numericValue);

    // Only update if it's a valid number
    if (!isNaN(parsedValue)) {
      const formattedValue = parsedValue.toString();
      setLocalValue(formattedValue);
      onSelect(question.id, formattedValue);
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  if (!question) {
    return null;
  }

  const progress = ((currentStep + 1) / totalSteps) * 100;

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'radio':
        if (!question.options) return null;
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <label
                key={option.value}
                className={`flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200
                  ${
                    selectedOption === option.value
                      ? 'border-[#F54538] bg-[#FEF2F2]'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={selectedOption === option.value}
                  onChange={() => onSelect(question.id, option.value)}
                  className="w-4 h-4 border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
                />
                <span className="ml-3 text-base text-gray-900">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <div className="mt-2" onClick={handleContainerClick}>
            <MoneyInput
              label="Amount"
              value={localValue || ''}
              onChange={handleMoneyInputChange}
              isFocused={isFocused}
              onFocus={() => {
                setIsFocused(true);
              }}
              onBlur={() => {
                setIsFocused(false);
              }}
              className="w-full"
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8" onClick={handleContainerClick}>
      {/* Progress bar */}
      <div className="space-y-3">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#F54538] rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
        <div className="text-sm text-gray-500">
          Question {currentStep + 1} of {totalSteps}
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{
            x: direction > 0 ? 50 : -50,
            opacity: 0,
          }}
          animate={{
            x: 0,
            opacity: 1,
          }}
          exit={{
            x: direction > 0 ? -50 : 50,
            opacity: 0,
          }}
          transition={{
            duration: 0.2,
            ease: 'easeOut',
          }}
          className="space-y-6"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <h3 className="text-lg font-medium text-gray-900">{question.text}</h3>
          <div onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            {renderQuestionInput()}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
