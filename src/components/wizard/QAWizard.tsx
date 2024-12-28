'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Answer } from '@/types/wizard';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { QuestionAnswer } from '@/components/shared/QuestionAnswer';
import type { Question } from '@/types/experience';
import { useAppDispatch } from '@/store/hooks';
import { setWizardAnswers } from '@/store/slices/bookingSlice';
import { qaWizardConfig } from '@/config/qaWizard';
import type { Flight } from '@/types/store';
import { useStepValidation } from '@/hooks/useStepValidation';

export type { Question, Answer };

export interface QAWizardProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  onInteract?: () => void;
  initialAnswers?: Answer[];
  phase?: number;
  stepNumber?: number;
  selectedFlight?: Flight | Flight[] | null | undefined;
}

export const QAWizard: React.FC<QAWizardProps> = ({
  questions,
  onComplete,
  onInteract,
  initialAnswers = [],
  phase = 1,
  stepNumber = 2,
  selectedFlight = undefined,
}) => {
  console.log('=== QAWizard Render ===', {
    hasQuestions: !!questions,
    questionsLength: questions?.length,
    initialAnswers,
    phase,
    stepNumber,
    selectedFlight,
  });

  // All state hooks
  const [currentStep, setCurrentStep] = useState(() => {
    try {
      // Try to load saved answers first
      const savedAnswers = localStorage.getItem('wizardAnswers');
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        const filteredAnswers = parsed.filter((answer: Answer) =>
          questions.some((q) => q.id === answer.questionId)
        );

        if (filteredAnswers.length > 0) {
          // Get active questions based on saved answers
          const activeQs = questions.filter(
            (q) => !q.showIf || q.showIf(filteredAnswers)
          );
          // Find the index of the last answered question
          const lastAnsweredId =
            filteredAnswers[filteredAnswers.length - 1].questionId;
          const lastAnsweredIndex = activeQs.findIndex(
            (q) => q.id === lastAnsweredId
          );
          return lastAnsweredIndex >= 0
            ? lastAnsweredIndex
            : activeQs.length - 1;
        }
      }

      // If no saved answers, check initialAnswers
      if (initialAnswers.length > 0) {
        const filteredInitial = initialAnswers.filter((answer) =>
          questions.some((q) => q.id === answer.questionId)
        );
        if (filteredInitial.length > 0) {
          const activeQs = questions.filter(
            (q) => !q.showIf || q.showIf(filteredInitial)
          );
          const lastAnsweredId =
            filteredInitial[filteredInitial.length - 1].questionId;
          const lastAnsweredIndex = activeQs.findIndex(
            (q) => q.id === lastAnsweredId
          );
          return lastAnsweredIndex >= 0
            ? lastAnsweredIndex
            : activeQs.length - 1;
        }
      }
      return 0;
    } catch (error) {
      console.error('Failed to load last question position:', error);
      return 0;
    }
  });

  const [isCompleted, setIsCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [answers, setAnswers] = useState<Answer[]>(() => {
    // Try to load saved answers first, fallback to initialAnswers
    try {
      const savedAnswers = localStorage.getItem('wizardAnswers');
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        return parsed.filter((answer: Answer) =>
          questions.some((q) => q.id === answer.questionId)
        );
      }
    } catch (error) {
      console.error('Failed to load saved answers:', error);
    }
    return initialAnswers.filter((answer) =>
      questions.some((q) => q.id === answer.questionId)
    );
  });
  const [isEditingMoney, setIsEditingMoney] = useState(false);
  const [lastActiveStep, setLastActiveStep] = useState<number | null>(null);

  // Redux hooks
  const dispatch = useAppDispatch();
  const { validateStep, validationRules } = useStepValidation();

  // Memoized values
  const getActiveQuestions = useCallback(
    (currentAnswers: Answer[]) => {
      console.log('getActiveQuestions called with:', {
        hasQuestions: !!questions,
        questionsLength: questions?.length,
        currentAnswers,
      });

      if (!questions || !Array.isArray(questions)) {
        console.warn('No questions array available');
        return [];
      }

      if (questions.length === 0) {
        console.warn('Questions array is empty');
        return [];
      }

      // Always start with the first question
      const activeQuestions = [questions[0]];
      console.log('First question:', questions[0]);

      // Add all questions that meet their showIf conditions
      questions.slice(1).forEach((question) => {
        // Skip questions that are related questions of other questions
        const isRelatedQuestion = questions.some((q) =>
          q.relatedQuestions?.some((rq) => rq.id === question.id)
        );

        if (
          !isRelatedQuestion &&
          (!question.showIf || question.showIf(currentAnswers))
        ) {
          activeQuestions.push(question);
        }
      });

      console.log('Final active questions:', activeQuestions);
      return activeQuestions;
    },
    [questions]
  );

  const activeQuestions = useMemo(
    () => getActiveQuestions(answers),
    [getActiveQuestions, answers]
  );

  // Effect to handle step management
  useEffect(() => {
    if (isEditingMoney && lastActiveStep !== null) {
      setCurrentStep(lastActiveStep);
    }
  }, [isEditingMoney, lastActiveStep]);

  const isPathComplete = React.useMemo(() => {
    const requiredQuestions =
      questions?.filter((q) => !q.showIf || q.showIf(answers || [])) || [];
    return requiredQuestions.every(
      (question) =>
        answers?.some((answer: Answer) => {
          if (answer.questionId !== question.id) return false;
          if (question.type === 'date') {
            return !!answer.value;
          }
          if (question.type === 'money') {
            const value = answer.value;
            if (!value) return false;
            const numValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
            return !isNaN(numValue) && numValue > 0;
          }
          return !!answer.value;
        }) ?? false
    );
  }, [questions, answers]);

  // Effect to sync with initialAnswers changes
  useEffect(() => {
    // Only run this effect on mount or when initialAnswers actually change
    const filteredAnswers = initialAnswers.filter((answer) =>
      questions.some((q) => q.id === answer.questionId)
    );

    // Only update if we have initial answers and current answers are empty
    if (filteredAnswers.length > 0 && answers.length === 0) {
      const currentActiveQuestions = getActiveQuestions(filteredAnswers);
      const moneyQuestion = currentActiveQuestions.find(
        (q) => q.type === 'money'
      );
      const moneyAnswer = filteredAnswers.find(
        (a) => moneyQuestion && a.questionId === moneyQuestion.id
      );
      const flightSelectorIndex = currentActiveQuestions.findIndex(
        (q) => q.id === 'alternative_flight'
      );

      if (moneyAnswer && flightSelectorIndex !== -1) {
        setCurrentStep(flightSelectorIndex);
        setIsEditingMoney(true);
        setLastActiveStep(flightSelectorIndex);
      } else {
        const lastAnsweredQuestionId =
          filteredAnswers[filteredAnswers.length - 1]?.questionId;
        const lastAnsweredStep = currentActiveQuestions.findIndex(
          (q) => q.id === lastAnsweredQuestionId
        );

        if (lastAnsweredStep !== -1) {
          setCurrentStep(lastAnsweredStep);
          setLastActiveStep(null);
        } else {
          // If we can't find the last answered question, go to the last active question
          setCurrentStep(currentActiveQuestions.length - 1);
          setLastActiveStep(null);
        }
      }

      setAnswers(filteredAnswers);
    }
  }, [initialAnswers, questions, getActiveQuestions, answers.length]);

  // Effect to log state changes
  useEffect(() => {
    console.log('=== QAWizard State Change ===', {
      hasQuestions: !!questions,
      questionsLength: questions?.length,
      activeQuestionsLength: activeQuestions?.length,
      currentStep,
      answers,
      isEditingMoney,
      lastActiveStep,
    });
  }, [
    questions,
    activeQuestions,
    currentStep,
    answers,
    isEditingMoney,
    lastActiveStep,
  ]);

  // Effect to validate answers whenever they change
  useEffect(() => {
    console.log('=== QAWizard Validation ===', {
      answers,
      stepNumber,
      isValid: validationRules.wizardAnswers(answers),
    });
    const isValid = validationRules.wizardAnswers(answers);
    validateStep(stepNumber, isValid);
  }, [answers, stepNumber, validateStep, validationRules]);

  // Callback hooks
  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      console.log('handleAnswer called with:', { questionId, value });

      // Special handling for money type questions
      const question = questions.find((q) => q.id === questionId);

      const updatedAnswers = [...answers];
      const existingIndex = updatedAnswers.findIndex(
        (answer) => answer.questionId === questionId
      );

      if (existingIndex !== -1) {
        updatedAnswers[existingIndex] = { questionId, value };
      } else {
        updatedAnswers.push({ questionId, value });
      }

      // Update answers state first
      setAnswers(updatedAnswers);

      // Handle side effects after state update
      queueMicrotask(() => {
        try {
          // Save to localStorage and update Redux
          localStorage.setItem('wizardAnswers', JSON.stringify(updatedAnswers));
          dispatch(setWizardAnswers(updatedAnswers));
        } catch (error) {
          console.error('Failed to save answers:', error);
        }

        if (onInteract) {
          onInteract();
        }

        // Handle money question specific logic
        if (question?.type === 'money' && !isEditingMoney) {
          setIsEditingMoney(true);
          setLastActiveStep(currentStep);
        }
      });
    },
    [questions, answers, onInteract, currentStep, isEditingMoney, dispatch]
  );

  const handleComplete = useCallback(() => {
    if (!isPathComplete || !activeQuestions?.length) return;
    if (currentStep !== activeQuestions.length - 1) return;

    if (answers.length > 0) {
      const currentAnswer = answers[answers.length - 1];
      const currentQuestion = questions.find(
        (q) => q.id === currentAnswer.questionId
      );
      const selectedOption = currentQuestion?.options?.find(
        (opt) => opt.value === currentAnswer.value
      );

      console.log('=== QAWizard Complete ===', {
        currentAnswer,
        currentQuestion,
        selectedOption,
        showConfetti: selectedOption?.showConfetti,
      });

      const message = selectedOption?.showConfetti
        ? 'Yay, you have a good chance of claiming it.'
        : 'Your responses have been recorded.';

      console.log('Setting message:', message);

      // Set completion state
      setIsCompleted(true);
      setSuccessMessage(message);
      onComplete(answers);

      // Reset completion state after delay but don't close accordion
      setTimeout(() => {
        setIsCompleted(false);
        setSuccessMessage('');
      }, 2000);
    }
  }, [
    answers,
    isPathComplete,
    onComplete,
    currentStep,
    activeQuestions,
    questions,
  ]);

  const getCurrentAnswer = useCallback(() => {
    if (!activeQuestions?.length) return '';
    const answer = answers?.find(
      (a) => a.questionId === activeQuestions[currentStep]?.id
    )?.value;
    return answer || '';
  }, [answers, activeQuestions, currentStep]);

  const isAnswerValid = useCallback(() => {
    if (!activeQuestions?.length) return false;
    const currentQuestion = activeQuestions[currentStep];
    if (!currentQuestion) return false;

    const currentAnswer = getCurrentAnswer();
    console.log('Validating answer:', {
      questionType: currentQuestion.type,
      questionId: currentQuestion.id,
      currentAnswer,
    });

    if (currentQuestion.type === 'money') {
      if (!currentAnswer) return false;
      const numValue = parseFloat(currentAnswer.replace(/[^0-9.-]+/g, ''));
      return !isNaN(numValue) && numValue > 0;
    }

    if (currentQuestion.type === 'date') {
      if (!currentAnswer) return false;
      // For date type, just check if we have a value
      return true;
    }

    return !!currentAnswer;
  }, [getCurrentAnswer, activeQuestions, currentStep]);

  const goToNext = useCallback(() => {
    if (
      activeQuestions?.length > 0 &&
      currentStep < activeQuestions.length - 1
    ) {
      setCurrentStep((prev) => Math.min(prev + 1, activeQuestions.length - 1));
    }
  }, [currentStep, activeQuestions]);

  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      // Check if the current question is a money question
      const currentQuestion = activeQuestions[currentStep];
      if (currentQuestion?.type === 'money') {
        setIsEditingMoney(false);
      }
      setCurrentStep((prev) => Math.max(0, prev - 1));
    }
  }, [currentStep, activeQuestions]);

  // Effect to save current step
  useEffect(() => {
    try {
      // Save current step in the answers array
      const currentAnswers = answers.map((answer) => ({
        ...answer,
        isActiveSelection:
          answer.questionId === activeQuestions[currentStep]?.id,
      }));
      localStorage.setItem('wizardAnswers', JSON.stringify(currentAnswers));
    } catch (error) {
      console.error('Failed to save current step:', error);
    }
  }, [currentStep, answers, activeQuestions]);

  // Don't render if no questions
  if (!questions || !Array.isArray(questions)) {
    console.warn('QAWizard: questions prop is not an array');
    return null;
  }

  if (questions.length === 0) {
    console.warn('QAWizard: questions array is empty');
    return null;
  }

  // Ensure we have at least one question to show
  const visibleQuestions =
    activeQuestions.length > 0 ? activeQuestions : [questions[0]];
  console.log('=== QAWizard Visible Questions ===', {
    visibleQuestions: visibleQuestions.map((q) => ({ id: q.id, text: q.text })),
    currentStep,
    answers,
  });

  // Main render
  // Render completed state if needed
  if (isCompleted) {
    const currentAnswer = answers[answers.length - 1];
    const currentQuestion = questions.find(
      (q) => q.id === currentAnswer.questionId
    );
    const selectedOption = currentQuestion?.options?.find(
      (opt) => opt.value === currentAnswer.value
    );

    console.log('=== QAWizard Render Completed State ===', {
      currentAnswer,
      currentQuestion,
      selectedOption,
      showConfetti: selectedOption?.showConfetti,
      successMessage,
    });

    return (
      <section className={qaWizardConfig.spacing.questionGap}>
        <div
          className={`${qaWizardConfig.spacing.optionGap} min-h-[300px] flex flex-col justify-center`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
            className={qaWizardConfig.success.icon.wrapper}
          >
            {selectedOption?.showConfetti ? (
              <div className={qaWizardConfig.success.icon.emoji}>
                <span style={{ fontSize: '64px', lineHeight: '1' }}>🎉</span>
              </div>
            ) : (
              <CheckCircleIcon className={qaWizardConfig.success.icon.check} />
            )}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className={qaWizardConfig.success.message.wrapper}
          >
            <h2 className={qaWizardConfig.success.message.title}>
              {successMessage}
            </h2>
            <p className={qaWizardConfig.success.message.subtitle}>
              We&apos;re processing your information...
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  // Main render
  return (
    <div className={qaWizardConfig.spacing.questionGap}>
      {visibleQuestions[currentStep] && (
        <div className={qaWizardConfig.spacing.optionGap}>
          <QuestionAnswer
            question={visibleQuestions[currentStep]}
            selectedOption={
              answers?.find(
                (a) => a.questionId === visibleQuestions[currentStep].id
              )?.value || ''
            }
            onSelect={handleAnswer}
            currentStep={currentStep}
            totalSteps={visibleQuestions.length}
            selectedFlight={selectedFlight}
          />

          {/* Navigation buttons */}
          <div className={qaWizardConfig.spacing.navigationWrapper}>
            <button
              onClick={goToPrevious}
              disabled={currentStep === 0}
              className={`${qaWizardConfig.spacing.buttonBase} ${
                currentStep === 0
                  ? qaWizardConfig.spacing.buttonPreviousDisabled
                  : qaWizardConfig.spacing.buttonPreviousEnabled
              }`}
            >
              Previous
            </button>
            <button
              onClick={
                currentStep === visibleQuestions.length - 1
                  ? handleComplete
                  : goToNext
              }
              disabled={
                !isAnswerValid() ||
                (currentStep === visibleQuestions.length - 1 && !isPathComplete)
              }
              className={`${qaWizardConfig.spacing.buttonBase} ${
                !isAnswerValid() ||
                (currentStep === visibleQuestions.length - 1 && !isPathComplete)
                  ? qaWizardConfig.spacing.buttonNextDisabled
                  : qaWizardConfig.spacing.buttonNextEnabled
              }`}
            >
              {currentStep === visibleQuestions.length - 1
                ? 'Complete'
                : 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
