'use client';

declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
  }
}

import React, { useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer } from '../../types/wizard';
import { Question } from '../../types/experience';
import { QuestionAnswer } from '../shared/QuestionAnswer';
import type { Flight } from '../../types/store';
import { useStore } from '../../lib/state/store';
import type { StoreState } from '../../lib/state/store';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { qaWizardConfig } from '@/config/qaWizard';

// Add type for wizard step keys
type WizardStepKey =
  | 'travel_status'
  | 'informed_date'
  | 'issue'
  | 'phase1'
  | 'default';

interface QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  onInteract?: () => void;
  selectedFlight?: Flight | null;
  initialAnswers?: Answer[];
}

// Define handleOptionClick outside the component
export const handleOptionClick = (
  questionId: string,
  value: string | number | boolean,
  wizardAnswers: Answer[],
  batchUpdateWizardState: (updates: Partial<StoreState>) => void
) => {
  // Get current answers
  const currentAnswers = [...wizardAnswers];
  const answerIndex = currentAnswers.findIndex(
    (a) => a.questionId === questionId
  );

  // Create new answer or update existing
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

  // Only update answers and lastAnsweredQuestion, no validation
  batchUpdateWizardState({
    wizardAnswers: currentAnswers,
    lastAnsweredQuestion: questionId,
    wizardCurrentSteps: {}, // Keep current steps unchanged
  });
};

