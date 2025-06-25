"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
    __wizardTransitionTimeout?: NodeJS.Timeout;
    __backToQuestionsHandler?: (e: Event) => void;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

import { useCallback, useState, useEffect, useRef, useMemo } from "react";
import type { Question, QuestionOption, Answer } from "@/types/shared/wizard";
import { motion, AnimatePresence } from "framer-motion";
import { MoneyInput } from "@/components/ui/input/MoneyInput";
import useStore from "@/store"; // Import store hooks
import { useAccordion } from "@/components/shared/accordion/AccordionContext";
import { useTranslation } from "@/hooks/useTranslation";

// Helper function to convert array of answers to a Record for showIf
const answersToRecord = (answers: Answer[]): Record<string, Answer> => {
  return answers.reduce((acc, answer) => {
    acc[answer.questionId] = answer;
    return acc;
  }, {} as Record<string, Answer>);
};

interface Phase1QAWizardProps {
  questions: Question[];
  onComplete: (shouldShowConfetti: boolean) => void;
  store?: any; // Optional now since we'll use the hook directly
  stepId?: string; // Accordion step ID for coordination
  onBackToQuestions?: () => void; // New prop for handling back to questions
}

// New component to expose the success state UI with back to questions button
export const WizardCompletionState = ({
  onBackToQuestions,
  message = "Yay! You have a good chance of compensation.",
  showConfetti = true,
}: {
  onBackToQuestions: () => void;
  message?: string;
  showConfetti?: boolean;
}) => {
  const { t } = useTranslation();
  
  const icon = showConfetti ? (
    <span className="text-[64px]">🎉</span>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-16 h-16 text-green-500"
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
        clipRule="evenodd"
      />
    </svg>
  );

  return (
    <div className="min-h-[300px] flex flex-col justify-center">
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 flex items-center justify-center">{icon}</div>
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
          <p className="text-sm text-gray-500">
            {t("wizard.success.processing")}
          </p>
          <div className="mt-6">
            <button
              onClick={onBackToQuestions}
              className="px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
            >
              {t("wizard.success.backToQuestions")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Phase1QAWizard = ({
  questions,
  onComplete,
  store,
  stepId = "2", // Default step ID if not provided
  onBackToQuestions, // New prop
}: Phase1QAWizardProps) => {
  // Translation hook
  const { t } = useTranslation();

  // Use direct store access
  const storeState = useStore();

  // Access accordion context
  const { setActiveStepId } = useAccordion();

  // Local state for UI with default values
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<any[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const [currentOptionConfetti, setCurrentOptionConfetti] = useState(false);
  const [shouldShowConfetti, setShouldShowConfetti] = useState(false);
  const [isMoneyInputFocused, setIsMoneyInputFocused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Memoize answers to avoid loops
  const answersRef = useRef(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Filter questions based on showIf conditions
  const visibleQuestions = useMemo(() => {
    const answersRecord = answersToRecord(answers);
    return questions.filter((q) => {
      const shouldShow = !q.showIf || q.showIf(answersRecord);
      return shouldShow;
    });
  }, [questions, answers]);

  // Get current question based on visible questions
  const getCurrentVisibleQuestion = useCallback(() => {
    if (visibleQuestions.length === 0) return null;
    const currentIndex = currentStep - 1;
    if (currentIndex < 0 || currentIndex >= visibleQuestions.length) return null;
    return visibleQuestions[currentIndex];
  }, [currentStep, visibleQuestions]);

  // Initialize component state from store only on first render
  const initializedRef = useRef(false);
  const onCompleteCalledRef = useRef(false);
  
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Initialize from store
    if (storeState?.wizard) {
      const wizardState = storeState.wizard;

      // Calculate visible questions based on answers to validate completion
      const answersRecord = answersToRecord(wizardState.answers || []);
      const visibleQuestionsForValidation = questions.filter((q) => {
        const shouldShow = !q.showIf || q.showIf(answersRecord);
        return shouldShow;
      });
      
      // Validate isComplete status against visible questions only
      const hasAllAnswers = visibleQuestionsForValidation.every((q) =>
        (wizardState.answers || []).some(
          (a: { questionId: string }) => a.questionId === q.id
        )
      );

      // Only set isComplete if we have all answers
      const shouldBeComplete = wizardState.isComplete === true && hasAllAnswers;

      // If not complete, make sure we activate the accordion
      if (!shouldBeComplete && stepId) {
        // Set the accordion to be active
        setActiveStepId(stepId);
      }

      if (
        typeof wizardState.currentStep === "number" &&
        wizardState.currentStep >= 1
      ) {
        setCurrentStep(wizardState.currentStep);
      }

      if (
        Array.isArray(wizardState.answers) &&
        wizardState.answers.length > 0
      ) {
        setAnswers(wizardState.answers);
      }

      // Set isComplete status based on our validation
      setIsComplete(shouldBeComplete);

      // Trigger onComplete if the wizard is already complete
      if (shouldBeComplete && !onCompleteCalledRef.current) {
        // Find if any selected options had showConfetti=true
        let anyConfetti = false;
        if (Array.isArray(wizardState.answers) && questions.length > 0) {
          // Check each answer for confetti option
          wizardState.answers.forEach((answer: any) => {
            const question = questions.find((q) => q.id === answer.questionId);
            if (question?.options) {
              const option = question.options.find(
                (opt) => String(opt.value) === String(answer.value)
              );
              if (option?.showConfetti) {
                anyConfetti = true;
              }
            }
          });
        }

        // Set the confetti state
        setShouldShowConfetti(anyConfetti);
        
        // Mark that we've called onComplete to prevent duplicate calls
        onCompleteCalledRef.current = true;
        
        // Call onComplete with confetti status, use a small timeout to ensure component is fully mounted
        setTimeout(() => onComplete(anyConfetti), 100);
      }

      console.log("[Phase1QAWizard] Initialized from store", {
        currentStep: wizardState.currentStep,
        answersCount: wizardState.answers?.length || 0,
        isComplete: shouldBeComplete,
        hasAllAnswers,
      });
    }

    // Always make sure the accordion is open initially if we have a stepId
    if (stepId) {
      setActiveStepId(stepId);
    }
  }, [storeState?.wizard, stepId, setActiveStepId, onComplete]); // Removed questions from deps to prevent re-initialization

  // Update selectedOption when current step or answers change
  useEffect(() => {
    // Return early if visible questions aren't loaded
    if (!visibleQuestions?.length) return;

    const currentStepIndex = currentStep - 1;
    if (currentStepIndex < 0 || currentStepIndex >= visibleQuestions.length) return;

    // Get current question and look for an answer
    const currentQuestion = visibleQuestions[currentStepIndex];
    const answer = answers.find((a) => a.questionId === currentQuestion.id);

    if (answer) {
      console.log(
        `[Phase1QAWizard] Found answer for question ${currentQuestion.id}:`,
        answer.value
      );
      setSelectedOption(String(answer.value));

      // Set confetti status based on the option
      const matchingOption = currentQuestion.options?.find(
        (opt) => String(opt.value) === String(answer.value)
      );
      setCurrentOptionConfetti(!!matchingOption?.showConfetti);
    } else {
      console.log(
        `[Phase1QAWizard] No answer for question ${currentQuestion.id}`
      );
      setSelectedOption("");
      setCurrentOptionConfetti(false);
    }
  }, [currentStep, answers, visibleQuestions]);

  // Adjust currentStep if it exceeds visible questions length
  useEffect(() => {
    if (visibleQuestions.length > 0 && currentStep > visibleQuestions.length) {
      console.log(
        `[Phase1QAWizard] Adjusting currentStep from ${currentStep} to ${visibleQuestions.length}`
      );
      setCurrentStep(visibleQuestions.length);
    }
  }, [visibleQuestions.length, currentStep]);

  // Handle option selection
  const handleAnswer = useCallback(
    (questionId: string, value: any, option?: QuestionOption) => {
      console.log(
        `[Phase1QAWizard] handleAnswer: question=${questionId}, value=${value}`
      );

      // Update local UI state immediately
      setSelectedOption(String(value));
      setCurrentOptionConfetti(!!option?.showConfetti);

      // Handle external links
      if (option?.externalLink) {
        console.log(
          `[Phase1QAWizard] Opening external link: ${option.externalLink}`
        );
        if (option.openInNewTab) {
          window.open(option.externalLink, "_blank", "noopener,noreferrer");
        } else {
          window.location.href = option.externalLink;
        }
        return; // Don't store external links
      }

      // Create the answer object
      const newAnswer = {
        id: questionId,
        questionId,
        value,
        timestamp: Date.now(),
        isValid: true,
        validationErrors: [],
      };

      // Update local answers state
      setAnswers((prev) => {
        const existingIndex = prev.findIndex(
          (a) => a.questionId === questionId
        );
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newAnswer;
          return updated;
        }
        return [...prev, newAnswer];
      });

      // Update store using direct state mutation pattern
      if (storeState?.actions?.wizard?.setAnswer) {
        console.log(`[Phase1QAWizard] Updating store with answer: ${value}`);
        storeState.actions.wizard.setAnswer(questionId, value);
      }

      // Also try the prop-based store as fallback
      else if (store?.actions?.wizard?.setAnswer) {
        console.log(
          `[Phase1QAWizard] Updating prop-based store with answer: ${value}`
        );
        store.actions.wizard.setAnswer(questionId, value);
      }

    },
    [storeState, store]
  );

  // Handle next button click
  const handleNext = useCallback(() => {
    console.log(
      `[Phase1QAWizard] handleNext: currentStep=${currentStep}, total=${visibleQuestions.length}`
    );

    if (currentStep < visibleQuestions.length) {
      // Go to next step
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // Update store
      if (storeState?.actions?.wizard?.setCurrentStep) {
        storeState.actions.wizard.setCurrentStep(nextStep);
      } else if (store?.actions?.wizard?.setCurrentStep) {
        store.actions.wizard.setCurrentStep(nextStep);
      }

    } else {
      // Include the current selection in the answers check
      const currentQuestion = visibleQuestions[currentStep - 1];
      const effectiveAnswers = [...answers];
      
      // If there's a selected option for the current question that's not yet in answers, include it
      if (currentQuestion && selectedOption) {
        const hasCurrentAnswer = answers.some((a) => a.questionId === currentQuestion.id);
        if (!hasCurrentAnswer) {
          effectiveAnswers.push({
            questionId: currentQuestion.id,
            value: selectedOption,
            timestamp: Date.now(),
            validationErrors: []
          });
        }
      }

      // Verify we have all answers before completion
      const hasAllAnswers = visibleQuestions.every((q) =>
        effectiveAnswers.some((a: { questionId: string }) => a.questionId === q.id)
      );

      console.log("[Phase1QAWizard] Checking completion:", {
        visibleQuestions: visibleQuestions.length,
        answers: answers.length,
        hasAllAnswers,
        currentStep,
        selectedOption
      });

      if (!hasAllAnswers) {
        console.warn("[Phase1QAWizard] Cannot complete - missing answers");
        return;
      }

      // Calculate if we should show confetti based on answers
      let anyConfetti = false;
      effectiveAnswers.forEach((answer) => {
        const question = visibleQuestions.find((q) => q.id === answer.questionId);
        if (question?.options) {
          const option = question.options.find(
            (opt) => String(opt.value) === String(answer.value)
          );
          if (option?.showConfetti) {
            anyConfetti = true;
          }
        }
      });

      // Complete the wizard with transition
      console.log("[Phase1QAWizard] Starting transition to completion");
      setIsTransitioning(true);
      setShouldShowConfetti(anyConfetti);

      // Wait for animation before showing completion
      setTimeout(() => {
        console.log("[Phase1QAWizard] Wizard completed");
        setIsComplete(true);
        setIsTransitioning(false);

        // Update store
        if (storeState?.actions?.wizard?.completeWizard) {
          storeState.actions.wizard.completeWizard();
        } else if (store?.actions?.wizard?.completeWizard) {
          store.actions.wizard.completeWizard();
        }

        onComplete(currentOptionConfetti);
      }, 300); // Match the animation duration
    }
  }, [
    currentStep,
    visibleQuestions.length,
    storeState,
    store,
    onComplete,
    currentOptionConfetti,
    answers,
    visibleQuestions,
    selectedOption,
  ]);

  // Handle back button click
  const handleBack = useCallback(() => {
    console.log(`[Phase1QAWizard] handleBack: currentStep=${currentStep}`);

    if (currentStep > 1) {
      // Go to previous step
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);

      // Update store
      if (storeState?.actions?.wizard?.setCurrentStep) {
        storeState.actions.wizard.setCurrentStep(prevStep);
      } else if (store?.actions?.wizard?.setCurrentStep) {
        store.actions.wizard.setCurrentStep(prevStep);
      }

      // Direct localStorage update for reliability
      try {
        const storedState = localStorage.getItem("captain-frank-store");
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          if (parsedState.state?.wizard) {
            parsedState.state.wizard.currentStep = prevStep;
            localStorage.setItem(
              "captain-frank-store",
              JSON.stringify(parsedState)
            );
          }
        }
      } catch (e) {
        console.error("[Phase1QAWizard] Error updating localStorage:", e);
      }
    }
  }, [currentStep, storeState, store]);

  // Handle reset functionality
  const handleReset = useCallback(() => {
    console.log("[Phase1QAWizard] Resetting wizard");

    // Reset local state
    setCurrentStep(1);
    setAnswers([]);
    setIsComplete(false);
    setSelectedOption("");
    setShouldShowConfetti(false);
    
    // Reset the onComplete called flag
    onCompleteCalledRef.current = false;

    // Reset store state
    if (storeState?.actions?.wizard?.resetWizard) {
      storeState.actions.wizard.resetWizard();
    } else if (store?.actions?.wizard?.resetWizard) {
      store.actions.wizard.resetWizard();
    }


    // Activate accordion
    if (stepId) {
      setActiveStepId(stepId);
    }
  }, [storeState, stepId, setActiveStepId]);

  // Handle back to questions functionality
  const handleBackToQuestions = useCallback(() => {
    console.log("[Phase1QAWizard] Handling back to questions");

    // Reset local state completely
    setCurrentStep(1);
    setAnswers([]);
    setSelectedOption("");
    setCurrentOptionConfetti(false);
    
    // Set isComplete to false to show questions again
    setIsComplete(false);
    setShouldShowConfetti(false);
    
    // Reset the onComplete called flag
    onCompleteCalledRef.current = false;

    // Reset wizard completion status in store
    if (storeState?.actions?.wizard?.resetWizard) {
      storeState.actions.wizard.resetWizard();
    } else if (store?.actions?.wizard?.resetWizard) {
      store.actions.wizard.resetWizard();
    }

    // Set the step to active in the accordion
    if (stepId) {
      setActiveStepId(stepId);
    }

    // Don't call parent handler here - it creates a circular dependency
    // The parent should handle its own state reset separately
  }, [
    setIsComplete,
    storeState,
    store,
    stepId,
    setActiveStepId,
  ]);

  // Fix: Move useEffect outside conditional block and add conditional logic inside
  useEffect(() => {
    if (!isComplete) return;

    // Register the back to questions handler with the parent when complete
    const backToQuestionsHandler = (e: Event) => {
      e.preventDefault();
      console.log("[Phase1QAWizard] Back to questions button clicked");
      handleBackToQuestions();
    };

    // Store the handler in window for external access
    window.__backToQuestionsHandler = backToQuestionsHandler;

    return () => {
      delete window.__backToQuestionsHandler;
    };
  }, [isComplete, handleBackToQuestions]);

  // Helper function to render questions
  const renderQuestions = () => {

  // Get current question from visible questions
  const currentStepIndex = currentStep - 1;
  const currentQuestion = visibleQuestions[currentStepIndex];

  if (!currentQuestion) {
    console.log(
      `[Phase1QAWizard] No question found at index ${currentStepIndex}, visibleQuestions.length=${visibleQuestions.length}, currentStep=${currentStep}`
    );
    
    // If we have visible questions but current step is out of bounds, reset to step 1
    if (visibleQuestions.length > 0 && currentStep > visibleQuestions.length) {
      console.log("[Phase1QAWizard] Auto-adjusting to first question");
      setCurrentStep(1);
      return null; // Return null to trigger re-render with correct step
    }
    
    // If no visible questions at all, show error
    return (
      <div className="text-center p-4">
        <p className="text-sm text-gray-500 mb-3">No questions available</p>
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Reset Wizard
        </button>
      </div>
    );
  }

  // Determine if we should show the Next button
  const showNextButton = selectedOption !== "" && selectedOption !== undefined;

  // Calculate progress based on visible questions
  const totalSteps = visibleQuestions.length;
  const progressPercent = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  // Render the question UI
  return (
    <div className="w-full space-y-6 relative">
      {/* Group Progress Bar and Text */}
      {totalSteps > 0 && (
        <div>
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-brand-red h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {/* Step Indicator Text */}
          <p className="text-sm text-gray-600 text-right pt-1">
            {t(
              "phases.initialAssessment.counter." +
                (totalSteps === 1 ? "single" : "multiple"),
              totalSteps === 1
                ? "Question {current} of {total}"
                : "Questions {current} of {total}"
            )
              ?.replace("{current}", currentStep.toString())
              .replace("{total}", totalSteps.toString())}
          </p>
        </div>
      )}

      {/* Animated Question Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`question-${currentQuestion.id}-${currentStep}`}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">
              {currentQuestion.text}
            </h3>
            {currentQuestion.description && (
              <p className="text-sm text-gray-500">
                {currentQuestion.description}
              </p>
            )}
          </div>

          <div className="space-y-3 mt-4">
            {currentQuestion.type === "money" ? (
              <MoneyInput
                label=""
                value={selectedOption || ""}
                onChange={(value) => {
                  setSelectedOption(value);
                  // For money inputs, pass undefined as the option parameter
                  handleAnswer(currentQuestion.id, value, undefined);
                }}
                onFocus={() => setIsMoneyInputFocused(true)}
                onBlur={() => setIsMoneyInputFocused(false)}
                isFocused={isMoneyInputFocused}
                placeholder={currentQuestion.placeholder || "0.00"}
                className="w-full"
              />
            ) : (
              currentQuestion.options?.map((option) => {
                const isSelected = selectedOption === option.value;

              // For external link options, create a direct link
              if (option.externalLink) {
                return (
                  <a
                    key={option.id}
                    href={option.externalLink}
                    target={option.openInNewTab ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      // Explicitly open for extra certainty
                      if (option.openInNewTab) {
                        e.preventDefault(); // Prevent default link behavior
                        console.log(
                          `[Phase1QAWizard] Manually opening window: ${option.externalLink}`
                        );
                        window.open(
                          option.externalLink,
                          "_blank",
                          "noopener,noreferrer"
                        );
                      }

                      // Just for visual feedback before navigating away
                      setSelectedOption(option.value);
                    }}
                    className={`w-full py-3 px-4 text-left border rounded-lg transition-all duration-200 cursor-pointer block ${
                      isSelected
                        ? "border-[#F54538] bg-red-50"
                        : "border-gray-200 hover:border-[#F54538] hover:bg-red-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 relative">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value={option.value}
                          checked={isSelected}
                          onChange={() => {}} // No-op as the link handles the action
                          className="h-4 w-4 cursor-pointer border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
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
                  </a>
                );
              }

              // Regular option without external link
              return (
                <label
                  key={option.id}
                  className={`w-full py-3 px-4 text-left border rounded-lg transition-all duration-200 cursor-pointer block ${
                    isSelected
                      ? "border-[#F54538] bg-red-50"
                      : "border-gray-200 hover:border-[#F54538] hover:bg-red-50"
                  }`}
                  onClick={() => {
                    handleAnswer(currentQuestion.id, option.value, option);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 relative">
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option.value}
                        checked={isSelected}
                        onChange={() => {
                          handleAnswer(
                            currentQuestion.id,
                            option.value,
                            option
                          );
                        }}
                        className="h-4 w-4 cursor-pointer border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
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
              );
            })
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        {/* Back Button */}
        <div>
          <button
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-6 py-2 font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            type="button"
          >
            {t("common.back")}
          </button>
        </div>

        {/* Next/Finish Button (only show if an option is selected) */}
        {showNextButton && (
          <div>
            <button
              onClick={() => {
                console.log("[Phase1QAWizard] Next button clicked");
                handleNext();
              }}
              className="px-6 py-2 font-medium text-white bg-[#F54538] rounded-lg hover:bg-red-600 transition-colors"
              type="button"
            >
              {currentStep < visibleQuestions.length ? t("common.next") : t("common.finish")}
            </button>
          </div>
        )}
        {/* Ensure the container still takes space even if Next is hidden, to keep Back button left-aligned */}
        {!showNextButton && <div />}
      </div>
    </div>
  );
  };

  // Render with animation wrapper
  return (
    <AnimatePresence mode="wait">
      {isComplete ? (
        <motion.div
          key="completion"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <WizardCompletionState
            onBackToQuestions={handleBackToQuestions}
            message={shouldShowConfetti ? t("wizard.success.goodChance") : t("wizard.success.answersSaved")}
            showConfetti={shouldShowConfetti}
          />
        </motion.div>
      ) : (
        <motion.div
          key="questions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderQuestions()}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
