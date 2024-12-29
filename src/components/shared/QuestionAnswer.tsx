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

export interface QuestionAnswerProps {
  question: Question;
  selectedOption: string;
  onSelect: (questionId: string, value: string) => void;
  currentStep: number;
  totalSteps: number;
  selectedFlight?: Flight | Flight[] | null;
  hideProgress?: boolean;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
  currentStep,
  totalSteps,
  selectedFlight = null,
  hideProgress = false,
}) => {
  console.log('=== QuestionAnswer Render ===', {
    question,
    selectedOption,
    currentStep,
    totalSteps,
    selectedFlight,
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

  const progress = ((currentStep + 1) / totalSteps) * 100;

  const renderQuestionInput = () => {
    console.log('=== QuestionAnswer renderQuestionInput ===', {
      questionType: question.type,
      questionId: question.id,
      questionText: question.text,
      options: question.options,
    });

    switch (question.type) {
      case 'radio':
        if (!question.options) {
          console.warn('No options provided for radio question:', question.id);
          return null;
        }
        return (
          <div className="space-y-3">
            {question.options.map((option) => (
              <div key={option.value}>
                <label
                  className={`flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200
                    ${
                      selectedOption === option.value
                        ? 'border-[#F54538] bg-[#FEF2F2]'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  onClick={() => {
                    if (option.externalLink) {
                      window.open(
                        option.externalLink,
                        option.openInNewTab ? '_blank' : '_self'
                      );
                      return;
                    }
                    onSelect(question.id, option.value);
                  }}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.value}
                    checked={selectedOption === option.value}
                    onChange={() => {
                      if (!option.externalLink) {
                        onSelect(question.id, option.value);
                      }
                    }}
                    className="w-4 h-4 border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
                  />
                  <span className="ml-3 text-base text-gray-900">
                    {option.label}
                  </span>
                </label>
              </div>
            ))}
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

        return (
          <div className="mt-4">
            <DatePicker
              selected={isValidDate ? parsedDate : null}
              onChange={(date) => {
                if (date) {
                  const dateStr = date.toISOString().split('T')[0];
                  setLocalValue(dateStr);
                  onSelect(question.id, dateStr);
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
                  onSelect(
                    question.id,
                    JSON.stringify(Array.isArray(flight) ? flight[0] : flight)
                  );
                }
              }}
              selectedFlight={
                Array.isArray(selectedFlight)
                  ? selectedFlight[0]
                  : selectedFlight
              }
              showFlightSearch={true}
              showFlightDetails={true}
              showResults={true}
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
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <div className="text-sm text-gray-500">
            <span>
              Question {currentStep + 1} of {totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium text-gray-900 ${question.type === 'flight_selector' ? 'mb-12' : ''}`}
        >
          {question.text}
        </h3>
        {renderQuestionInput()}
      </div>
    </div>
  );
};
