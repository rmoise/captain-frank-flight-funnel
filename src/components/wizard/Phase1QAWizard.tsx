'use client';

declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
    __wizardTransitionTimeout?: NodeJS.Timeout;
  }
}

import React, { useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer } from '../../types/wizard';
import { Question } from '../../types/experience';
import { QuestionAnswer } from '../shared/QuestionAnswer';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { qaWizardConfig } from '@/config/qaWizard';
import { useTranslation } from '@/hooks/useTranslation';
import { useStore } from '../../lib/state/store';
import type { StoreState, ValidationStateSteps } from '../../lib/state/store';

type StoreWithActions = StoreState & {
  validateAndUpdateStep: (step: ValidationStateSteps, isValid: boolean) => void;
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
  const wizardType = 'phase1';

  // Filter answers specific to this wizard instance
  const instanceAnswers = useMemo(() => {
    return initialAnswers && initialAnswers.length > 0
      ? initialAnswers
      : wizardAnswers;
  }, [initialAnswers, wizardAnswers]);

  // Get success state for this wizard
  const successState = useMemo(() => {
    console.log('=== Success State Determination START ===', {
      isCompleted,
      isValid,
      successMessage,
      instanceAnswers,
      timestamp: new Date().toISOString(),
    });

    const showing = isCompleted;
    const storedMessage = successMessage;

    // If we have a stored message, use it
    if (showing && storedMessage) {
      console.log('=== Using Stored Success Message ===', {
        showing,
        message: storedMessage,
        timestamp: new Date().toISOString(),
      });
      return { showing, message: storedMessage };
    }

    // Otherwise calculate based on answers
    if (!isValid || !instanceAnswers || instanceAnswers.length === 0) {
      return { showing: false, message: '' };
    }

    const lastAnswer = instanceAnswers[instanceAnswers.length - 1];
    if (!lastAnswer) return { showing: false, message: '' };

    // Find the question and selected option
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    console.log('=== Calculating Success Message ===', {
      lastAnswer,
      questionId: question?.id,
      optionValue: option?.value,
      showConfetti: option?.showConfetti,
      timestamp: new Date().toISOString(),
    });

    const message = option?.showConfetti
      ? t.wizard.success.goodChance
      : t.wizard.success.answersSaved;

    return { showing, message };
  }, [
    isCompleted,
    isValid,
    successMessage,
    instanceAnswers,
    questions,
    t.wizard.success,
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
            console.error('Error in showIf condition:', err);
            return false;
          }
        }
        return true;
      }
    );

    const result = [firstQuestion, ...filteredRemaining];
    console.log('Visible questions:', {
      total: result.length,
      questions: result.map((q) => q.id),
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
      return answer?.value?.toString() || '';
    },
    [instanceAnswers]
  );

  // Handle answer selection
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
      console.log('=== Answer Selection START ===', {
        questionId,
        value,
        currentAnswers: instanceAnswers,
        timestamp: new Date().toISOString(),
      });

      // Get current answers
      const currentAnswers = [...instanceAnswers];
      const answerIndex = currentAnswers.findIndex(
        (a) => a.questionId === questionId
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

      console.log('=== Answer Selection UPDATE ===', {
        newAnswer,
        updatedAnswers: currentAnswers,
        timestamp: new Date().toISOString(),
      });

      // Update wizard state without automatically validating
      batchUpdateWizardState({
        wizardAnswers: currentAnswers,
        lastAnsweredQuestion: questionId,
        // Don't automatically set validation state here
      });
    },
    [instanceAnswers, batchUpdateWizardState]
  );

  // Handle QA wizard completion
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log('=== QA Wizard Complete START ===', {
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

      console.log('=== Success Message Determination ===', {
        lastAnswer,
        questionId: question?.id,
        optionValue: option?.value,
        showConfetti: option?.showConfetti,
        successMessage,
        timestamp: new Date().toISOString(),
      });

      // Only update validation state when explicitly completing the wizard
      if (currentStep === visibleQuestions.length - 1) {
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

        console.log('=== QA Wizard Complete - State Updated ===', {
          successMessage,
          timestamp: new Date().toISOString(),
        });

        // Clear any existing timeouts
        if (window.__wizardSuccessTimeout) {
          clearTimeout(window.__wizardSuccessTimeout);
        }
        if (window.__wizardTransitionTimeout) {
          clearTimeout(window.__wizardTransitionTimeout);
        }

        // Set timeout for onComplete callback
        window.__wizardSuccessTimeout = setTimeout(() => {
          console.log('=== Success State Timeout - Calling onComplete ===', {
            timestamp: new Date().toISOString(),
          });

          // Call onComplete callback
          onComplete?.(answers);

          // Set another timeout for accordion transition
          window.__wizardTransitionTimeout = setTimeout(() => {
            console.log('=== Success State Timeout - Transitioning ===', {
              timestamp: new Date().toISOString(),
            });

            // Transition to next step after delay
            const accordionContext = (window as any).__accordionContext;
            if (accordionContext?.setActiveAccordion) {
              accordionContext.setActiveAccordion('3');
            }
          }, 1000); // Additional 1 second after onComplete
        }, 2000); // 2 seconds to show success state
      } else {
        // Just update answers without validation if not at the last step
        batchUpdateWizardState({
          wizardAnswers: answers,
          lastAnsweredQuestion: lastAnswer?.questionId,
        });
      }

      console.log('=== QA Wizard Complete END ===', {
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

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    // Clear any existing timeouts first
    if (window.__wizardSuccessTimeout) {
      clearTimeout(window.__wizardSuccessTimeout);
    }
    if (window.__wizardTransitionTimeout) {
      clearTimeout(window.__wizardTransitionTimeout);
    }

    batchUpdateWizardState({
      wizardIsCompleted: false,
      wizardCurrentSteps: {
        ...wizardCurrentSteps,
        [wizardType]: 0,
      },
      wizardIsValid: false,
      wizardAnswers: [],
      lastAnsweredQuestion: null,
      wizardSuccessMessage: '',
      validationState: {
        ...validationState,
        isWizardValid: false,
        isWizardSubmitted: false,
        stepValidation: {
          ...validationState.stepValidation,
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          1: false,
          2: false,
          3: false,
          4: false,
          5: false,
        },
        _timestamp: Date.now(),
      },
    });
  }, [wizardCurrentSteps, batchUpdateWizardState, validationState]);

  // Get success icon based on last answer
  const getSuccessIcon = useCallback(() => {
    console.log('=== Success Icon Determination START ===', {
      answers: instanceAnswers,
      totalAnswers: instanceAnswers.length,
      timestamp: new Date().toISOString(),
    });

    if (!instanceAnswers || instanceAnswers.length === 0) {
      console.log('=== No Answers Found ===', {
        timestamp: new Date().toISOString(),
      });
      return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
    }

    // Find the relevant answer based on issue type
    const issueType = instanceAnswers.find(
      (a) => a.questionId === 'issue_type'
    )?.value;
    let relevantAnswer;

    if (issueType === 'delay') {
      relevantAnswer = instanceAnswers.find(
        (a) => a.questionId === 'delay_duration'
      );
    } else if (issueType === 'cancel') {
      relevantAnswer = instanceAnswers.find(
        (a) => a.questionId === 'cancellation_notice'
      );
    }

    console.log('=== Found Relevant Answer ===', {
      issueType,
      relevantAnswer,
      timestamp: new Date().toISOString(),
    });

    if (!relevantAnswer) {
      console.log('=== No Relevant Answer Found ===', {
        timestamp: new Date().toISOString(),
      });
      return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
    }

    // Find the question and selected option
    const question = questions.find((q) => q.id === relevantAnswer.questionId);
    const option = question?.options?.find(
      (o) => o.value === relevantAnswer.value
    );

    console.log('=== Found Question and Option ===', {
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
                {getSuccessIcon()}
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
                  {t.wizard.success.processing}
                </p>
                <motion.button
                  onClick={handleBackToQuestions}
                  className="mt-6 px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t.wizard.success.backToQuestions}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          visibleQuestions.length > 0 &&
          currentQuestion && (
            <motion.div
              key={`question-${currentQuestion.id}-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
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
                    <motion.button
                      onClick={goToPrevious}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {t.wizard.navigation.back}
                    </motion.button>
                  )}
                </div>
                <div>
                  <motion.button
                    onClick={goToNext}
                    className="px-4 py-2 bg-[#F54538] text-white rounded-md hover:bg-[#E03F33]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {currentStep < visibleQuestions.length - 1
                      ? t.wizard.navigation.next
                      : t.common.submit}
                  </motion.button>
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
