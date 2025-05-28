"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import type { Question, QuestionOption } from "@/types/shared/wizard";
import { MoneyInput } from "@/components/ui/input/MoneyInput";
import { DateSelector } from "@/components/ui/date/DateSelector";
import { ErrorBoundary } from "@/components/ui/feedback/ErrorBoundary";
import useStore from "@/store";
import { useTranslation } from "@/hooks/useTranslation";
import { format, parseISO, isValid } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { ModularFlightSelector } from "@/components/shared/ModularFlightSelector";
import { ValidationPhase } from "@/types/shared/validation";
import { RadioGroup } from "@headlessui/react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/20/solid";
import { Input } from "@/components/ui/input/Input";
import { Headline } from "@/components/ui/display/Headline";
import type { Answer } from "@/types/shared/wizard";
import type { FlightSearchParams } from "@/types/api/endpoints/flight";

interface FlightSegment {
  selectedFlight?: {
    flightNumber: string;
  };
  id?: string; // Make id optional since it might not always be present
  // ... other existing properties ...
}

interface ModularFlightSelectorProps {
  showFlightSearch?: boolean;
  stepNumber: number;
  currentPhase: number;
  disabled?: boolean;
  setValidationState: (isValid: boolean) => void;
  onSelect: (flight: FlightSegment | FlightSegment[]) => void;
  onInteract?: () => void;
  onFlightTypeChange: (type: "direct" | "multi") => void;
  onSegmentUpdate: (segments: FlightSegment[]) => void;
  onSearch?: (params: any, segmentIndex: number) => Promise<any[]>;
  // ... other existing properties ...
}

export interface QuestionAnswerProps {
  question: Question;
  selectedOption: string;
  onSelect: (questionId: string, value: string) => void;
  currentStep: number;
  totalSteps: number;
  hideProgress?: boolean;
  phase?: ValidationPhase;
  stepNumber?: number;
  children?: React.ReactNode;
  onFlightTypeChange?: (type: "direct" | "multi") => void;
  onSegmentUpdate?: (segments: FlightSegment[]) => void;
  showFlightSearch?: boolean;
  isSearching?: boolean;
  disabled?: boolean;
  onInteract?: () => void;
  setIsFlightNotListedOpen?: (isOpen: boolean) => void;
  wizardType?: "travel_status" | "informed_date";
  onSearch?: (params: any, segmentIndex: number) => Promise<any[]>;
}

interface ValidationState {
  [key: number]: boolean;
}

interface ValidationMap {
  [key: number]: ValidationPhase;
}

// Add type for validation state object
type StepValidationState = {
  [K in 1 | 2 | 3 | 4 | 5 | 6 | 7]: boolean;
};

const validationPhaseMap: ValidationMap = {
  1: ValidationPhase.INITIAL_ASSESSMENT,
  2: ValidationPhase.COMPENSATION_ESTIMATE,
  3: ValidationPhase.FLIGHT_DETAILS,
  4: ValidationPhase.TRIP_EXPERIENCE,
  5: ValidationPhase.CLAIM_SUCCESS,
  6: ValidationPhase.AGREEMENT,
  7: ValidationPhase.CLAIM_SUBMITTED,
};

const getValidationPhaseForStep = (step: number): ValidationPhase => {
  return validationPhaseMap[step] || ValidationPhase.INITIAL_ASSESSMENT;
};

