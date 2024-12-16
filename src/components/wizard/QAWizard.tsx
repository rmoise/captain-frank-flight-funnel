'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Answer } from '@/types/wizard';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useSteps } from '@/context/StepsContext';
import { QuestionAnswer } from '@/components/shared/QuestionAnswer';
import { PageHeader } from '@/components/shared/PageHeader';
import type { Question } from '@/types/experience';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import {
  setWizardAnswers,
  completeStep,
  markStepIncomplete,
} from '@/store/bookingSlice';
import { useDispatch } from 'react-redux';
import { MoneyInput } from '@/components/MoneyInput';

export type { Question, Answer };

interface QAWizardProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  illustration?: string;
  onInteract?: () => void;
}

export const QAWizard: React.FC<QAWizardProps> = ({
  questions,
  onComplete,
  initialAnswers = [],
  illustration,
  onInteract,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wizardIsCompleted') === 'true';
    }
    return false;
  });
  const [hasInteracted, setHasInteracted] = useState(false);
  const [successMessage, setSuccessMessage] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wizardSuccessMessage') || '';
    }
    return '';
  });
  const [initialized, setInitialized] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [focusedQuestionId, setFocusedQuestionId] = useState<string | null>(
    null
  );

  // Get Redux state
  const { wizardAnswers: storedAnswers, completedSteps } = useAppSelector(
    (state) => state.booking
  );
  const dispatch = useAppDispatch();

  // Use stored answers if available, otherwise use initial answers or localStorage
  const [answers, setAnswers] = useState<Answer[]>(() => {
    // First try to get from Redux
    if (storedAnswers.length > 0) {
      return storedAnswers;
    }

    // Then try localStorage
    if (typeof window !== 'undefined') {
      const savedAnswers = localStorage.getItem('qaWizard_answers');
      if (savedAnswers) {
        try {
          return JSON.parse(savedAnswers);
        } catch (error) {
          console.error('Failed to parse saved answers:', error);
        }
      }
    }

    // Finally use initial answers
    return initialAnswers;
  });

  const activeQuestions = useMemo(
    () =>
      questions.filter(
        (question) => !question.showIf || question.showIf(answers)
      ),
    [questions, answers]
  );

  // Save completion state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wizardIsCompleted', isCompleted.toString());
    }
  }, [isCompleted]);

  // Initialize answers from Redux state
  useEffect(() => {
    if (!initialized && isInitialLoad) {
      setInitialized(true);
      setIsInitialLoad(false);

      // Check if we need to mark the step as complete based on existing data
      if (answers.length > 0) {
        const activeQuestions = questions.filter(
          (q) => !q.showIf || q.showIf(answers)
        );
        const allQuestionsAnswered = activeQuestions.every((q) =>
          answers.some((a) => {
            if (a.questionId === q.id && a.value) {
              if (a.value.startsWith('€')) {
                const amount = parseFloat(a.value.slice(1));
                return !isNaN(amount) && amount > 0;
              }
              return true;
            }
            return false;
          })
        );
        if (allQuestionsAnswered) {
          dispatch(completeStep(2));
          // Also restore completion state if all questions are answered
          const delayAnswer = answers.find(
            (a) => a.questionId === 'delay_duration'
          )?.value;
          const cancellationAnswer = answers.find(
            (a) => a.questionId === 'cancellation_notice'
          )?.value;

          const isLongDelay = delayAnswer === '>3';
          const isEligibleCancellation =
            cancellationAnswer === 'none' || cancellationAnswer === '0-7';

          const showSuccessMessage = isLongDelay || isEligibleCancellation;
          const message = showSuccessMessage
            ? 'Yay, you have a good chance of claiming it.'
            : '';

          setSuccessMessage(message);
          setIsCompleted(true);
        }
      }
    }
  }, [initialized, isInitialLoad, answers, dispatch, questions]);

  // Handle step restoration - only run when initialized changes
  useEffect(() => {
    if (initialized && storedAnswers.length > 0 && !isCompleted) {
      const lastAnsweredIndex = activeQuestions.findIndex(
        (q) => q.id === storedAnswers[storedAnswers.length - 1].questionId
      );
      if (lastAnsweredIndex !== -1) {
        setCurrentStep(lastAnsweredIndex);
      }
    }
  }, [initialized, storedAnswers, activeQuestions, isCompleted]);

  // Save answers to localStorage - only when answers change and not during initial load
  useEffect(() => {
    if (!isInitialLoad && answers.length > 0) {
      try {
        localStorage.setItem('qaWizard_answers', JSON.stringify(answers));
      } catch (error) {
        console.error('Failed to save answers to localStorage:', error);
      }
    }
  }, [answers, isInitialLoad]);

  // Handle step changes - only when activeQuestions length or currentStep changes
  useEffect(() => {
    if (!isInitialLoad && currentStep >= activeQuestions.length) {
      setCurrentStep(Math.max(0, activeQuestions.length - 1));
    }
  }, [activeQuestions.length, currentStep, isInitialLoad]);

  // Save current step to localStorage - only when currentStep changes and not during initial load
  useEffect(() => {
    if (!isInitialLoad) {
      try {
        localStorage.setItem('wizardCurrentStep', currentStep.toString());
      } catch (error) {
        console.error('Failed to save current step:', error);
      }
    }
  }, [currentStep, isInitialLoad]);

  const handleInteraction = useCallback(() => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onInteract?.();
    }
  }, [hasInteracted, onInteract]);

  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      const currentQuestion = questions.find((q) => q.id === questionId);
      const newAnswers = answers.filter((a) => a.questionId !== questionId);
      newAnswers.push({ questionId, value });

      // For money inputs, only update answers
      if (currentQuestion?.type === 'number') {
        setAnswers(newAnswers);
        dispatch(setWizardAnswers(newAnswers));
        return;
      }

      handleInteraction();

      // Update answers in state and Redux
      setAnswers(newAnswers);
      dispatch(setWizardAnswers(newAnswers));

      // Check if all required questions are answered
      const currentActiveQuestions = questions.filter(
        (q) => !q.showIf || q.showIf(newAnswers)
      );

      const allQuestionsAnswered = currentActiveQuestions.every((q) =>
        newAnswers.some((a) => {
          if (a.questionId === q.id && a.value) {
            if (a.value.startsWith('€')) {
              const amount = parseFloat(a.value.slice(1));
              return !isNaN(amount) && amount > 0;
            }
            return true;
          }
          return false;
        })
      );

      if (allQuestionsAnswered) {
        dispatch(completeStep(2));
      } else {
        dispatch(markStepIncomplete(2));
      }

      // Auto-progress only for non-money inputs
      if (
        currentQuestion &&
        currentQuestion.type === 'radio' &&
        currentStep < activeQuestions.length - 1
      ) {
        setDirection(1);
        setCurrentStep((prev) =>
          Math.min(prev + 1, activeQuestions.length - 1)
        );
      }
    },
    [
      answers,
      dispatch,
      handleInteraction,
      questions,
      currentStep,
      activeQuestions.length,
    ]
  );

  const handleGoBack = useCallback(() => {
    setIsCompleted(false);
    setSuccessMessage('');
    dispatch(markStepIncomplete(2));
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wizardSuccessMessage');
      localStorage.removeItem('wizardIsCompleted');
    }
  }, [dispatch]);

  const getCurrentAnswer = useCallback(() => {
    const answer = answers.find(
      (a) => a.questionId === activeQuestions[currentStep]?.id
    )?.value;
    return answer || '';
  }, [answers, activeQuestions, currentStep]);

  const isAnswerValid = useCallback(() => {
    const currentAnswer = getCurrentAnswer();
    const currentQuestion = activeQuestions[currentStep];

    if (!currentQuestion) return false;

    if (currentQuestion.type === 'number') {
      const numValue = parseFloat(currentAnswer.replace(/[^0-9.-]+/g, ''));
      return !isNaN(numValue) && numValue > 0;
    }

    return !!currentAnswer;
  }, [getCurrentAnswer, activeQuestions, currentStep]);

  const isPathComplete = useMemo(() => {
    const requiredQuestions = questions.filter(
      (q) => !q.showIf || q.showIf(answers)
    );
    return requiredQuestions.every((question) =>
      answers.some(
        (answer) => answer.questionId === question.id && answer.value
      )
    );
  }, [questions, answers]);

  const handleComplete = useCallback(() => {
    if (!isPathComplete) return;

    const delayAnswer = answers.find(
      (a) => a.questionId === 'delay_duration'
    )?.value;
    const cancellationAnswer = answers.find(
      (a) => a.questionId === 'cancellation_notice'
    )?.value;

    const isLongDelay = delayAnswer === '>3';
    const isEligibleCancellation =
      cancellationAnswer === 'none' || cancellationAnswer === '0-7';

    const showSuccessMessage = isLongDelay || isEligibleCancellation;
    const message = showSuccessMessage
      ? 'Yay, you have a good chance of claiming it.'
      : 'Thank you for your responses!';

    // Set success message and completion state first
    setSuccessMessage(message);
    setIsCompleted(true);

    // Save to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wizardSuccessMessage', message);
        localStorage.setItem('wizardIsCompleted', 'true');
      } catch (error) {
        console.error('Failed to save success message:', error);
      }
    }

    // Call onComplete last to trigger parent's navigation
    onComplete(answers);
  }, [answers, isPathComplete, onComplete]);

  // Add effect to restore completion state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedCompletion = localStorage.getItem('wizardIsCompleted');
      const savedMessage = localStorage.getItem('wizardSuccessMessage');

      if (savedCompletion === 'true') {
        setIsCompleted(true);
        setSuccessMessage(savedMessage || 'Thank you for your responses!');
      }
    }
  }, []);

  const goToNext = useCallback(() => {
    if (currentStep < activeQuestions.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => {
        const nextStep = prev + 1;
        return Math.min(nextStep, activeQuestions.length - 1);
      });
    } else if (isPathComplete) {
      handleComplete();
    }
  }, [currentStep, activeQuestions.length, isPathComplete, handleComplete]);

  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  }, [currentStep]);

  const handleStepCompletion = () => {
    dispatch(completeStep(currentStep));
    // ... rest of your completion logic
  };

  const renderQuestion = (question: Question) => {
    const answer = answers.find((a) => a.questionId === question.id);

    if (question.type === 'radio' && question.options) {
      return (
        <div className="space-y-3">
          {question.options.map((option) => (
            <label
              key={option.value}
              className={`flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${
                  answer?.value === option.value
                    ? 'border-[#F54538] bg-[#FEF2F2]'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
            >
              <input
                type="radio"
                name={question.id}
                value={option.value}
                checked={answer?.value === option.value}
                onChange={() => handleAnswer(question.id, option.value)}
                className="w-4 h-4 border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
              />
              <span className="ml-3 text-base text-gray-900">
                {option.label}
              </span>
            </label>
          ))}
        </div>
      );
    }

    if (question.type === 'number') {
      return (
        <div className="mt-2">
          <MoneyInput
            label="Amount"
            value={answer?.value || ''}
            onChange={(value: string) => handleAnswer(question.id, value)}
            isFocused={focusedQuestionId === question.id}
            onFocus={() => setFocusedQuestionId(question.id)}
            onBlur={() => setFocusedQuestionId(null)}
          />
        </div>
      );
    }

    return null;
  };

  if (isCompleted) {
    return (
      <section data-step="2" className="max-w-6xl mx-auto p-6 pb-24 mb-24">
        <div className="flex flex-col items-center text-center mt-12">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            {successMessage ? (
              <span className="text-6xl">🎉</span>
            ) : (
              <CheckCircleIcon className="w-20 h-20 text-green-500" />
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-2xl"
          >
            <PageHeader
              title={successMessage || 'Thank you for your responses!'}
              subtitle="We're processing your information..."
              className="text-center"
            />
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            onClick={handleGoBack}
            className="mt-6 px-6 py-2 text-red-500 hover:text-red-600 font-medium transition-colors"
          >
            ← Go Back to Questions
          </motion.button>
        </div>
      </section>
    );
  }

  return (
    <section data-step="2" className="max-w-6xl mx-auto p-6 pb-24 mb-24">
      {activeQuestions.length > 0 ? (
        <>
          <QuestionAnswer
            question={
              activeQuestions[Math.min(currentStep, activeQuestions.length - 1)]
            }
            selectedOption={getCurrentAnswer()}
            onSelect={handleAnswer}
            currentStep={currentStep}
            totalSteps={activeQuestions.length}
            direction={direction}
          />

          {/* Navigation buttons */}
          <div className="mt-8 flex justify-between">
            <button
              onClick={goToPrevious}
              disabled={currentStep === 0}
              className={`w-28 px-6 py-3 text-sm font-medium rounded-lg transition-colors
                ${
                  currentStep === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'text-[#F54538] hover:bg-[#FEF2F2]'
                }`}
            >
              Previous
            </button>
            <button
              onClick={
                currentStep === activeQuestions.length - 1 && isPathComplete
                  ? handleComplete
                  : goToNext
              }
              disabled={!isAnswerValid()}
              className={`w-28 px-6 py-3 text-sm font-medium rounded-lg transition-colors
                ${
                  !isAnswerValid()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#F54538] hover:bg-[#E03F33] text-white'
                }`}
            >
              {currentStep === activeQuestions.length - 1 && isPathComplete
                ? 'Complete'
                : 'Next'}
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center">
          <p className="text-gray-500">No questions available.</p>
        </div>
      )}
    </section>
  );
};
