'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '@/types/experience';
import { MoneyInput } from '@/components/MoneyInput';
import { FlightSelector } from '@/components/booking/FlightSelector';
import type { Flight } from '@/types/store';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { formatDateToYYYYMMDD, isValidYYYYMMDD } from '@/utils/dateUtils';

export interface QuestionAnswerProps {
  question: Question;
  selectedOption: string;
  onSelect: (questionId: string, value: string) => void;
  currentStep: number;
  totalSteps: number;
  initialSelectedFlight?: Flight | Flight[] | null;
  hideProgress?: boolean;
}

const QuestionAnswerContent: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
  currentStep,
  totalSteps,
  initialSelectedFlight = null,
  hideProgress = false,
}) => {
  console.log('=== QuestionAnswer Render ===', {
    question,
    selectedOption,
    currentStep,
    totalSteps,
    initialSelectedFlight,
    hideProgress,
  });

  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(selectedOption);

  useEffect(() => {
    console.log('=== QuestionAnswer useEffect ===', {
      selectedOption,
      localValue,
    });
    if (selectedOption !== localValue) {
      setLocalValue(selectedOption);
    }
  }, [selectedOption, localValue]);

  const handleMoneyInputChange = (value: string) => {
    console.log('=== QuestionAnswer handleMoneyInputChange ===', {
      value,
      selectedOption,
      questionId: question.id,
    });

    // Pass through the value directly to onSelect
    onSelect(question.id, value);
  };

  const renderQuestionInput = () => {
    console.log('=== QuestionAnswer renderQuestionInput ===', {
      questionType: question.type,
      questionId: question.id,
      questionText: question.text,
      options: question.options,
      selectedOption,
    });

    switch (question.type) {
      case 'radio':
        if (!question.options) {
          console.warn('No options provided for radio question:', question.id);
          return null;
        }
        return (
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedOption === option.value;
              console.log('Rendering radio option:', {
                questionId: question.id,
                optionValue: option.value,
                selectedOption,
                isSelected,
              });

              return (
                <div key={option.value}>
                  <label
                    className={`flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200
                      ${
                        isSelected
                          ? 'border-[#F54538] bg-[#FEF2F2]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (option.externalLink) {
                          window.open(option.externalLink, '_blank');
                          return;
                        }
                        setLocalValue(option.value);
                        onSelect(question.id, option.value);
                      }}
                      className="w-4 h-4 border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
                    />
                    <span className="ml-3 text-base text-gray-900 flex-grow">
                      {option.label}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>
        );

      case 'money':
        return (
          <div className="mt-4">
            <MoneyInput
              label={question.label || question.text}
              value={localValue || ''}
              onChange={(value) => {
                console.log('=== MoneyInput onChange ===', {
                  value,
                  selectedOption,
                  questionId: question.id,
                });
                if (value === '+') {
                  const currentValue = parseFloat(
                    localValue?.replace(/[^0-9.-]+/g, '') || '0'
                  );
                  const newValue = `€${(currentValue + 1).toFixed(2)}`;
                  console.log('Incrementing to:', newValue);
                  setLocalValue(newValue);
                  handleMoneyInputChange(newValue);
                } else if (value === '-') {
                  const currentValue = parseFloat(
                    localValue?.replace(/[^0-9.-]+/g, '') || '0'
                  );
                  if (currentValue > 0) {
                    const newValue = `€${Math.max(0, currentValue - 1).toFixed(
                      2
                    )}`;
                    console.log('Decrementing to:', newValue);
                    setLocalValue(newValue);
                    handleMoneyInputChange(newValue);
                  }
                } else {
                  setLocalValue(value);
                  handleMoneyInputChange(value);
                }
              }}
              isFocused={isFocused}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="w-full"
              placeholder={question.placeholder || 'Enter amount'}
              required={question.required}
            />
          </div>
        );

      case 'date':
        const parsedDate = localValue ? new Date(localValue) : null;
        const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

        console.log('Rendering date picker:', {
          questionId: question.id,
          localValue,
          selectedOption,
          parsedDate,
          isValidDate,
        });

        return (
          <div className="mt-4">
            <DatePicker
              selected={isValidDate ? parsedDate : null}
              onChange={(date) => {
                console.log('DatePicker onChange called with:', {
                  date,
                  questionId: question.id,
                  currentValue: localValue,
                });

                if (date) {
                  const formattedDate = formatDateToYYYYMMDD(date);
                  console.log('DatePicker formatting date:', {
                    originalDate: date,
                    formattedDate,
                    questionId: question.id,
                    currentValue: localValue,
                  });

                  if (formattedDate) {
                    // Validate the formatted date
                    if (isValidYYYYMMDD(formattedDate)) {
                      console.log('Setting valid formatted date:', {
                        formattedDate,
                        questionId: question.id,
                      });
                      setLocalValue(formattedDate);
                      onSelect(question.id, formattedDate);
                    } else {
                      console.error('Invalid date format:', {
                        date,
                        formattedDate,
                        questionId: question.id,
                      });
                    }
                  } else {
                    console.error('Failed to format date:', {
                      date,
                      questionId: question.id,
                    });
                  }
                } else {
                  console.log('DatePicker cleared:', {
                    questionId: question.id,
                    currentValue: localValue,
                  });
                  setLocalValue('');
                  onSelect(question.id, '');
                }
              }}
              customInput={
                <CustomDateInput
                  value={
                    isValidDate
                      ? parsedDate.toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })
                      : ''
                  }
                  onClear={() => {
                    console.log('DatePicker onClear');
                    setLocalValue('');
                    onSelect(question.id, '');
                  }}
                />
              }
              dateFormat="dd.MM.yyyy"
              maxDate={new Date()}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              isClearable={false}
              placeholderText="DD.MM.YYYY"
              shouldCloseOnSelect={true}
              popperProps={{
                strategy: 'fixed',
                placement: 'top-start',
              }}
            />
          </div>
        );

      case 'flight_selector':
        return (
          <>
            <FlightSelector
              onSelect={(flight) => {
                if (flight) {
                  // Debounce the state update to prevent infinite loops
                  setTimeout(() => {
                    onSelect(
                      question.id,
                      JSON.stringify(Array.isArray(flight) ? flight[0] : flight)
                    );
                  }, 0);
                }
              }}
              initialSelectedFlight={
                typeof initialSelectedFlight === 'string'
                  ? JSON.parse(initialSelectedFlight)
                  : initialSelectedFlight
              }
              showFlightSearch={true}
              showFlightDetails={true}
              showResults={true}
              onInteract={() => {}}
              stepNumber={currentStep}
            />
            {question.relatedQuestions?.map((relatedQ) => (
              <div key={relatedQ.id} className="mt-24 pt-12 pb-12 mb-12">
                <hr className="border-t border-gray-200 mb-12" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {relatedQ.text}
                </h3>
                <MoneyInput
                  label=""
                  value={selectedOption || ''}
                  onChange={(value) => onSelect(relatedQ.id, value)}
                  placeholder={relatedQ.placeholder || 'Enter amount'}
                  required={relatedQ.required}
                  isFocused={false}
                  onFocus={() => {}}
                  onBlur={() => {}}
                  className="w-full"
                />
              </div>
            ))}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8 font-heebo">
      {/* Progress bar */}
      {!hideProgress && (
        <div className="space-y-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#F54538] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="text-sm text-gray-500">
            <span>
              Question {currentStep} of {totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium text-gray-900 ${
            question.type === 'flight_selector' ? 'mb-12' : ''
          }`}
        >
          {question.text}
        </h3>
        {renderQuestionInput()}
      </div>
    </div>
  );
};

export const QuestionAnswer: React.FC<QuestionAnswerProps> = (props) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px] text-center">
          <div className="text-red-500 mb-4">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Unable to display question
          </h3>
          <p className="text-sm text-gray-500">
            There was a problem displaying this question. Please try refreshing
            the page.
          </p>
        </div>
      }
    >
      <QuestionAnswerContent {...props} />
    </ErrorBoundary>
  );
};
