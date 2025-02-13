'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '@/types/experience';
import { MoneyInput } from '@/components/MoneyInput';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { useStore } from '@/lib/state/store';
import type { ValidationStateSteps } from '@/lib/state/store';
import { useTranslation } from '@/hooks/useTranslation';
import { format, parseISO, isValid } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { ModularFlightSelector } from '@/components/booking/ModularFlightSelector';

export interface QuestionAnswerProps {
  question: Question;
  selectedOption: string;
  onSelect: (questionId: string, value: string) => void;
  currentStep: number;
  totalSteps: number;
  hideProgress?: boolean;
}

const QuestionAnswerContent: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
  currentStep,
  totalSteps,
  hideProgress = false,
}) => {
  const { t } = useTranslation();
  const { updateValidationState } = useStore();
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(selectedOption);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, []);

  const handleMoneyInputChange = (value: string) => {
    console.log('handleMoneyInputChange:', {
      value,
      currentLocalValue: localValue,
    });

    // Always update local state first
    setLocalValue(value);

    // Handle empty value case
    if (!value || value === '') {
      setLocalValue('');
      onSelect(question.id, '');
      updateValidationState({
        stepValidation: {
          1: currentStep === 1 ? false : true,
          2: currentStep === 2 ? false : true,
          3: currentStep === 3 ? false : true,
          4: currentStep === 4 ? false : true,
          5: currentStep === 5 ? false : true,
        },
      });
      return;
    }

    // Don't validate while typing unless we have a complete value
    const hasDecimalPoint = value.includes('.');
    const decimalPlaces = hasDecimalPoint
      ? (value.split('.')[1] || '').length
      : 0;
    const isComplete = hasDecimalPoint && decimalPlaces === 2;

    // Only update validation state and call onSelect when we have a complete value
    if (question.type === 'money' && isComplete) {
      const numericValue = parseFloat(value || '0');
      const isValid = numericValue > 0;

      // Batch our state updates
      updateValidationState({
        stepValidation: {
          1: currentStep === 1 ? isValid : true,
          2: currentStep === 2 ? isValid : true,
          3: currentStep === 3 ? isValid : true,
          4: currentStep === 4 ? isValid : true,
          5: currentStep === 5 ? isValid : true,
        },
      });

      // Always call onSelect with the current value
      onSelect(question.id, value);
    }
  };

  const handleMoneyInputBlur = () => {
    console.log('handleMoneyInputBlur:', { localValue });
    setIsFocused(false);

    if (!localValue || localValue === '') {
      setLocalValue('');
      return;
    }

    // Parse the numeric value
    const numericValue = parseFloat(localValue || '0');

    // Always format with 2 decimal places on blur
    const formattedValue = numericValue.toFixed(2);
    setLocalValue(formattedValue);

    // Update validation state and call onSelect
    const isValid = numericValue > 0;
    updateValidationState({
      stepValidation: {
        1: currentStep === 1 ? isValid : true,
        2: currentStep === 2 ? isValid : true,
        3: currentStep === 3 ? isValid : true,
        4: currentStep === 4 ? isValid : true,
        5: currentStep === 5 ? isValid : true,
      },
    });

    if (isValid) {
      onSelect(question.id, formattedValue);
    }
  };

  // Helper function to safely parse dates
  const safeParseDateToUTC = (date: Date | string | null): Date | null => {
    if (!date) return null;
    try {
      // If it's already a Date object, normalize it
      if (date instanceof Date) {
        if (!isValid(date)) return null;
        return new Date(
          Date.UTC(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            12,
            0,
            0,
            0
          )
        );
      }

      // If it's a string, try to parse it
      const parsed = parseISO(date);
      if (!isValid(parsed)) return null;
      return new Date(
        Date.UTC(
          parsed.getFullYear(),
          parsed.getMonth(),
          parsed.getDate(),
          12,
          0,
          0,
          0
        )
      );
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };

  // Update the handleDateChange function
  const handleDateChange = (newDate: Date | null) => {
    try {
      if (!newDate) {
        setLocalValue('');
        onSelect(question.id, '');
        return;
      }

      // Format the date in YYYY-MM-DD format
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, '0');
      const day = String(newDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      console.log('Formatted date:', formattedDate);
      setLocalValue(formattedDate);
      onSelect(question.id, formattedDate);
    } catch (error) {
      console.error('Error in handleDateChange:', error);
    }
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
                      onChange={() => {
                        // Handle external links separately
                        if (option.externalLink) {
                          window.open(option.externalLink, '_blank');
                          return;
                        }

                        // Call onSelect directly
                        onSelect(question.id, option.value);
                      }}
                      className="w-4 h-4 border border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
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
                console.log('MoneyInput onChange:', {
                  value,
                  currentLocalValue: localValue,
                });
                if (value === '+') {
                  const currentValue = parseFloat(localValue || '0');
                  const newValue = (currentValue + 1).toFixed(2);
                  console.log('Increment:', { currentValue, newValue });
                  handleMoneyInputChange(newValue);
                } else if (value === '-') {
                  const currentValue = parseFloat(localValue || '0');
                  if (currentValue > 0) {
                    const newValue = Math.max(0, currentValue - 1).toFixed(2);
                    console.log('Decrement:', { currentValue, newValue });
                    handleMoneyInputChange(newValue);
                  }
                } else if (value === '') {
                  // Handle clear action
                  setLocalValue('');
                  onSelect(question.id, '');
                  updateValidationState({
                    stepValidation: {
                      1: currentStep === 1 ? false : true,
                      2: currentStep === 2 ? false : true,
                      3: currentStep === 3 ? false : true,
                      4: currentStep === 4 ? false : true,
                      5: currentStep === 5 ? false : true,
                    },
                  });
                } else {
                  console.log('Direct value change:', { value });
                  handleMoneyInputChange(value);
                }
              }}
              isFocused={isFocused}
              onFocus={() => {
                console.log('MoneyInput onFocus');
                setIsFocused(true);
              }}
              onBlur={handleMoneyInputBlur}
              className="w-full"
              placeholder={question.placeholder || t.common.enterAmount}
              required={question.required}
            />
          </div>
        );

      case 'date':
        return (
          <div className="mt-4">
            <DatePicker
              selected={
                localValue
                  ? safeParseDateToUTC(localValue) || undefined
                  : undefined
              }
              onChange={handleDateChange}
              customInput={
                <CustomDateInput
                  value={
                    localValue
                      ? format(
                          safeParseDateToUTC(localValue) || new Date(),
                          'dd.MM.yyyy'
                        )
                      : ''
                  }
                  onClear={() => handleDateChange(null)}
                  onClick={() => {}}
                  label={question.label || question.text}
                />
              }
              dateFormat="dd.MM.yyyy"
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              isClearable={false}
              placeholderText="DD.MM.YY / DD.MM.YYYY"
              shouldCloseOnSelect={true}
              maxDate={new Date()}
              minDate={
                new Date(new Date().setFullYear(new Date().getFullYear() - 3))
              }
              popperProps={{
                strategy: 'fixed',
                placement: 'top-start',
              }}
              className="react-datepicker-popper"
              calendarClassName="custom-calendar"
              openToDate={
                localValue
                  ? safeParseDateToUTC(localValue) || new Date()
                  : new Date()
              }
              disabledKeyboardNavigation
              preventOpenOnFocus
            />
          </div>
        );

      case 'flight_selector':
        return (
          <>
            <ModularFlightSelector
              showFlightSearch={true}
              showFlightDetails={true}
              currentPhase={4}
              disabled={false}
              stepNumber={
                question.id === 'alternative_flight_airline_expense' ||
                question.id === 'alternative_flight_own_expense'
                  ? currentStep + 1
                  : 1
              }
              setValidationState={
                question.id === 'alternative_flight_airline_expense' ||
                question.id === 'alternative_flight_own_expense'
                  ? () => void 0
                  : (state) => {
                      // Update validation state for the correct step
                      const stepNumber =
                        question.id === 'alternative_flight_airline_expense' ||
                        question.id === 'alternative_flight_own_expense'
                          ? currentStep + 1
                          : 1;

                      const validationSteps: ValidationStateSteps[] = [
                        1, 2, 3, 4, 5,
                      ];
                      const stepValidation = Object.fromEntries(
                        validationSteps.map((n) => [
                          n,
                          n === stepNumber
                            ? typeof state === 'function'
                              ? state({})[stepNumber] || false
                              : state[stepNumber] || false
                            : false,
                        ])
                      ) as Record<ValidationStateSteps, boolean>;
                      const stepInteraction = Object.fromEntries(
                        validationSteps.map((n) => [n, n === stepNumber])
                      ) as Record<ValidationStateSteps, boolean>;

                      updateValidationState({
                        stepValidation,
                        stepInteraction,
                        _timestamp: Date.now(),
                      });
                    }
              }
              onSelect={
                question.id === 'alternative_flight_airline_expense' ||
                question.id === 'alternative_flight_own_expense'
                  ? () => void 0
                  : (flight) => {
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
                    }
              }
              onInteract={() => {}}
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
              initial={{ width: '0%' }}
              animate={{
                width:
                  currentStep === 1 && !selectedOption
                    ? '0%'
                    : `${(currentStep / totalSteps) * 100}%`,
              }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          {(currentStep > 1 || selectedOption) && (
            <motion.div
              className="text-sm text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <span>
                {t.phases?.initialAssessment?.counter?.[
                  totalSteps === 1 ? 'single' : 'multiple'
                ]
                  ?.replace('{current}', currentStep.toString())
                  .replace('{total}', totalSteps.toString()) ||
                  `Question ${currentStep} of ${totalSteps}`}
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
