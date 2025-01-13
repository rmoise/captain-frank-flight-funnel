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
import { useStore } from '@/lib/state/store';

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
  const { updateValidationState } = useStore();
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(selectedOption);
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    if (selectedOption !== localValue) {
      setLocalValue(selectedOption);
    }
  }, [selectedOption, localValue]);

  useEffect(() => {
    if (selectedOption) {
      setShowProgress(true);
    }
  }, [selectedOption]);

  const handleMoneyInputChange = (value: string) => {
    // Pass through the value directly to onSelect
    onSelect(question.id, value);
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case 'radio':
        if (!question.options) {
          return null;
        }
        return (
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedOption === option.value;

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
                        e.preventDefault();
                        e.stopPropagation();
                        if (option.externalLink) {
                          window.open(option.externalLink, '_blank');
                          return;
                        }
                        setLocalValue(option.value);
                        setTimeout(() => {
                          onSelect(question.id, option.value);
                        }, 0);
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
                if (value === '+') {
                  const currentValue = parseFloat(
                    localValue?.replace(/[^0-9.-]+/g, '') || '0'
                  );
                  const newValue = `€${(currentValue + 1).toFixed(2)}`;
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
              placeholder={question.placeholder || 'Betrag eingeben'}
              required={question.required}
            />
          </div>
        );

      case 'date':
        const parsedDate = localValue ? new Date(localValue) : null;
        const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

        return (
          <div className="mt-4">
            <DatePicker
              selected={isValidDate ? parsedDate : null}
              onChange={(date) => {
                if (date) {
                  const formattedDate = formatDateToYYYYMMDD(date);
                  if (formattedDate) {
                    // Validate the formatted date
                    if (isValidYYYYMMDD(formattedDate)) {
                      setLocalValue(formattedDate);
                      onSelect(question.id, formattedDate);
                    }
                  }
                } else {
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
                      Array.isArray(flight)
                        ? flight.map((f) => f.id).join(',')
                        : flight.id
                    );
                  }, 0);
                }
              }}
              initialSelectedFlight={
                Array.isArray(initialSelectedFlight)
                  ? initialSelectedFlight[0]
                  : initialSelectedFlight
              }
              showFlightSearch={true}
              showFlightDetails={true}
              showResults={true}
              onInteract={() => {}}
              stepNumber={1}
              setValidationState={(state) => {
                // Update validation state for step 1
                if (typeof state === 'function') {
                  const newState = state({} as Record<number, boolean>);
                  updateValidationState({
                    stepValidation: {
                      1: newState[1] || false,
                      2: false,
                      3: false,
                      4: false,
                    },
                    1: newState[1] || false,
                  });
                } else {
                  updateValidationState({
                    stepValidation: {
                      1: state[1] || false,
                      2: false,
                      3: false,
                      4: false,
                    },
                    1: state[1] || false,
                  });
                }
              }}
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
              animate={{
                width: selectedOption
                  ? `${(currentStep / totalSteps) * 100}%`
                  : '0%',
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          {showProgress && (
            <motion.div
              className="text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span>
                Frage {currentStep} von {totalSteps}
              </span>
            </motion.div>
          )}
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