export const QAWizard: React.FC<QAWizardProps> = ({
  questions = [],
  onComplete,
  selectedFlight,
  initialAnswers = [],
}) => {
  const {
    wizardAnswers,
    wizardCurrentSteps,
    wizardSuccessStates,
    batchUpdateWizardState,
    handleWizardComplete,
    lastAnsweredQuestion,
    completedWizards,
    validationState,
    validateAndUpdateStep,
  } = useStore();

  // Get wizard ID and type
  const wizardId = questions?.[0]?.id;
  const wizardType = useMemo((): WizardStepKey => {
    const firstQuestionId = questions[0]?.id;
    if (!firstQuestionId) return 'default';

    // Check if this is the initial assessment wizard
    if (firstQuestionId.startsWith('issue_')) {
      return 'issue';
    }

    const type = firstQuestionId.split('_')[0];
    // Map 'informed' to 'informed_date'
    if (type === 'informed') return 'informed_date';
    return (type === 'travel' ? 'travel_status' : type) as WizardStepKey;
  }, [questions]);

  // Get success state for this wizard type
  const successState = useMemo(() => {
    return wizardSuccessStates[wizardType] || { showing: false, message: '' };
  }, [wizardSuccessStates, wizardType]);

  // Get current step for this instance
  const wizardCurrentStep = useMemo(
    () => wizardCurrentSteps[wizardType] || 0,
    [wizardCurrentSteps, wizardType]
  );

  // Filter answers specific to this wizard instance
  const instanceAnswers = useMemo(() => {
    let answers: Answer[] = [];
    if (initialAnswers && initialAnswers.length > 0) {
      answers = initialAnswers;
    } else if (wizardType === 'travel_status') {
      // Get all relevant answers from wizardAnswers
      answers = wizardAnswers.filter(
        (a) =>
          a.questionId === 'travel_status' ||
          a.questionId === 'refund_status' ||
          a.questionId === 'ticket_cost'
      );
    } else if (wizardType === 'informed_date') {
      answers =
        wizardAnswers.filter(
          (a) =>
            a.questionId === 'informed_date' ||
            a.questionId === 'specific_informed_date'
        ) || [];
    } else if (wizardType === 'issue') {
      // For initial assessment, get all issue-related answers
      answers = wizardAnswers.filter((a) => a.questionId.startsWith('issue_'));
    } else {
      answers = wizardAnswers || [];
    }

    return answers;
  }, [wizardType, initialAnswers, wizardAnswers]);

  // All memoized values must be at the top level
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
        // If this question has a showIf condition, evaluate it
        if (question.showIf) {
          try {
            // Get all answers for evaluation
            const shouldShow = question.showIf(wizardAnswers);
            return shouldShow;
          } catch (err) {
            return false;
          }
        }

        // If no showIf condition, show the question
        return true;
      }
    );

    // Combine first question with filtered remaining questions
    const filtered = [firstQuestion, ...filteredRemaining];

    return filtered;
  }, [questions, wizardAnswers]);

  // Get current question with defensive checks
  const currentQuestion = useMemo(() => {
    // Ensure we have valid questions and step
    if (
      !visibleQuestions ||
      !Array.isArray(visibleQuestions) ||
      visibleQuestions.length === 0
    ) {
      return null;
    }

    // Ensure step is within bounds
    if (wizardCurrentStep < 0 || wizardCurrentStep >= visibleQuestions.length) {
      return visibleQuestions[0];
    }

    const question = visibleQuestions[wizardCurrentStep];
    return question;
  }, [visibleQuestions, wizardCurrentStep]);

  // Effect to handle step bounds
  useEffect(() => {
    if (wizardCurrentStep < 0 || wizardCurrentStep >= visibleQuestions.length) {
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: 0,
        },
      });
    }
  }, [
    wizardCurrentStep,
    visibleQuestions.length,
    wizardCurrentSteps,
    wizardType,
    batchUpdateWizardState,
  ]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false;

    // For flight selector questions, only show Complete button when flights are selected
    if (currentQuestion.type === 'flight_selector') {
      return Boolean(selectedFlight && selectedFlight.id);
    }

    return (
      instanceAnswers.some((a) => a.questionId === currentQuestion.id) ||
      wizardAnswers.some((a) => a.questionId === currentQuestion.id)
    );
  }, [currentQuestion, instanceAnswers, wizardAnswers, selectedFlight]);

  // Add new function to check if the current step can be completed
  const canCompleteCurrentStep = useMemo(() => {
    console.log('=== canCompleteCurrentStep Debug ===');
    console.log('Current Question:', currentQuestion);
    console.log('Selected Flight:', selectedFlight);

    if (!currentQuestion) return false;

    // For flight selector questions, require a selected flight
    if (currentQuestion?.type === 'flight_selector') {
      const hasSelectedFlight = Boolean(selectedFlight && selectedFlight.id);
      console.log('Flight selector check:', { hasSelectedFlight });
      return hasSelectedFlight;
    }

    // For other questions, check if they're answered
    const isAnswered =
      instanceAnswers.some((a) => a.questionId === currentQuestion?.id) ||
      wizardAnswers.some((a) => a.questionId === currentQuestion?.id);

    console.log('Regular question check:', { isAnswered });
    return isAnswered;
  }, [currentQuestion, instanceAnswers, wizardAnswers, selectedFlight]);

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      const answer =
        instanceAnswers.find((a) => a.questionId === questionId) ||
        wizardAnswers.find((a) => a.questionId === questionId);
      return answer?.value?.toString() || '';
    },
    [instanceAnswers, wizardAnswers]
  );

  // Handle answer selection
  const handleSelect = (questionId: string, value: string) => {
    console.log('QA Wizard handleSelect called:', {
      questionId,
      value,
      currentAnswers: wizardAnswers,
      wizardType,
      selectedFlight,
    });

    // Create new answer
    const newAnswer = {
      questionId,
      value,
      shouldShow: true,
    };

    // Keep other answers
    const otherAnswers = wizardAnswers.filter(
      (answer) => answer.questionId !== questionId
    );
    console.log('Other answers being preserved:', otherAnswers);

    // Update answers without validation
    const updatedAnswers = [...otherAnswers, newAnswer];
    batchUpdateWizardState({
      wizardAnswers: updatedAnswers,
      lastAnsweredQuestion: questionId,
    });

    console.log('Final updated answers:', {
      updatedAnswers,
      wizardType,
      isCurrentQuestionAnswered: false,
    });
  };

  const goToNext = useCallback(() => {
    console.log('=== QA Wizard goToNext Debug ===');
    console.log('1. Initial state:', {
      isCurrentQuestionAnswered,
      canCompleteCurrentStep,
      currentQuestion,
      wizardType,
      wizardAnswers,
      selectedFlight,
      validationState,
    });

    // Don't proceed if current step can't be completed or no current question
    if (!canCompleteCurrentStep || !currentQuestion) {
      console.log(
        'Cannot proceed: step cannot be completed or no current question'
      );
      return;
    }

    // Get the current answer
    const currentAnswer =
      instanceAnswers.find((a) => a.questionId === currentQuestion.id) ||
      wizardAnswers.find((a) => a.questionId === currentQuestion.id);

    // For flight selector questions, we don't require an answer object
    if (!currentAnswer && currentQuestion.type !== 'flight_selector') {
      console.log(
        'Cannot proceed: no current answer found and not a flight selector'
      );
      return;
    }

    // Get the selected option if we have an answer
    const selectedOption =
      currentAnswer &&
      currentQuestion.options?.find(
        (opt) => opt.value.toString() === currentAnswer.value?.toString()
      );

    console.log('2. Current answer:', currentAnswer);
    console.log('3. Selected option:', selectedOption);

    // If we're on the last question and user clicked Complete
    if (wizardCurrentStep === visibleQuestions.length - 1) {
      console.log('4. On last question, preparing to complete wizard');
      const successMessage = selectedOption?.showConfetti
        ? 'Super! Du hast gute Chancen auf eine Entschädigung.'
        : 'Deine Antworten wurden gespeichert.';

      // For informed date wizard, use the proper ID
      const completeWizardId =
        wizardType === 'informed_date' ? 'informed_date' : wizardId;

      // Let the store handle completion with current answers
      if (completeWizardId) {
        // Get only the relevant answers for this wizard type
        const relevantAnswers =
          wizardType === 'informed_date'
            ? wizardAnswers.filter(
                (a) =>
                  a.questionId === 'informed_date' ||
                  a.questionId === 'specific_informed_date'
              )
            : wizardType === 'travel_status'
              ? wizardAnswers.filter(
                  (a) =>
                    a.questionId === 'travel_status' ||
                    a.questionId === 'refund_status' ||
                    a.questionId === 'ticket_cost' ||
                    a.questionId === 'alternative_flight_airline_expense' ||
                    a.questionId === 'alternative_flight_own_expense' ||
                    a.questionId === 'trip_costs'
                )
              : wizardAnswers;

        console.log('5. Relevant answers for completion:', {
          wizardType,
          relevantAnswers,
        });

        // Keep answers from other wizards
        const otherWizardAnswers =
          wizardType === 'informed_date'
            ? wizardAnswers.filter(
                (a) =>
                  a.questionId === 'travel_status' ||
                  a.questionId === 'refund_status' ||
                  a.questionId === 'ticket_cost'
              )
            : wizardType === 'travel_status'
              ? wizardAnswers.filter(
                  (a) =>
                    a.questionId === 'informed_date' ||
                    a.questionId === 'specific_informed_date'
                )
              : [];

        const combinedAnswers = [...otherWizardAnswers, ...relevantAnswers];

        console.log('6. Combined answers:', combinedAnswers);

        // Check if we have alternative flights selected
        const hasAlternativeFlights = selectedFlight && selectedFlight.id;
        const travelStatus = relevantAnswers.find(
          (a) => a.questionId === 'travel_status'
        )?.value;

        console.log('7. Alternative flight check:', {
          hasAlternativeFlights,
          travelStatus,
          selectedFlight,
        });

        // Only validate when completing the wizard
        const newValidationState = {
          ...validationState,
          isWizardValid: true,
          stepValidation: {
            ...validationState.stepValidation,
            2:
              wizardType === 'travel_status'
                ? travelStatus === 'provided'
                  ? Boolean(hasAlternativeFlights)
                  : true
                : Boolean(validationState.stepValidation[2]),
            3:
              wizardType === 'informed_date'
                ? true
                : Boolean(validationState.stepValidation[3]),
          },
          stepInteraction: {
            ...validationState.stepInteraction,
            2:
              wizardType === 'travel_status'
                ? true
                : Boolean(validationState.stepInteraction[2]),
            3:
              wizardType === 'informed_date'
                ? true
                : Boolean(validationState.stepInteraction[3]),
          },
          2:
            wizardType === 'travel_status' ? true : Boolean(validationState[2]),
          3:
            wizardType === 'informed_date' ? true : Boolean(validationState[3]),
          _timestamp: Date.now(),
        };

        console.log('8. New validation state:', newValidationState);

        // Update state with validation only on completion
        batchUpdateWizardState({
          wizardAnswers: combinedAnswers,
          lastAnsweredQuestion: completeWizardId,
          wizardIsValid: true,
          wizardIsCompleted: true,
          validationState: newValidationState,
        });

        // Then handle completion which will trigger the transition
        handleWizardComplete(completeWizardId, combinedAnswers, successMessage);

        // Call onComplete callback if provided
        if (onComplete) {
          onComplete(combinedAnswers);
        }
      }
      return;
    }

    // Move to the next step while preserving the current answer
    const nextStep = wizardCurrentStep + 1;
    if (nextStep < visibleQuestions.length) {
      console.log('9. Moving to next step:', nextStep);
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: nextStep,
        },
        lastAnsweredQuestion: currentQuestion.id,
        wizardAnswers: wizardAnswers,
      });
    }
  }, [
    isCurrentQuestionAnswered,
    currentQuestion,
    instanceAnswers,
    wizardAnswers,
    wizardCurrentStep,
    visibleQuestions.length,
    wizardType,
    wizardId,
    handleWizardComplete,
    onComplete,
    wizardCurrentSteps,
    batchUpdateWizardState,
    validationState,
    selectedFlight,
    canCompleteCurrentStep,
  ]);

  const goToPrevious = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (wizardCurrentStep > 0) {
        batchUpdateWizardState({
          wizardCurrentSteps: {
            ...wizardCurrentSteps,
            [wizardType]: wizardCurrentStep - 1,
          },
        });
      }
    },
    [wizardCurrentStep, wizardType, wizardCurrentSteps, batchUpdateWizardState]
  );

  const handleBackToQuestions = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();

      // Get the step number based on wizard type
      const stepNumber =
        wizardType === 'travel_status'
          ? 2
          : wizardType === 'informed_date'
            ? 3
            : wizardType === 'issue'
              ? 2
              : null;

      if (stepNumber) {
        // Reset validation for the current step
        validateAndUpdateStep(stepNumber, false);
      }

      // Get answers from other wizards
      const otherWizardAnswers =
        wizardType === 'informed_date'
          ? wizardAnswers.filter(
              (a) =>
                a.questionId === 'travel_status' ||
                a.questionId === 'refund_status' ||
                a.questionId === 'ticket_cost'
            )
          : wizardType === 'travel_status'
            ? wizardAnswers.filter(
                (a) =>
                  a.questionId === 'informed_date' ||
                  a.questionId === 'specific_informed_date'
              )
            : wizardType === 'issue'
              ? [] // Clear all answers for initial assessment
              : [];

      // Reset only this wizard's state while preserving others
      batchUpdateWizardState({
        wizardSuccessStates: {
          ...wizardSuccessStates,
          [wizardType]: { showing: false, message: '' },
        },
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: 0,
        },
        wizardAnswers: otherWizardAnswers,
        completedWizards: {
          ...completedWizards,
          [wizardType]: false,
        },
        validationState: {
          ...validationState,
          stepValidation: {
            ...validationState.stepValidation,
            [stepNumber || 2]: false,
          },
          stepInteraction: {
            ...validationState.stepInteraction,
            [stepNumber || 2]: false,
          },
          isWizardValid: false,
          [stepNumber || 2]: false,
          _timestamp: Date.now(),
        },
        lastAnsweredQuestion: null, // Reset last answered question
      });
    },
    [
      batchUpdateWizardState,
      validateAndUpdateStep,
      wizardSuccessStates,
      wizardType,
      wizardCurrentSteps,
      completedWizards,
      wizardAnswers,
      validationState,
    ]
  );

  // Simplify initialization effect to only run once
  useEffect(() => {
    if (wizardAnswers.length > 0 && !lastAnsweredQuestion) {
      // Filter answers for this wizard type
      const relevantAnswers =
        wizardType === 'travel_status'
          ? wizardAnswers.filter(
              (a) =>
                a.questionId === 'travel_status' ||
                a.questionId === 'refund_status' ||
                a.questionId === 'ticket_cost'
            )
          : wizardType === 'informed_date'
            ? wizardAnswers.filter(
                (a) =>
                  a.questionId === 'informed_date' ||
                  a.questionId === 'specific_informed_date'
              )
            : wizardAnswers;

      // Keep answers from other wizards
      const otherWizardAnswers =
        wizardType === 'informed_date'
          ? wizardAnswers.filter(
              (a) =>
                a.questionId === 'travel_status' ||
                a.questionId === 'refund_status' ||
                a.questionId === 'ticket_cost'
            )
          : wizardType === 'travel_status'
            ? wizardAnswers.filter(
                (a) =>
                  a.questionId === 'informed_date' ||
                  a.questionId === 'specific_informed_date'
              )
            : [];

      if (relevantAnswers.length > 0) {
        // Find the last answered question for this wizard type
        const lastAnswer = relevantAnswers[relevantAnswers.length - 1];
        if (lastAnswer) {
          batchUpdateWizardState({
            lastAnsweredQuestion: lastAnswer.questionId,
            wizardAnswers: [...otherWizardAnswers, ...relevantAnswers],
          });
        }
      }
    }
  }, [wizardAnswers, wizardType, lastAnsweredQuestion, batchUpdateWizardState]);

  // Early returns for error states
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
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="min-h-[300px] flex flex-col justify-center"
          >
            <div className="flex flex-col items-center justify-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ delay: 0.1, duration: 0.2 }}
                className="w-16 h-16 flex items-center justify-center text-[64px]"
              >
                {successState.message ===
                'Super! Du hast gute Chancen auf eine Entschädigung.' ? (
                  <span>🎉</span>
                ) : (
                  <CheckCircleIcon
                    className={qaWizardConfig.success.icon.check}
                  />
                )}
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.2 }}
                className="text-center space-y-4"
              >
                <h2 className="text-2xl font-bold text-gray-900">
                  {successState.message}
                </h2>
                <p className="text-sm text-gray-500">
                  Wir verarbeiten deine Informationen...
                </p>
                <motion.button
                  onClick={handleBackToQuestions}
                  className="mt-6 px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Zurück zu den Fragen
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          visibleQuestions &&
          Array.isArray(visibleQuestions) &&
          visibleQuestions.length > 0 &&
          currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}-${wizardCurrentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <QuestionAnswer
                question={currentQuestion}
                selectedOption={getCurrentAnswer(currentQuestion.id)}
                onSelect={handleSelect}
                currentStep={wizardCurrentStep + 1}
                totalSteps={visibleQuestions.length}
                initialSelectedFlight={selectedFlight}
              />
              <div className="flex justify-between mt-6">
                <div>
                  {wizardCurrentStep > 0 && (
                    <motion.button
                      onClick={goToPrevious}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Zurück
                    </motion.button>
                  )}
                </div>
                <div>
                  {wizardCurrentStep < visibleQuestions.length - 1 ? (
                    <motion.button
                      onClick={goToNext}
                      disabled={!isCurrentQuestionAnswered}
                      className={`px-4 py-2 bg-[#F54538] text-white rounded-md ${
                        !isCurrentQuestionAnswered
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-[#E03F33]'
                      }`}
                      whileHover={
                        isCurrentQuestionAnswered ? { scale: 1.05 } : {}
                      }
                      whileTap={
                        isCurrentQuestionAnswered ? { scale: 0.95 } : {}
                      }
                    >
                      Weiter
                    </motion.button>
                  ) : (
                    // Only show Complete button on last question when answered
                    wizardCurrentStep === visibleQuestions.length - 1 &&
                    isCurrentQuestionAnswered && (
                      <motion.button
                        onClick={goToNext}
                        disabled={!isCurrentQuestionAnswered}
                        className={`px-4 py-2 bg-[#F54538] text-white rounded-md ${
                          !isCurrentQuestionAnswered
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-[#E03F33]'
                        }`}
                        whileHover={
                          isCurrentQuestionAnswered ? { scale: 1.05 } : {}
                        }
                        whileTap={
                          isCurrentQuestionAnswered ? { scale: 0.95 } : {}
                        }
                      >
                        Abschließen
                      </motion.button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  );
};

export default QAWizard;