const QuestionAnswerContent: React.FC<QuestionAnswerProps> = ({
  question,
  selectedOption,
  onSelect,
  currentStep,
  totalSteps,
  hideProgress = false,
  phase,
  stepNumber,
  children,
  onFlightTypeChange = () => {},
  onSegmentUpdate = () => {},
  showFlightSearch,
  isSearching,
  disabled,
  onInteract,
  setIsFlightNotListedOpen,
  onSearch,
}) => {
  const { t } = useTranslation();
  const store = useStore();
  const { setStepValidation } = store.actions.validation;
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(selectedOption);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, []);

  const handleMoneyInputChange = (value: string) => {
    console.log("handleMoneyInputChange:", {
      value,
      currentLocalValue: localValue,
    });

    // Always update local state first
    setLocalValue(value);

    // Handle empty value case
    if (!value || value === "") {
      setLocalValue("");
      onSelect(question.id, "");
      for (let step = 1; step <= 7; step++) {
        setStepValidation(
          getValidationPhaseForStep(step),
          step !== currentStep
        );
      }
      return;
    }

    // Don't validate while typing unless we have a complete value
    const hasDecimalPoint = value.includes(".");
    const decimalPlaces = hasDecimalPoint
      ? (value.split(".")[1] || "").length
      : 0;
    const isComplete = hasDecimalPoint && decimalPlaces === 2;

    // Only update validation state and call onSelect when we have a complete value
    if (question.type === "money" && isComplete) {
      const numericValue = parseFloat(value || "0");
      const isValid = numericValue > 0;

      // Update validation state for each step
      for (let step = 1; step <= 7; step++) {
        setStepValidation(
          getValidationPhaseForStep(step),
          step === currentStep ? isValid : true
        );
      }

      // Always call onSelect with the current value
      onSelect(question.id, value);
    }
  };

  const handleMoneyInputBlur = () => {
    console.log("handleMoneyInputBlur:", { localValue });
    setIsFocused(false);

    if (!localValue || localValue === "") {
      setLocalValue("");
      return;
    }

    // Parse the numeric value
    const numericValue = parseFloat(localValue || "0");

    // Always format with 2 decimal places on blur
    const formattedValue = numericValue.toFixed(2);
    setLocalValue(formattedValue);

    // Update validation state for each step
    const isValid = numericValue > 0;
    for (let step = 1; step <= 7; step++) {
      setStepValidation(
        getValidationPhaseForStep(step),
        step === currentStep ? isValid : true
      );
    }

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
      console.error("Error parsing date:", error);
      return null;
    }
  };

  // Update the handleDateChange function
  const handleDateChange = (newDate: Date | null) => {
    try {
      if (!newDate) {
        setLocalValue("");
        onSelect(question.id, "");
        return;
      }

      // Format the date in YYYY-MM-DD format
      const year = newDate.getFullYear();
      const month = String(newDate.getMonth() + 1).padStart(2, "0");
      const day = String(newDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      console.log("Formatted date:", formattedDate);
      setLocalValue(formattedDate);
      onSelect(question.id, formattedDate);
    } catch (error) {
      console.error("Error in handleDateChange:", error);
    }
  };

  const renderQuestionInput = () => {
    switch (question.type) {
      case "radio":
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
                    className={`flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-[#F54538] bg-[#FEF2F2]"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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
                          window.open(option.externalLink, "_blank");
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

      case "money":
        return (
          <div className="mt-4">
            <MoneyInput
              label={question.label || question.text}
              value={localValue || ""}
              onChange={(value: string) => {
                console.log("MoneyInput onChange:", {
                  value,
                  currentLocalValue: localValue,
                });
                if (value === "+") {
                  const currentValue = parseFloat(localValue || "0");
                  const newValue = (currentValue + 1).toFixed(2);
                  console.log("Increment:", { currentValue, newValue });
                  handleMoneyInputChange(newValue);
                } else if (value === "-") {
                  const currentValue = parseFloat(localValue || "0");
                  if (currentValue > 0) {
                    const newValue = Math.max(0, currentValue - 1).toFixed(2);
                    console.log("Decrement:", { currentValue, newValue });
                    handleMoneyInputChange(newValue);
                  }
                } else if (value === "") {
                  // Handle clear action
                  setLocalValue("");
                  onSelect(question.id, "");
                  for (let step = 1; step <= 7; step++) {
                    setStepValidation(
                      getValidationPhaseForStep(step),
                      step !== currentStep
                    );
                  }
                } else {
                  console.log("Direct value change:", { value });
                  handleMoneyInputChange(value);
                }
              }}
              isFocused={isFocused}
              onFocus={() => {
                console.log("MoneyInput onFocus");
                setIsFocused(true);
              }}
              onBlur={handleMoneyInputBlur}
              className="w-full"
              placeholder={question.placeholder || t("common.enterAmount")}
              required={question.required}
            />
          </div>
        );

      case "date":
        return (
          <DateSelector
            selected={
              selectedOption ? parseISO(selectedOption as string) : null
            }
            onSelect={(date) => {
              if (date) {
                onSelect(question.id, format(date, "yyyy-MM-dd"));
              } else {
                onSelect(question.id, "");
              }
            }}
            label={question.text}
            error={null}
            required={question.required}
          />
        );

      case "flight_selector":
        return (
          <>
            <ModularFlightSelector
              showFlightSearch={showFlightSearch}
              phase={
                phase ? Object.values(ValidationPhase).indexOf(phase) + 1 : 1
              }
              currentPhase={
                phase ? Object.values(ValidationPhase).indexOf(phase) + 1 : 1
              }
              disabled={disabled}
              stepNumber={stepNumber || 1}
              setValidationState={(isValid: boolean) => {
                if (!stepNumber) return;
                // Create a validation state object where only the current step's validation is updated
                const validationState: StepValidationState = {
                  1: stepNumber === 1 ? isValid : true,
                  2: stepNumber === 2 ? isValid : true,
                  3: stepNumber === 3 ? isValid : true,
                  4: stepNumber === 4 ? isValid : true,
                  5: stepNumber === 5 ? isValid : true,
                  6: stepNumber === 6 ? isValid : true,
                  7: stepNumber === 7 ? isValid : true,
                };

                setStepValidation(
                  getValidationPhaseForStep(stepNumber),
                  validationState[stepNumber as keyof StepValidationState]
                );
              }}
              onSelect={(flight: FlightSegment | FlightSegment[]) => {
                if (flight && stepNumber) {
                  // Debounce the state update to prevent infinite loops
                  setTimeout(() => {
                    const flightIds = Array.isArray(flight)
                      ? flight.map((f) => f.id || "").join(",")
                      : flight.id || "";

                    onSelect(question.id, flightIds);

                    // Also update validation state
                    const validationState: StepValidationState = {
                      1: stepNumber === 1 ? !!flightIds : true,
                      2: stepNumber === 2 ? !!flightIds : true,
                      3: stepNumber === 3 ? !!flightIds : true,
                      4: stepNumber === 4 ? !!flightIds : true,
                      5: stepNumber === 5 ? !!flightIds : true,
                      6: stepNumber === 6 ? !!flightIds : true,
                      7: stepNumber === 7 ? !!flightIds : true,
                    };
                    setStepValidation(
                      getValidationPhaseForStep(stepNumber),
                      validationState[stepNumber as keyof StepValidationState]
                    );
                  }, 0);
                }
              }}
              onInteract={onInteract}
              onFlightTypeChange={onFlightTypeChange}
              setIsFlightNotListedOpen={setIsFlightNotListedOpen}
            />
            {question.relatedQuestions?.map((relatedQ) => (
              <div key={relatedQ.id} className="mt-24 pt-12 pb-12 mb-12">
                <hr className="border-t border-gray-200 mb-12" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {relatedQ.text}
                </h3>
                <MoneyInput
                  label=""
                  value={selectedOption || ""}
                  onChange={(value: string) => onSelect(relatedQ.id, value)}
                  placeholder={relatedQ.placeholder || "Enter amount"}
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
            <div className="h-full bg-[#F54538] rounded-full">
              <motion.div
                initial={{ width: "0%" }}
                animate={{
                  width:
                    currentStep === 1 && !selectedOption
                      ? "0%"
                      : `${(currentStep / totalSteps) * 100}%`,
                }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>
          {(currentStep > 1 || selectedOption) && (
            <div className="text-sm text-gray-500">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <span>
                  {t(
                    "phases.initialAssessment.counter." +
                      (totalSteps === 1 ? "single" : "multiple")
                  )
                    ?.replace("{current}", currentStep.toString())
                    .replace("{total}", totalSteps.toString()) ||
                    `Question ${currentStep} of ${totalSteps}`}
                </span>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Question */}
      <div className="space-y-4">
        <h3
          className={`text-lg font-medium text-gray-900 ${
            question.type === "flight_selector" ? "mb-12" : ""
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
