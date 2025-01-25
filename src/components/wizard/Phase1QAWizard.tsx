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
import { useStore } from '../../lib/state/store';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { qaWizardConfig } from '@/config/qaWizard';
import { useTranslation } from '@/hooks/useTranslation';

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
  const {
    wizardAnswers,
    wizardCurrentSteps,
    wizardSuccessStates,
    validationState,
    batchUpdateWizardState,
    handleWizardComplete,
  } = useStore();

  // Get wizard ID and type
  const wizardId = questions?.[0]?.id;
  const wizardType = 'phase1';

  // Filter answers specific to this wizard instance
  const instanceAnswers = useMemo(() => {
    return initialAnswers && initialAnswers.length > 0
      ? initialAnswers
      : wizardAnswers;
  }, [initialAnswers, wizardAnswers]);

  // Get success state for this wizard
  const successState = useMemo(() => {
    const lastAnswer = instanceAnswers[instanceAnswers.length - 1];
    if (!lastAnswer) return { showing: false, message: '' };

    // Find the question and selected option
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    const showing = wizardSuccessStates[wizardType]?.showing || false;
    const message = option?.showConfetti
      ? t.wizard.success.goodChance
      : t.wizard.success.answersSaved;

    return { showing, message };
  }, [wizardSuccessStates, instanceAnswers, questions, t.wizard.success]);

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
      const answer = instanceAnswers.find((a) => a.questionId === questionId);
      return answer?.value?.toString() || '';
    },
    [instanceAnswers]
  );

  // Handle answer selection
  const handleSelect = useCallback(
    (questionId: string, value: string) => {
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

      // Only update answers, no validation or auto-transition
      batchUpdateWizardState({
        wizardAnswers: currentAnswers,
        lastAnsweredQuestion: questionId,
      });
    },
    [instanceAnswers, batchUpdateWizardState]
  );

  // Handle going to next step
  const goToNext = useCallback(() => {
    if (!currentQuestion) return;

    const nextStep = currentStep + 1;
    const isLastStep = nextStep >= visibleQuestions.length;

    if (isLastStep) {
      // On last step, update validation state immediately
      batchUpdateWizardState({
        validationState: {
          ...validationState,
          isWizardValid: true,
          isWizardSubmitted: true,
          isValidating: false,
          stepValidation: {
            ...validationState.stepValidation,
            2: true,
          },
          stepInteraction: {
            ...validationState.stepInteraction,
            2: true,
          },
          _timestamp: Date.now(),
        },
      });

      // Show success message
      const successMessage = t.wizard.success.answersSaved;
      batchUpdateWizardState({
        wizardSuccessStates: {
          ...wizardSuccessStates,
          [wizardType]: { showing: true, message: successMessage },
        },
      });

      // Complete the wizard after a delay
      window.setTimeout(() => {
        // Complete the wizard
        handleWizardComplete(wizardId, instanceAnswers, successMessage);

        // Call onComplete callback if provided
        if (onComplete) {
          window.setTimeout(() => {
            onComplete(instanceAnswers);
          }, 500);
        }
      }, 1500); // Show success message for 1.5 seconds before transitioning
    } else {
      // Move to next question without validation
      batchUpdateWizardState({
        wizardCurrentSteps: {
          ...wizardCurrentSteps,
          [wizardType]: nextStep,
        },
      });
    }
  }, [
    currentQuestion,
    currentStep,
    visibleQuestions.length,
    t.wizard.success.answersSaved,
    batchUpdateWizardState,
    validationState,
    wizardId,
    instanceAnswers,
    handleWizardComplete,
    onComplete,
    wizardCurrentSteps,
    wizardType,
    wizardSuccessStates,
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
    batchUpdateWizardState({
      wizardSuccessStates: {
        ...wizardSuccessStates,
        [wizardType]: { showing: false, message: '' },
      },
      wizardCurrentSteps: {
        ...wizardCurrentSteps,
        [wizardType]: 0,
      },
      validationState: {
        ...validationState,
        isWizardValid: false,
        isWizardSubmitted: false,
        isValidating: false,
        stepValidation: {
          ...validationState.stepValidation,
          2: false,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: false,
        },
        _timestamp: Date.now(),
      },
      wizardAnswers: [],
      lastAnsweredQuestion: null,
      wizardIsCompleted: false,
      wizardIsValid: false,
    });
  }, [
    wizardSuccessStates,
    wizardCurrentSteps,
    validationState,
    batchUpdateWizardState,
  ]);

  // Update button text
  const backButtonText = t.wizard.navigation.back;
  const nextButtonText = t.wizard.navigation.next;
  const backToQuestionsText = t.wizard.success.backToQuestions;
  const processingText = t.wizard.success.processing;

  // Get success icon based on last answer
  const getSuccessIcon = useMemo(() => {
    const lastAnswer = instanceAnswers[instanceAnswers.length - 1];
    if (!lastAnswer) return null;

    // Find the question and selected option
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    if (option?.showConfetti) {
      return <span className={qaWizardConfig.success.icon.emoji}>🎉</span>;
    }

    return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
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
                {getSuccessIcon}
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
                <p className="text-sm text-gray-500">{processingText}</p>
                <motion.button
                  onClick={handleBackToQuestions}
                  className="mt-6 px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {backToQuestionsText}
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
                      {backButtonText}
                    </motion.button>
                  )}
                </div>
                <div>
                  <motion.button
                    onClick={goToNext}
                    className={`px-4 py-2 bg-[#F54538] text-white rounded-md hover:bg-[#E03F33]`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {currentStep < visibleQuestions.length - 1
                      ? nextButtonText
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
