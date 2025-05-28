"use client";

import { useCallback, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import useStore from "@/store";
import type { Store } from "@/store/types";
import type { Answer, Question } from "@/types/shared/wizard";
import type { Translations } from "@/translations/types";

interface Phase1QAWizardClientProps {
  questions: Question[];
  validationRules: {
    required: string[];
    dependencies: Array<{ id: string; dependsOn: string }>;
  };
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  translations: Translations;
}

export function Phase1QAWizardClient({
  questions,
  validationRules,
  onComplete,
  initialAnswers = [],
  translations,
}: Phase1QAWizardClientProps) {
  // Store selectors - Use correct actions
  const { setCurrentStep, setAnswer, currentStep, answers } = useStore(
    (state: Store) => ({
      setCurrentStep: state.actions.wizard.setCurrentStep,
      setAnswer: state.actions.wizard.setAnswer,
      currentStep: state.wizard.currentStep,
      answers: state.wizard.answers,
    })
  );

  // Get current question
  const currentQuestion = useMemo(() => {
    return questions[currentStep] || questions[0];
  }, [questions, currentStep]);

  // Get the selected option for the current question
  const selectedOption = useMemo(() => {
    const answer = answers.find((a) => a.id === currentQuestion.id);
    return (answer?.value as string) || "";
  }, [answers, currentQuestion.id]);

  // Handle answer selection - Use setAnswer and setCurrentStep
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      // Log for debugging
      console.log(
        `Setting answer for question ${questionId} to value: ${value}`
      );

      // Call the updated setAnswer action from the store
      setAnswer(questionId, value);

      // Determine the next step
      const nextStep =
        currentStep < questions.length - 1 ? currentStep + 1 : currentStep;

      // Check if it's the last question before potentially moving
      const isLastQuestion = currentStep === questions.length - 1;

      if (!isLastQuestion) {
        setCurrentStep(nextStep);
      }

      // If we're at the last question, call onComplete after setting the answer
      if (isLastQuestion) {
        // We need to get the *updated* answers state for onComplete
        // Since zustand updates are async, we might need a slight delay or a different pattern
        // For now, let's assume the state updates quickly enough or onComplete can use the state
        // A better approach might be to have onComplete read directly from the store if needed
        const updatedAnswers = useStore.getState().wizard.answers; // Use useStore.getState()
        onComplete?.(updatedAnswers);
      }
    },
    [setAnswer, currentStep, questions.length, setCurrentStep, onComplete]
  );

  // Early return if no questions
  if (!questions.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-900">
                {currentQuestion.text}
              </h3>
              {currentQuestion.description && (
                <p className="text-sm text-gray-500">
                  {currentQuestion.description}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <label
                  key={option.id}
                  className={`w-full py-3 px-4 text-left border rounded-lg transition-all duration-200 cursor-pointer block ${
                    selectedOption === option.value
                      ? "border-[#F54538] bg-red-50"
                      : "border-gray-200 hover:border-[#F54538] hover:bg-red-50"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.value}
                        checked={selectedOption === option.value}
                        onChange={() => {
                          console.log(
                            `Radio onChange triggered for option: ${option.value}`
                          );
                          handleSelect(currentQuestion.id, option.value);
                        }}
                        className="h-4 w-4 border border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
                      />
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-gray-900 text-sm leading-tight">
                        {option.label}
                      </div>
                      {option.description && (
                        <div className="mt-0.5 text-xs text-gray-500 leading-tight">
                          {option.description}
                        </div>
                      )}
                      {option.subLabel && (
                        <div className="mt-0.5 text-xs text-gray-500 leading-tight">
                          {option.subLabel}
                        </div>
                      )}
                    </div>
                    {option.icon && (
                      <div className="flex-shrink-0">
                        <img
                          src={option.icon}
                          alt={option.label}
                          className="w-5 h-5"
                        />
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Use setCurrentStep */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
          disabled={currentStep === 0}
        >
          {translations.common.back || "Back"}
        </button>
        <button
          onClick={() =>
            setCurrentStep(Math.min(questions.length - 1, currentStep + 1))
          }
          className="px-4 py-2 bg-[#F54538] text-white rounded-md hover:bg-[#E03F33]"
          disabled={
            currentStep === questions.length - 1 ||
            !answers.find((a) => a.id === currentQuestion.id) // Keep this simple check for enabling Next
          }
        >
          {currentStep === questions.length - 1
            ? translations.common.submit || "Submit"
            : translations.common.next || "Next"}
        </button>
      </div>
    </div>
  );
}
