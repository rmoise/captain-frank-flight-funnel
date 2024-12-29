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
  const [showingSuccess, setShowingSuccess] = useState(false);

  // Redux hooks
  const dispatch = useAppDispatch();
  const { validateStep } = useStepValidation();

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
    console.log('\n=== QAWizard Answer Validation ===');
    console.log('Current answers:', answers);
    console.log('Active questions:', activeQuestions);

    // Check if all active questions have valid answers
    const isValid = activeQuestions.every((question) => {
      const answer = answers.find((a) => a.questionId === question.id);
      if (!answer) {
        console.log(`Question ${question.id} has no answer`);
        return false;
      }

      if (question.type === 'money') {
        const numValue = parseFloat(answer.value.replace(/[^0-9.-]+/g, ''));
        const isValidMoney = !isNaN(numValue) && numValue > 0;
        console.log(`Question ${question.id} money validation:`, {
          numValue,
          isValidMoney,
        });
        return isValidMoney;
      }

      if (question.type === 'date') {
        const isValidDate = !!answer.value;
        console.log(`Question ${question.id} date validation:`, isValidDate);
        return isValidDate;
      }

      const isValidAnswer = answer.value !== undefined && answer.value !== '';
      console.log(`Question ${question.id} general validation:`, isValidAnswer);
      return isValidAnswer;
    });

    console.log('=== QAWizard Validation Result ===', {
      answers,
      stepNumber,
      isValid,
      activeQuestions: activeQuestions.map((q) => q.id),
    });

    validateStep(stepNumber, isValid);
  }, [answers, stepNumber, validateStep, activeQuestions]);

  // Don't automatically call handleComplete when all questions are answered
  useEffect(() => {
    if (isPathComplete && currentStep === activeQuestions.length - 1) {
      // Instead of auto-completing, just save the answers
      try {
        localStorage.setItem('wizardAnswers', JSON.stringify(answers));
        dispatch(setWizardAnswers(answers));
      } catch (error) {
        console.error('Failed to save answers:', error);
      }
    }
  }, [isPathComplete, currentStep, activeQuestions.length, answers, dispatch]);

  const isAnswerValid = useCallback(() => {
    console.log('\n=== QAWizard Current Answer Validation ===');

    if (!activeQuestions?.length) {
      console.log('No active questions');
      return false;
    }

    const currentQuestion = activeQuestions[currentStep];
    if (!currentQuestion) {
      console.log('No current question');
      return false;
    }

    const currentAnswer = answers?.find(
      (a) => a.questionId === currentQuestion?.id
    )?.value;

    console.log('Validating answer:', {
      currentQuestion,
      currentAnswer,
      type: currentQuestion.type,
    });

    if (currentQuestion.type === 'money') {
      if (!currentAnswer) {
        console.log('No money answer');
        return false;
      }
      const numValue = parseFloat(currentAnswer.replace(/[^0-9.-]+/g, ''));
      const isValid = !isNaN(numValue) && numValue > 0;
      console.log('Money validation:', { numValue, isValid });
      return isValid;
    }

    if (currentQuestion.type === 'date') {
      const isValid = !!currentAnswer;
      console.log('Date validation:', isValid);
      return isValid;
    }

    const isValid = currentAnswer !== undefined && currentAnswer !== '';
    console.log('General validation:', isValid);
    return isValid;
  }, [answers, activeQuestions, currentStep]);

  const handleComplete = useCallback(() => {
    console.log('Handle complete called', {
      currentStep,
      activeQuestionsLength: activeQuestions.length,
      isValid: isAnswerValid(),
      answers,
      stepNumber,
    });

    if (!isAnswerValid()) {
      console.log('Current answer is not valid');
      return;
    }

    // Only complete if we have answers and all questions are answered
    const allQuestionsAnswered = activeQuestions.every((question) => {
      const answer = answers.find((a) => a.questionId === question.id);
      if (!answer) return false;

      if (question.type === 'money') {
        const numValue = parseFloat(answer.value.replace(/[^0-9.-]+/g, ''));
        return !isNaN(numValue) && numValue > 0;
      }

      if (question.type === 'date') {
        return !!answer.value;
      }

      return answer.value !== undefined && answer.value !== '';
    });

    console.log('All questions answered:', allQuestionsAnswered);

    if (!allQuestionsAnswered) {
      console.log('Not all questions are answered');
      return;
    }

    console.log('All validation passed, completing wizard');

    // Only complete if we have answers
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
        answers,
        stepNumber,
      });

      const message = selectedOption?.showConfetti
        ? 'Yay, you have a good chance of claiming it.'
        : 'Your responses have been recorded.';

      console.log('Setting message:', message);

      // Set completion state
      setIsCompleted(true);
      setSuccessMessage(message);
      setShowingSuccess(true);

      // Save answers to localStorage and Redux
      try {
        localStorage.setItem('wizardAnswers', JSON.stringify(answers));
        dispatch(setWizardAnswers(answers));
      } catch (error) {
        console.error('Failed to save answers:', error);
      }

      // Call onComplete with answers
      onComplete(answers);

      // After 2 seconds, hide success message and show questions
      setTimeout(() => {
        setShowingSuccess(false);
        // If this is step 3, trigger step 4 to open
        if (stepNumber === 3) {
          console.log('Step 3 completed, opening step 4');
          validateStep(3, true); // Validate step 3
          // Small delay to ensure step 3 validation is processed
          setTimeout(() => {
            validateStep(4, false); // Initialize step 4 as not complete
          }, 100);
        }
      }, 2000);

      // Validate current step
      validateStep(stepNumber, true);
    }
  }, [
    answers,
    isAnswerValid,
    onComplete,
    currentStep,
    activeQuestions,
    questions,
    stepNumber,
    validateStep,
    dispatch,
  ]);

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

  // Callback hooks
  const handleAnswer = useCallback(
    (questionId: string, value: string) => {
      console.log('\n=== QAWizard handleAnswer ===', { questionId, value });

      // Update answers
      setAnswers((prevAnswers) => {
        const newAnswers = [...prevAnswers];
        const existingAnswerIndex = newAnswers.findIndex(
          (a) => a.questionId === questionId
        );

        if (existingAnswerIndex !== -1) {
          newAnswers[existingAnswerIndex] = {
            ...newAnswers[existingAnswerIndex],
            value,
          };
        } else {
          newAnswers.push({ questionId, value });
        }

        // Save answers to localStorage and Redux
        try {
          console.log('Saving answers:', newAnswers);
          localStorage.setItem('wizardAnswers', JSON.stringify(newAnswers));
          dispatch(setWizardAnswers(newAnswers));
        } catch (error) {
          console.error('Failed to save answers:', error);
        }

        // Call onInteract if provided
        if (onInteract) {
          onInteract();
        }

        // Validate the current step
        const currentQuestion = activeQuestions[currentStep];
        if (currentQuestion) {
          const answer = newAnswers.find(
            (a) => a.questionId === currentQuestion.id
          );
          let isValid = false;

          if (answer) {
            if (currentQuestion.type === 'money') {
              const numValue = parseFloat(
                answer.value.replace(/[^0-9.-]+/g, '')
              );
              isValid = !isNaN(numValue) && numValue > 0;
            } else if (currentQuestion.type === 'date') {
              isValid = !!answer.value;
            } else {
              isValid = answer.value !== undefined && answer.value !== '';
            }
          }

          console.log('Validating current step:', {
            questionId: currentQuestion.id,
            answer,
            isValid,
          });

          validateStep(stepNumber, isValid);
        }

        return newAnswers;
      });
    },
    [
      dispatch,
      onInteract,
      activeQuestions,
      currentStep,
      stepNumber,
      validateStep,
    ]
  );

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

    if (showingSuccess) {
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
                <CheckCircleIcon
                  className={qaWizardConfig.success.icon.check}
                />
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

    return (
      <div className={qaWizardConfig.spacing.questionGap}>
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
            {currentStep === visibleQuestions.length - 1 && !showingSuccess && (
              <button
                onClick={handleComplete}
                disabled={!isAnswerValid()}
                className={`${qaWizardConfig.spacing.buttonBase} ${
                  !isAnswerValid()
                    ? qaWizardConfig.spacing.buttonNextDisabled
                    : qaWizardConfig.spacing.buttonNextEnabled
                }`}
              >
                Complete
              </button>
            )}
            {currentStep < visibleQuestions.length - 1 && (
              <button
                onClick={goToNext}
                disabled={!isAnswerValid()}
                className={`${qaWizardConfig.spacing.buttonBase} ${
                  !isAnswerValid()
                    ? qaWizardConfig.spacing.buttonNextDisabled
                    : qaWizardConfig.spacing.buttonNextEnabled
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
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
            {currentStep === visibleQuestions.length - 1 && !showingSuccess && (
              <button
                onClick={handleComplete}
                disabled={!isAnswerValid()}
                className={`${qaWizardConfig.spacing.buttonBase} ${
                  !isAnswerValid()
                    ? qaWizardConfig.spacing.buttonNextDisabled
                    : qaWizardConfig.spacing.buttonNextEnabled
                }`}
              >
                Complete
              </button>
            )}
            {currentStep < visibleQuestions.length - 1 && (
              <button
                onClick={goToNext}
                disabled={!isAnswerValid()}
                className={`${qaWizardConfig.spacing.buttonBase} ${
                  !isAnswerValid()
                    ? qaWizardConfig.spacing.buttonNextDisabled
                    : qaWizardConfig.spacing.buttonNextEnabled
                }`}
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
