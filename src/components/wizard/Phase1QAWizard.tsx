"use client";

/* eslint-disable @typescript-eslint/no-unused-vars */
declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
    __wizardTransitionTimeout?: NodeJS.Timeout;
  }
}
/* eslint-enable @typescript-eslint/no-unused-vars */

import { qaWizardConfig } from "@/config/qaWizard";
import { useTranslation } from "@/hooks/useTranslation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { AnimatePresence, motion } from "framer-motion";
import React, { useCallback, useEffect, useMemo } from "react";
import type { ValidationStep, StoreState } from "../../lib/state/types";
import useStore from "../../lib/state/store";
import { Question } from "../../types/experience";
import { Answer } from "../../types/wizard";
import { QuestionAnswer } from "../shared/QuestionAnswer";

type StoreWithActions = StoreState & {
  validateAndUpdateStep: (step: ValidationStep, isValid: boolean) => void;
  batchUpdateWizardState: (updates: Partial<StoreState>) => void;
};

interface Phase1QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
}

export const Phase1QAWizard: React.FC<Phase1QAWizardProps> = ({
  questions = [],
  onComplete,
  initialAnswers = [],
}) => {
  const { t } = useTranslation();

  const wizardAnswers = useStore(
    (state: StoreWithActions) => state.wizardAnswers
  );
  const wizardCurrentSteps = useStore(
    (state: StoreWithActions) => state.wizardCurrentSteps
  );
  const isCompleted = useStore(
    (state: StoreWithActions) => state.wizardIsCompleted
  );
  const isValid = useStore((state: StoreWithActions) => state.wizardIsValid);
  const successMessage = useStore(
    (state: StoreWithActions) => state.wizardSuccessMessage
  );
  const batchUpdateWizardState = useStore(
    (state: StoreWithActions) => state.batchUpdateWizardState
  );
  const validationState = useStore(
    (state: StoreWithActions) => state.validationState
  );

  // Get wizard type
  const wizardType = "phase1";

  // Filter answers specific to this wizard instance
  const instanceAnswers = useMemo(() => {
    return initialAnswers && initialAnswers.length > 0
      ? initialAnswers
      : wizardAnswers;
  }, [initialAnswers, wizardAnswers]);

  // Get success state for this wizard
  const successState = useMemo(() => {
    console.log("=== Success State Determination START ===", {
      isCompleted,
      isValid,
      successMessage,
      instanceAnswers,
      validationState: {
        stepValidation: validationState.stepValidation?.[2],
        stepInteraction: validationState.stepInteraction?.[2],
        isWizardValid: validationState.isWizardValid,
        isWizardSubmitted: validationState.isWizardSubmitted,
      },
      timestamp: new Date().toISOString(),
    });

    // If there are no answers or wizard is not completed, don't show success state
    if (!isCompleted || !instanceAnswers || instanceAnswers.length === 0) {
      console.log("=== Success State FALSE: No answers or not completed ===", {
        isCompleted,
        hasAnswers: !!instanceAnswers,
        answersLength: instanceAnswers?.length,
        timestamp: new Date().toISOString(),
      });
      return { showing: false, message: "" };
    }

    // Check all validation conditions
    const isStepValid = validationState.stepValidation?.[2] === true;
    const hasInteracted = validationState.stepInteraction?.[2] === true;
    const isWizardValid = validationState.isWizardValid === true;
    const isWizardSubmitted = validationState.isWizardSubmitted === true;

    console.log("=== Validation Conditions ===", {
      isStepValid,
      hasInteracted,
      isWizardValid,
      isWizardSubmitted,
      timestamp: new Date().toISOString(),
    });

    // All conditions must be true to show success
    const showing =
      isCompleted &&
      isValid &&
      isStepValid &&
      hasInteracted &&
      isWizardValid &&
      isWizardSubmitted;

    // If not showing success, return early
    if (!showing) {
      console.log("=== Success State FALSE: Validation failed ===", {
        showing,
        timestamp: new Date().toISOString(),
      });
      return { showing: false, message: "" };
    }

    // If we have a stored message and we're showing success, use it
    if (successMessage) {
      console.log("=== Success State TRUE: Using stored message ===", {
        showing,
        message: successMessage,
        timestamp: new Date().toISOString(),
      });
      return { showing, message: successMessage };
    }

    // Calculate message based on answers
    const lastAnswer = instanceAnswers[instanceAnswers.length - 1];
    const question = questions.find((q) => q.id === lastAnswer?.questionId);
    const option = question?.options?.find(
      (o) => o.value === lastAnswer?.value
    );
    const message = option?.showConfetti
      ? t.wizard.success.goodChance
      : t.wizard.success.answersSaved;

    console.log("=== Success State TRUE: Calculated message ===", {
      showing,
      message,
      timestamp: new Date().toISOString(),
    });

    return { showing, message };
  }, [
    isCompleted,
    isValid,
    successMessage,
    instanceAnswers,
    questions,
    t.wizard.success,
    validationState,
  ]);

  // Get current step
  const currentStep = useMemo(
    () => wizardCurrentSteps[wizardType] || 0,
    [wizardCurrentSteps]
  );

  // Get visible questions
  const visibleQuestions = useMemo(() => {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return [];
    }

    // Always include the first question
    const firstQuestion = questions[0];
    const remainingQuestions = questions.slice(1);

    // Filter remaining questions based on showIf conditions
    const filteredRemaining = remainingQuestions.filter(
      (question: Question) => {
        if (question.showIf) {
          try {
            return question.showIf(instanceAnswers);
          } catch (err) {
            console.error("Error in showIf condition:", err);
            return false;
          }
        }
        return true;
      }
    );

    const result = [firstQuestion, ...filteredRemaining];
    console.log("Visible questions:", {
      total: result.length,
      questions: result.map((q: Question) => q.id),
      answers: instanceAnswers,
    });
    return result;
  }, [questions, instanceAnswers]);

  // Get current question
  const currentQuestion = useMemo(() => {
    if (
      !visibleQuestions ||
      !Array.isArray(visibleQuestions) ||
      visibleQuestions.length === 0
    ) {
      return null;
    }

    if (currentStep < 0 || currentStep >= visibleQuestions.length) {
      return visibleQuestions[0];
    }

    return visibleQuestions[currentStep];
  }, [visibleQuestions, currentStep]);

  // Effect to handle step bounds
  useEffect(() => {
    if (currentStep < 0 || currentStep >= visibleQuestions.length) {
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: 0,
        },
      });
    }
  }, [
    currentStep,
    visibleQuestions.length,
    wizardCurrentSteps,
    batchUpdateWizardState,
  ]);

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      const answer = instanceAnswers.find(
        (a: Answer) => a.questionId === questionId
      );
      return answer?.value?.toString() || "";
    },
    [instanceAnswers]
  );

  // Handle QA wizard completion
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log("=== QA Wizard Complete START ===", {
        answers,
        timestamp: new Date().toISOString(),
      });

      // Find the last answer and determine success message
      const lastAnswer = answers[answers.length - 1];
      const question = questions.find((q) => q.id === lastAnswer?.questionId);
      const option = question?.options?.find(
        (o) => o.value === lastAnswer?.value
      );
      const successMessage = option?.showConfetti
        ? t.wizard.success.goodChance
        : t.wizard.success.answersSaved;

      console.log("=== Success Message Determination ===", {
        lastAnswer,
        questionId: question?.id,
        optionValue: option?.value,
        showConfetti: option?.showConfetti,
        successMessage,
        timestamp: new Date().toISOString(),
      });

      // Only update validation state when explicitly completing the wizard
      if (currentStep === visibleQuestions.length - 1) {
        // Clear any existing timeouts
        if (window.__wizardSuccessTimeout) {
          clearTimeout(window.__wizardSuccessTimeout);
        }
        if (window.__wizardTransitionTimeout) {
          clearTimeout(window.__wizardTransitionTimeout);
        }

        // Immediately update validation state
        batchUpdateWizardState({
          wizardAnswers: answers,
          wizardIsCompleted: true,
          wizardIsValid: true,
          wizardSuccessMessage: successMessage,
          validationState: {
            ...validationState,
            stepValidation: {
              ...validationState.stepValidation,
              2: true,
            },
            stepInteraction: {
              ...validationState.stepInteraction,
              2: true,
            },
            isWizardValid: true,
            isWizardSubmitted: true,
            _timestamp: Date.now(),
          },
        });

        // Call onComplete callback immediately
        onComplete?.(answers);

        console.log("=== QA Wizard Complete - State Updated ===", {
          successMessage,
          timestamp: new Date().toISOString(),
        });

        // Only delay the accordion transition for smooth UX
        window.__wizardTransitionTimeout = setTimeout(() => {
          console.log("=== Success State Timeout - Transitioning ===", {
            timestamp: new Date().toISOString(),
          });

          // Transition to next step after a short delay
          const accordionContext = (window as any).__accordionContext;
          if (accordionContext?.setActiveAccordion) {
            accordionContext.setActiveAccordion("3");
          }
        }, 500); // Reduced to 500ms for smoother transition
      } else {
        // Just update answers without validation if not at the last step
        batchUpdateWizardState({
          wizardAnswers: answers,
          lastAnsweredQuestion: lastAnswer?.questionId,
        });
      }

      console.log("=== QA Wizard Complete END ===", {
        timestamp: new Date().toISOString(),
      });
    },
    [
      batchUpdateWizardState,
      onComplete,
      validationState,
      questions,
      t.wizard.success,
      currentStep,
      visibleQuestions.length,
    ]
  );

  // Handle going to next step
  const goToNext = useCallback(() => {
    if (currentStep < visibleQuestions.length - 1) {
      // Move to next question
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: currentStep + 1,
        },
      });
    } else {
      // Complete the wizard
      handleComplete(instanceAnswers);
    }
  }, [
    currentStep,
    visibleQuestions.length,
    wizardCurrentSteps,
    wizardType,
    batchUpdateWizardState,
    handleComplete,
    instanceAnswers,
  ]);

  // Handle going back
  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: currentStep - 1,
        },
      });
    }
  }, [currentStep, wizardCurrentSteps, batchUpdateWizardState]);

  // Handle answer selection
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      console.log("=== Answer Selection START ===", {
        questionId,
        value,
        currentAnswers: instanceAnswers,
        timestamp: new Date().toISOString(),
      });

      // Get current answers
      const currentAnswers = [...instanceAnswers];
      const answerIndex = currentAnswers.findIndex(
        (a: Answer) => a.questionId === questionId
      );

      // Create new answer
      const newAnswer = {
        questionId,
        value,
        shouldShow: true,
      };

      if (answerIndex >= 0) {
        currentAnswers[answerIndex] = newAnswer;
      } else {
        currentAnswers.push(newAnswer);
      }

      console.log("=== Answer Selection UPDATE ===", {
        newAnswer,
        updatedAnswers: currentAnswers,
        timestamp: new Date().toISOString(),
      });

      // Update wizard state
      batchUpdateWizardState({
        wizardAnswers: currentAnswers,
        lastAnsweredQuestion: questionId,
      });

      // Find the question in the visible questions array
      const currentQuestionObject = visibleQuestions.find(
        (q) => q.id === questionId
      );

      // Auto-advance for radio questions (but not for the final question)
      if (
        currentQuestionObject?.type === "radio" &&
        currentStep < visibleQuestions.length - 1
      ) {
        // Use setTimeout to ensure state is updated before navigation
        console.log(
          "Auto-advancing after radio selection, current step:",
          currentStep
        );
        setTimeout(() => {
          console.log("Executing auto-advance to next question");
          goToNext();
        }, 400);
      }
    },
    [
      instanceAnswers,
      batchUpdateWizardState,
      currentStep,
      visibleQuestions,
      goToNext,
    ]
  );

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    console.log("=== Back To Questions START ===", {
      currentState: {
        isCompleted,
        isValid,
        wizardShowingSuccess: successState.showing,
        validationState: {
          stepValidation: validationState.stepValidation?.[2],
          stepInteraction: validationState.stepInteraction?.[2],
          stepCompleted: validationState.stepCompleted?.[2],
          isWizardValid: validationState.isWizardValid,
          isWizardSubmitted: validationState.isWizardSubmitted,
        },
      },
      timestamp: new Date().toISOString(),
    });

    // Clear any existing timeouts first
    if (window.__wizardSuccessTimeout) {
      clearTimeout(window.__wizardSuccessTimeout);
    }
    if (window.__wizardTransitionTimeout) {
      clearTimeout(window.__wizardTransitionTimeout);
    }

    // Clear all stored states
    sessionStorage.removeItem("activeAccordion");
    localStorage.removeItem("initialAssessmentValidation");
    localStorage.removeItem("wizardState");
    localStorage.removeItem("phase1ValidationState");

    // Create new validation state
    const newValidationState = {
      ...validationState,
      isWizardValid: false,
      isWizardSubmitted: false,
      stepValidation: {
        ...validationState.stepValidation,
        1: true, // Keep step 1 valid since it's the flight selection
        2: false, // Reset step 2 validation
        3: false, // Reset step 3 validation
        4: false, // Reset step 4 validation
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        2: false, // Reset step 2 interaction
      },
      stepCompleted: {
        ...validationState.stepCompleted,
        2: false, // Reset step 2 completion
      },
      completedSteps: [], // Reset all completed steps
      2: false, // Reset the direct step validation
      questionValidation: {}, // Reset all question validations
      fieldErrors: {}, // Reset all field errors
      errors: {
        ...validationState.errors,
        2: [], // Clear errors for step 2
      },
      _timestamp: Date.now(),
    };

    console.log("=== New Validation State ===", {
      stepValidation: newValidationState.stepValidation,
      stepCompleted: newValidationState.stepCompleted,
      completedSteps: newValidationState.completedSteps,
      timestamp: new Date().toISOString(),
    });

    // Reset all wizard-related state in a single batch update
    const updates = {
      wizardIsCompleted: false,
      wizardShowingSuccess: false,
      wizardCurrentSteps: {
        ...wizardCurrentSteps,
        [wizardType]: 0,
      },
      wizardIsValid: false,
      wizardAnswers: [],
      lastAnsweredQuestion: null,
      wizardSuccessMessage: "",
      validationState: newValidationState,
      completedWizards: {},
      wizardSuccessStates: {
        travel_status: { showing: false, message: "" },
        informed_date: { showing: false, message: "" },
        issue: { showing: false, message: "" },
        phase1: { showing: false, message: "" },
        default: { showing: false, message: "" },
      },
      _lastUpdate: Date.now(),
    };

    console.log("=== Applying State Updates ===", {
      updates: {
        wizardIsCompleted: updates.wizardIsCompleted,
        wizardShowingSuccess: updates.wizardShowingSuccess,
        wizardIsValid: updates.wizardIsValid,
        validationState: {
          stepValidation: updates.validationState.stepValidation,
          stepCompleted: updates.validationState.stepCompleted,
          completedSteps: updates.validationState.completedSteps,
          isWizardValid: updates.validationState.isWizardValid,
          isWizardSubmitted: updates.validationState.isWizardSubmitted,
        },
      },
      timestamp: new Date().toISOString(),
    });

    batchUpdateWizardState(updates);

    // Force a re-render of the parent component by triggering a state update
    const accordionContext = (window as any).__accordionContext;
    if (accordionContext?.setOpenAccordions) {
      accordionContext.setOpenAccordions(new Set(["2"])); // Only open step 2
      console.log("=== Updated Accordion Context ===", {
        timestamp: new Date().toISOString(),
      });
    }

    console.log("=== Back To Questions COMPLETE ===", {
      timestamp: new Date().toISOString(),
    });
  }, [
    wizardCurrentSteps,
    batchUpdateWizardState,
    validationState,
    isCompleted,
    isValid,
    successState.showing,
  ]);

  // Get success icon based on last answer
  const getSuccessIcon = useCallback(() => {
    console.log("=== Success Icon Determination START ===", {
      answers: instanceAnswers,
      totalAnswers: instanceAnswers.length,
      timestamp: new Date().toISOString(),
    });

    if (!instanceAnswers || instanceAnswers.length === 0) {
      console.log("=== No Answers Found ===", {
        timestamp: new Date().toISOString(),
      });
      return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
    }

    // Find the relevant answer based on issue type
    const issueType = instanceAnswers.find(
      (a) => a.questionId === "issue_type"
    )?.value;
    const relevantAnswer: Answer | undefined =
      issueType === "delay"
        ? instanceAnswers.find((a) => a.questionId === "delay_duration")
        : issueType === "cancel"
        ? instanceAnswers.find((a) => a.questionId === "cancellation_notice")
        : undefined;

    if (!relevantAnswer?.questionId) {
      return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
    }

    // Find the question and selected option
    const question = questions.find((q) => q.id === relevantAnswer.questionId);
    const option = question?.options?.find(
      (o) => o.value === relevantAnswer.value
    );

    console.log("=== Found Question and Option ===", {
      questionId: question?.id,
      optionValue: option?.value,
      showConfetti: option?.showConfetti,
      timestamp: new Date().toISOString(),
    });

    return option?.showConfetti ? (
      <span className={qaWizardConfig.success.icon.emoji}>🎉</span>
    ) : (
      <CheckCircleIcon className={qaWizardConfig.success.icon.check} />
    );
  }, [instanceAnswers, questions]);

  // Effect to initialize state from localStorage
  useEffect(() => {
    console.log("=== Phase1QAWizard - Initialization START ===", {
      timestamp: new Date().toISOString(),
    });

    const storedState = localStorage.getItem("captain-frank-state");
    if (storedState) {
      try {
        const parsedState = JSON.parse(storedState);
        if (parsedState?.state) {
          const {
            wizardAnswers,
            wizardIsCompleted,
            wizardSuccessMessage,
            validationState,
          } = parsedState.state;

          // Only update if we have stored answers and validation state
          if (wizardAnswers?.length > 0 && validationState) {
            const now = Date.now();

            // Create new validation state with all required fields
            const newValidationState = {
              ...validationState,
              stepValidation: {
                ...validationState.stepValidation,
                2: true, // Ensure step 2 is marked as valid
              },
              stepInteraction: {
                ...validationState.stepInteraction,
                2: true, // Ensure step 2 is marked as interacted with
              },
              isWizardValid: true,
              isWizardSubmitted: true,
              _timestamp: now,
            };

            console.log("=== Phase1QAWizard - Restoring State ===", {
              wizardAnswers,
              validationState: newValidationState,
              timestamp: new Date().toISOString(),
            });

            // Update all states in a single batch
            batchUpdateWizardState({
              wizardAnswers,
              wizardIsCompleted,
              wizardIsValid: true,
              wizardSuccessMessage,
              validationState: newValidationState,
              wizardShowingSuccess: true,
              _lastUpdate: now,
            });
          }
        }
      } catch (error) {
        console.error("Error initializing wizard state:", error);
      }
    }
  }, [batchUpdateWizardState, questions, t.wizard.success]);

  // Effect to handle completion when initialAnswers are provided
  useEffect(() => {
    // Only process if we have initialAnswers and they're not already processed
    if (initialAnswers && initialAnswers.length > 0 && !isCompleted) {
      console.log("=== Phase1QAWizard - Processing initialAnswers ===", {
        answers: initialAnswers,
        timestamp: new Date().toISOString(),
      });

      // Determine what step we should be at based on answers
      const lastAnswerIndex = initialAnswers.length - 1;

      // Update all wizard state in one batch
      const now = Date.now();
      batchUpdateWizardState({
        wizardAnswers: initialAnswers,
        wizardCurrentSteps: {
          phase1: lastAnswerIndex,
        },
        wizardIsCompleted: true,
        wizardIsValid: true,
        wizardShowingSuccess: true,
        wizardSuccessMessage: t.wizard.success.answersSaved,
        validationState: {
          ...validationState,
          stepValidation: {
            ...validationState.stepValidation,
            2: true, // Ensure step 2 is marked as valid
          },
          stepInteraction: {
            ...validationState.stepInteraction,
            2: true, // Ensure step 2 is marked as interacted with
          },
          isWizardValid: true,
          isWizardSubmitted: true,
          _timestamp: now,
        },
        _lastUpdate: now,
      });

      // Call onComplete to notify parent
      if (onComplete) {
        onComplete(initialAnswers);
      }
    }
  }, [
    initialAnswers,
    isCompleted,
    batchUpdateWizardState,
    validationState,
    t.wizard.success,
    onComplete,
  ]);

  // Early return for no questions
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-center">
        <p className="text-gray-500">No questions available</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {successState.showing ? (
          <div className="min-h-[300px] flex flex-col justify-center">
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="w-16 h-16 flex items-center justify-center text-[64px]">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ delay: 0.1, duration: 0.2 }}
                  >
                    {getSuccessIcon()}
                  </motion.div>
                </div>
                <div className="text-center space-y-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: 0.2, duration: 0.2 }}
                  >
                    <h2 className="text-2xl font-bold text-gray-900">
                      {successState.message}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t.wizard.success.processing}
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={handleBackToQuestions}
                        className="px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                      >
                        {t.wizard.success.backToQuestions}
                      </button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          visibleQuestions.length > 0 &&
          currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <QuestionAnswer
                question={currentQuestion}
                selectedOption={getCurrentAnswer(currentQuestion.id)}
                onSelect={handleSelect}
                currentStep={currentStep + 1}
                totalSteps={visibleQuestions.length}
              />
              <div className="flex justify-between mt-6">
                <div>
                  {currentStep > 0 && (
                    <button
                      onClick={goToPrevious}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      {t.wizard.navigation.back}
                    </button>
                  )}
                </div>
                <div>
                  <button
                    onClick={goToNext}
                    className="px-4 py-2 bg-[#F54538] text-white rounded-md hover:bg-[#E03F33]"
                  >
                    {currentStep < visibleQuestions.length - 1
                      ? t.wizard.navigation.next
                      : t.common.submit}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default Phase1QAWizard;
