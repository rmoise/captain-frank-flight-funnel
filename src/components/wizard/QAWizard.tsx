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

  // Only update answers, no validation
  batchUpdateWizardState({
    wizardAnswers: currentAnswers,
    lastAnsweredQuestion: questionId,
  });
};

export const QAWizard: React.FC<QAWizardProps> = ({
  questions = [],
  onComplete,
  onInteract,
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
  } = useStore();

  // Get wizard ID and type
  const wizardId = questions?.[0]?.id;
  const wizardType = useMemo((): WizardStepKey => {
    const firstQuestionId = questions[0]?.id;
    if (!firstQuestionId) return 'default';
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
    console.log('\n=== QAWizard instanceAnswers initialization ===');
    console.log('Initial state:', {
      wizardType,
      initialAnswers,
      wizardAnswers,
    });

    let answers: Answer[] = [];
    if (initialAnswers && initialAnswers.length > 0) {
      console.log('Using initial answers:', initialAnswers);
      answers = initialAnswers;
    } else if (wizardType === 'travel_status') {
      console.log('Using travel_status answers');
      // Get all relevant answers from wizardAnswers
      answers = wizardAnswers.filter(
        (a) =>
          a.questionId === 'travel_status' ||
          a.questionId === 'refund_status' ||
          a.questionId === 'ticket_cost'
      );
      console.log('Using filtered travel status answers:', answers);
    } else if (wizardType === 'informed_date') {
      console.log('Using informed_date answers');
      answers =
        wizardAnswers.filter(
          (a) =>
            a.questionId === 'informed_date' ||
            a.questionId === 'specific_informed_date'
        ) || [];
      console.log('Filtered informed date answers:', answers);
    } else {
      console.log('Using wizard answers:', wizardAnswers);
      answers = wizardAnswers || [];
    }

    console.log('Final instance answers:', {
      wizardType,
      answers,
    });
    console.log('=== End QAWizard instanceAnswers initialization ===\n');

    return answers;
  }, [wizardType, initialAnswers, wizardAnswers]);

  // All memoized values must be at the top level
  const visibleQuestions = useMemo(() => {
    try {
      console.log('\n=== QAWizard visibleQuestions calculation ===');
      console.log('Initial state:', {
        questions,
        instanceAnswers,
        wizardType,
      });

      if (!questions || !Array.isArray(questions) || questions.length === 0) {
        console.log('Early return due to no questions:', {
          hasQuestions: !!questions,
          isArray: Array.isArray(questions),
          length: questions?.length,
          wizardType,
        });
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
              console.log(`Evaluating showIf for question ${question.id}:`, {
                shouldShow,
                answers: wizardAnswers,
                condition: question.showIf.toString(),
              });
              return shouldShow;
            } catch (err) {
              console.error('Error evaluating showIf condition:', err);
              return false;
            }
          }

          // If no showIf condition, show the question
          console.log(
            'Question has no showIf condition, showing:',
            question.id
          );
          return true;
        }
      );

      // Combine first question with filtered remaining questions
      const filtered = [firstQuestion, ...filteredRemaining];

      console.log('Filtered questions:', filtered);
      console.log('=== End QAWizard visibleQuestions calculation ===\n');

      return filtered;
    } catch (err) {
      console.error('Error getting visible questions:', err);
      return [];
    }
  }, [questions, instanceAnswers, wizardType, wizardAnswers]);

  // Get current question with defensive checks
  const currentQuestion = useMemo(() => {
    console.log('\n=== QAWizard currentQuestion calculation ===');
    console.log('Current state:', {
      visibleQuestions,
      wizardCurrentStep,
      questionsLength: visibleQuestions?.length,
    });

    // Ensure we have valid questions and step
    if (
      !visibleQuestions ||
      !Array.isArray(visibleQuestions) ||
      visibleQuestions.length === 0
    ) {
      console.log('No visible questions available');
      return null;
    }

    // Ensure step is within bounds
    if (wizardCurrentStep < 0 || wizardCurrentStep >= visibleQuestions.length) {
      console.log('Step out of bounds, resetting to 0');
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: 0,
        },
      });
      return visibleQuestions[0];
    }

    const question = visibleQuestions[wizardCurrentStep];
    console.log('Selected question:', question);
    console.log('=== End QAWizard currentQuestion calculation ===\n');
    return question;
  }, [
    visibleQuestions,
    wizardCurrentStep,
    batchUpdateWizardState,
    wizardCurrentSteps,
    wizardType,
  ]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false;
    console.log('Checking if question is answered:', {
      questionId: currentQuestion.id,
      instanceAnswers,
      wizardAnswers,
    });
    return (
      instanceAnswers.some((a) => a.questionId === currentQuestion.id) ||
      wizardAnswers.some((a) => a.questionId === currentQuestion.id)
    );
  }, [currentQuestion, instanceAnswers, wizardAnswers]);

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
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      // Call onInteract when user selects an answer
      if (onInteract) {
        onInteract();
      }

      console.log('\n=== QAWizard handleSelect ===');
      console.log('Initial state:', {
        questionId,
        value,
        currentAnswers: wizardAnswers,
        instanceAnswers,
        wizardType,
      });

      const newAnswer: Answer = {
        questionId,
        value,
        shouldShow: true,
      };

      // Get all existing answers except for the one we're updating
      const otherAnswers = wizardAnswers.filter(
        (a) => a.questionId !== questionId
      );

      // For informed_date wizard, ensure we keep both the informed_date and specific_informed_date answers
      // Also preserve answers from other wizards
      let updatedAnswers = [...otherAnswers, newAnswer];

      if (wizardType === 'informed_date') {
        console.log('Handling informed date answer:', {
          questionId,
          value,
          existingAnswers: wizardAnswers,
        });

        // Keep answers from travel_status wizard
        const travelStatusAnswers = wizardAnswers.filter(
          (a) =>
            a.questionId === 'travel_status' ||
            a.questionId === 'refund_status' ||
            a.questionId === 'ticket_cost'
        );

        // For specific_informed_date, ensure we keep both answers
        if (questionId === 'specific_informed_date') {
          const informedDateAnswer = wizardAnswers.find(
            (a) => a.questionId === 'informed_date'
          );
          if (informedDateAnswer) {
            updatedAnswers = [...updatedAnswers, informedDateAnswer];
          }
        }

        updatedAnswers = [...travelStatusAnswers, ...updatedAnswers];
      } else if (wizardType === 'travel_status') {
        // Keep answers from informed_date wizard
        const informedDateAnswers = wizardAnswers.filter(
          (a) =>
            a.questionId === 'informed_date' ||
            a.questionId === 'specific_informed_date'
        );
        updatedAnswers = [...informedDateAnswers, ...updatedAnswers];
      }

      console.log('Updating answers:', {
        newAnswer,
        updatedAnswers,
        wizardType,
        preservedAnswers: updatedAnswers.filter(
          (a) => a.questionId !== questionId
        ),
      });

      // Update the store with new answers
      batchUpdateWizardState({
        wizardAnswers: updatedAnswers,
        lastAnsweredQuestion: questionId,
      });
    },
    [
      wizardAnswers,
      batchUpdateWizardState,
      onInteract,
      instanceAnswers,
      wizardType,
    ]
  );

  const goToNext = useCallback(() => {
    // Don't proceed if current question isn't answered or null
    if (!isCurrentQuestionAnswered || !currentQuestion) {
      return;
    }

    // Get the current answer
    const currentAnswer =
      instanceAnswers.find((a) => a.questionId === currentQuestion.id) ||
      wizardAnswers.find((a) => a.questionId === currentQuestion.id);

    if (!currentAnswer) {
      return;
    }

    // Get the selected option
    const selectedOption = currentQuestion.options?.find(
      (opt) => opt.value.toString() === currentAnswer.value?.toString()
    );

    // If we're on the last question, show success
    if (wizardCurrentStep === visibleQuestions.length - 1) {
      const successMessage = selectedOption?.showConfetti
        ? 'Yay, you have a good chance of claiming it.'
        : 'Your responses have been recorded.';

      // For informed date wizard, use the proper ID
      const completeWizardId =
        wizardType === 'informed_date' ? 'informed_date' : wizardId;

      // Let the store handle completion with current answers
      if (completeWizardId) {
        console.log('Completing wizard:', {
          wizardId: completeWizardId,
          wizardType,
          successMessage,
          selectedOption,
        });

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
                    a.questionId === 'ticket_cost'
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

        const combinedAnswers = [...otherWizardAnswers, ...relevantAnswers];

        console.log('Completing with filtered answers:', {
          wizardType,
          relevantAnswers,
          otherWizardAnswers,
          combinedAnswers,
          allAnswers: wizardAnswers,
        });

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

  // Simplify initialization effect to only run once
  useEffect(() => {
    if (wizardAnswers.length > 0 && !lastAnsweredQuestion) {
      console.log('Initializing wizard answers:', {
        wizardType,
        currentAnswers: wizardAnswers,
      });

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
          console.log('Updating wizard state:', {
            lastAnsweredQuestion: lastAnswer.questionId,
            relevantAnswers,
            otherWizardAnswers,
            combinedAnswers: [...otherWizardAnswers, ...relevantAnswers],
          });

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
                'Yay, you have a good chance of claiming it.' ? (
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
                className="text-center space-y-2"
              >
                <h2 className="text-2xl font-bold text-gray-900">
                  {successState.message}
                </h2>
                <p className="text-sm text-gray-500">
                  We&apos;re processing your information...
                </p>
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
                      Previous
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
                          : 'hover:bg-[#E03E32]'
                      }`}
                      whileHover={
                        isCurrentQuestionAnswered ? { scale: 1.05 } : {}
                      }
                      whileTap={
                        isCurrentQuestionAnswered ? { scale: 0.95 } : {}
                      }
                    >
                      Next
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={goToNext}
                      disabled={!isCurrentQuestionAnswered}
                      className={`px-4 py-2 bg-[#F54538] text-white rounded-md ${
                        !isCurrentQuestionAnswered
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-[#E03E32]'
                      }`}
                      whileHover={
                        isCurrentQuestionAnswered ? { scale: 1.05 } : {}
                      }
                      whileTap={
                        isCurrentQuestionAnswered ? { scale: 0.95 } : {}
                      }
                    >
                      Complete
                    </motion.button>
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
