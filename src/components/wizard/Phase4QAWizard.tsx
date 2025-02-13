'use client';

import React, {
  useCallback,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer } from '@/types/wizard';
import { Question } from '@/types/experience';
import { QuestionAnswer } from '@/components/shared/QuestionAnswer';
import type { Flight } from '@/types/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { useFlightStore } from '@/lib/state/flightStore';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { qaWizardConfig } from '@/config/qaWizard';
import { useTranslation } from '@/hooks/useTranslation';
import type { Phase4State } from '@/lib/state/phase4Store';

interface Phase4QAWizardProps {
  questions: Question[];
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  selectedFlight?: Flight | null;
  wizardType: 'travel_status' | 'informed_date';
}

export const Phase4QAWizard: React.FC<Phase4QAWizardProps> = ({
  questions = [],
  onComplete,
  initialAnswers = [],
  selectedFlight,
  wizardType,
}) => {
  console.log('Phase4QAWizard rendered:', { wizardType, questions });

  const { t } = useTranslation();
  const phase4Store = usePhase4Store();
  const [currentStep, setCurrentStep] = useState(0);
  const wizardTypeRef = useRef(wizardType);
  const isInitialMount = useRef(true);
  const prevAnswersRef = useRef<Answer[]>([]);

  // Handle wizard type changes with layout effect to ensure synchronous update
  useLayoutEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (wizardTypeRef.current !== wizardType) {
      // Only update the wizard type reference and reset step
      // without resetting the state
      wizardTypeRef.current = wizardType;
      setCurrentStep(0);

      // Preserve existing answers based on wizard type
      const currentAnswers =
        wizardType === 'informed_date'
          ? phase4Store.informedDateAnswers
          : phase4Store.travelStatusAnswers;

      if (currentAnswers.length > 0) {
        // If we have answers, don't reset the step to 0
        const lastAnsweredStep = questions.findIndex(
          (q) => q.id === currentAnswers[currentAnswers.length - 1].questionId
        );
        if (lastAnsweredStep >= 0) {
          setCurrentStep(lastAnsweredStep);
        }
      }
    }
  }, [wizardType, phase4Store, questions]);

  // Get current answers - memoize to prevent unnecessary recalculations
  const wizardAnswers = useMemo(() => {
    const answers =
      wizardType === 'informed_date'
        ? phase4Store.informedDateAnswers
        : initialAnswers?.length > 0
          ? initialAnswers
          : phase4Store.travelStatusAnswers;

    // Only update if answers have changed
    if (JSON.stringify(answers) !== JSON.stringify(prevAnswersRef.current)) {
      prevAnswersRef.current = answers;
    }
    return prevAnswersRef.current;
  }, [
    wizardType,
    initialAnswers,
    phase4Store.informedDateAnswers,
    phase4Store.travelStatusAnswers,
  ]);

  // Get visible questions
  const visibleQuestions = useMemo(() => {
    if (!questions?.length) return [];

    return [
      questions[0],
      ...questions.slice(1).filter((question) => {
        if (!question.showIf) return true;
        try {
          return question.showIf(wizardAnswers);
        } catch {
          return false;
        }
      }),
    ];
  }, [questions, wizardAnswers]);

  // Get current question
  const currentQuestion = useMemo(() => {
    return visibleQuestions.length
      ? currentStep < visibleQuestions.length
        ? visibleQuestions[currentStep]
        : visibleQuestions[0]
      : null;
  }, [visibleQuestions, currentStep]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'flight_selector') {
      const hasSelectedFlight = Boolean(selectedFlight?.id);
      const hasStoredFlights = phase4Store.selectedFlights?.length > 0;
      return hasSelectedFlight || hasStoredFlights;
    }

    // For date selection questions, consider them answered if they have any value
    if (currentQuestion.id === 'specific_informed_date') {
      return wizardAnswers.some(
        (a) => a.questionId === currentQuestion.id && a.value
      );
    }

    // For money input questions, check if there's a valid numeric value
    if (currentQuestion.type === 'money') {
      const answer = wizardAnswers.find(
        (a) => a.questionId === currentQuestion.id
      );
      if (!answer || !answer.value) return false;
      const numericValue = parseFloat(answer.value.toString());
      return !isNaN(numericValue) && numericValue > 0;
    }

    return wizardAnswers.some((a) => a.questionId === currentQuestion.id);
  }, [
    currentQuestion,
    selectedFlight?.id,
    wizardAnswers,
    phase4Store.selectedFlights,
  ]);

  // Handle selection of an answer
  const handleSelect = useCallback(
    (questionId: string, value: string | number | boolean) => {
      console.log('=== Phase4QAWizard - handleSelect ENTRY ===', {
        questionId,
        value,
        wizardType,
        currentSelectedFlights: phase4Store.selectedFlights,
        originalFlights: useFlightStore.getState().originalFlights,
        timestamp: new Date().toISOString(),
      });

      // Get current answers based on wizard type
      const currentAnswers =
        wizardType === 'informed_date'
          ? [...phase4Store.informedDateAnswers]
          : [...phase4Store.travelStatusAnswers];

      // Update or add the answer
      const answerIndex = currentAnswers.findIndex(
        (a) => a.questionId === questionId
      );
      if (answerIndex >= 0) {
        currentAnswers[answerIndex] = { questionId, value };
      } else {
        currentAnswers.push({ questionId, value });
      }

      // Only update answers and last answered question, without validation
      const updates: Partial<Phase4State> = {
        lastAnsweredQuestion: questionId,
        _lastUpdate: Date.now(),
      };

      if (wizardType === 'informed_date') {
        phase4Store.batchUpdate({
          ...updates,
          informedDateAnswers: currentAnswers,
        });
      } else {
        phase4Store.batchUpdate({
          ...updates,
          travelStatusAnswers: currentAnswers,
        });
      }

      console.log('=== Phase4QAWizard - handleSelect EXIT ===', {
        questionId,
        value,
        currentAnswers,
        wizardType,
        timestamp: new Date().toISOString(),
      });
    },
    [phase4Store, wizardType]
  );

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      return (
        wizardAnswers
          .find((a) => a.questionId === questionId)
          ?.value?.toString() || ''
      );
    },
    [wizardAnswers]
  );

  // Handle completion of the wizard
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log('=== Phase4QAWizard - handleComplete START ===', {
        answers,
        wizardType,
        currentStep,
        visibleQuestions,
        timestamp: new Date().toISOString(),
      });

      // Only update validation state when explicitly completing the wizard
      if (currentStep === visibleQuestions.length - 1) {
        // Get current validation states
        const currentStepValidation =
          wizardType === 'travel_status'
            ? { ...phase4Store.travelStatusStepValidation }
            : { ...phase4Store.informedDateStepValidation };
        const currentStepInteraction =
          wizardType === 'travel_status'
            ? { ...phase4Store.travelStatusStepInteraction }
            : { ...phase4Store.informedDateStepInteraction };

        // Update validation state for current wizard type
        const updates: Partial<Phase4State> = {
          _lastUpdate: Date.now(),
        };

        if (wizardType === 'travel_status') {
          updates.travelStatusShowingSuccess = true;
          updates.travelStatusIsValid = true;
          updates.travelStatusStepValidation = {
            ...currentStepValidation,
            2: true,
          };
          updates.travelStatusStepInteraction = {
            ...currentStepInteraction,
            2: true,
          };
        } else {
          updates.informedDateShowingSuccess = true;
          updates.informedDateIsValid = true;
          updates.informedDateStepValidation = {
            ...currentStepValidation,
            3: true,
          };
          updates.informedDateStepInteraction = {
            ...currentStepInteraction,
            3: true,
          };
        }

        // Update store state
        phase4Store.updateValidationState(updates);

        // Call onComplete with current wizard's answers
        if (onComplete) {
          const currentAnswers =
            wizardType === 'travel_status'
              ? phase4Store.travelStatusAnswers
              : phase4Store.informedDateAnswers;

          console.log('Calling onComplete with answers:', {
            wizardType,
            answers: currentAnswers,
          });
          onComplete(currentAnswers);
        }

        // Save validation state to localStorage
        if (typeof window !== 'undefined') {
          const validationState = {
            travelStatusStepValidation: phase4Store.travelStatusStepValidation,
            travelStatusStepInteraction:
              phase4Store.travelStatusStepInteraction,
            informedDateStepValidation: phase4Store.informedDateStepValidation,
            informedDateStepInteraction:
              phase4Store.informedDateStepInteraction,
            travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
            travelStatusIsValid: phase4Store.travelStatusIsValid,
            informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
            informedDateIsValid: phase4Store.informedDateIsValid,
            _timestamp: Date.now(),
          };
          localStorage.setItem(
            'phase4ValidationState',
            JSON.stringify(validationState)
          );
        }
      }

      console.log('=== Phase4QAWizard - handleComplete END ===', {
        wizardType,
        currentStep,
        timestamp: new Date().toISOString(),
      });
    },
    [currentStep, visibleQuestions.length, phase4Store, wizardType, onComplete]
  );

  // Handle going to next step
  const goToNext = useCallback(() => {
    console.log('=== Phase4QAWizard - goToNext ENTRY ===', {
      currentStep,
      visibleQuestionsLength: visibleQuestions.length,
      isCurrentQuestionAnswered,
      wizardType,
      timestamp: new Date().toISOString(),
    });

    if (!isCurrentQuestionAnswered) {
      console.log('❌ Current question not answered, cannot proceed');
      return;
    }

    const nextStep = currentStep + 1;
    const isLastStep = nextStep >= visibleQuestions.length;

    if (!isLastStep) {
      // Just move to next question
      console.log('Moving to next question:', { nextStep });
      setCurrentStep(nextStep);
    } else {
      console.log('Completing wizard section:', { wizardType });

      // Get current answers for completion
      const currentAnswers =
        wizardType === 'travel_status'
          ? phase4Store.travelStatusAnswers
          : phase4Store.informedDateAnswers;

      // Call handleComplete with current answers
      handleComplete(currentAnswers);
    }

    console.log('=== Phase4QAWizard - goToNext EXIT ===', {
      nextStep,
      isLastStep,
      wizardType,
      timestamp: new Date().toISOString(),
    });
  }, [
    currentStep,
    visibleQuestions.length,
    isCurrentQuestionAnswered,
    phase4Store,
    wizardType,
    handleComplete,
  ]);

  // Handle going back
  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    console.log('=== Phase4QAWizard - handleBackToQuestions ENTRY ===', {
      wizardType,
      currentStep,
      validationStates: {
        travelStatus: {
          showingSuccess: phase4Store.travelStatusShowingSuccess,
          isValid: phase4Store.travelStatusIsValid,
          stepValidation: phase4Store.travelStatusStepValidation,
        },
        informedDate: {
          showingSuccess: phase4Store.informedDateShowingSuccess,
          isValid: phase4Store.informedDateIsValid,
          stepValidation: phase4Store.informedDateStepValidation,
        },
      },
    });

    // Reset current step first
    setCurrentStep(0);

    // Preserve existing flight type or default to 'direct'
    const currentFlightType = phase4Store.selectedType || 'direct';
    const currentSelectedFlights = phase4Store.selectedFlights;

    // Reset state based on wizard type and ensure UI cleanup
    if (wizardType === 'travel_status') {
      phase4Store.batchUpdate({
        travelStatusAnswers: [],
        travelStatusCurrentStep: 0,
        travelStatusShowingSuccess: false,
        travelStatusIsValid: false,
        travelStatusStepValidation: {},
        travelStatusStepInteraction: {},
        lastAnsweredQuestion: null,
        selectedType: currentFlightType,
        // Preserve selected flights and related data
        selectedFlights: currentSelectedFlights,
        _lastUpdate: Date.now(),
      });
    } else {
      phase4Store.batchUpdate({
        informedDateAnswers: [],
        informedDateCurrentStep: 0,
        informedDateShowingSuccess: false,
        informedDateIsValid: false,
        informedDateStepValidation: {},
        informedDateStepInteraction: {},
        lastAnsweredQuestion: null,
        selectedType: currentFlightType,
        // Preserve selected flights and related data
        selectedFlights: currentSelectedFlights,
        _lastUpdate: Date.now(),
      });
    }

    console.log('=== Phase4QAWizard - handleBackToQuestions EXIT ===', {
      wizardType,
      currentStep,
      validationStates: {
        travelStatus: {
          showingSuccess: phase4Store.travelStatusShowingSuccess,
          isValid: phase4Store.travelStatusIsValid,
          stepValidation: phase4Store.travelStatusStepValidation,
        },
        informedDate: {
          showingSuccess: phase4Store.informedDateShowingSuccess,
          isValid: phase4Store.informedDateIsValid,
          stepValidation: phase4Store.informedDateStepValidation,
        },
      },
    });
  }, [currentStep, phase4Store, wizardType]);

  // Get success state
  const successState = useMemo(() => {
    console.log('=== Phase4QAWizard - Success State Check ===', {
      wizardType,
      answers: wizardAnswers,
      isShowingSuccess:
        wizardType === 'travel_status'
          ? phase4Store.travelStatusShowingSuccess
          : phase4Store.informedDateShowingSuccess,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
      travelStatusIsValid: phase4Store.travelStatusIsValid,
      informedDateIsValid: phase4Store.informedDateIsValid,
    });

    // Get the showing success state based on wizard type
    const isShowingSuccess =
      wizardType === 'travel_status'
        ? phase4Store.travelStatusShowingSuccess
        : phase4Store.informedDateShowingSuccess;

    // Get the answers based on wizard type
    const answers =
      wizardType === 'travel_status'
        ? phase4Store.travelStatusAnswers
        : phase4Store.informedDateAnswers;

    // If we don't have success state or answers, return not showing
    if (!isShowingSuccess || !answers || answers.length === 0) {
      return { showing: false, message: '' };
    }

    // Find the last answer and determine success message
    const lastAnswer = answers[answers.length - 1];
    if (!lastAnswer) return { showing: false, message: '' };

    // Find the question and option for the last answer
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    return {
      showing: isShowingSuccess,
      message: option?.showConfetti
        ? t.wizard.success.goodChance
        : t.wizard.success.answersSaved,
    };
  }, [
    phase4Store.travelStatusAnswers,
    phase4Store.informedDateAnswers,
    phase4Store.travelStatusShowingSuccess,
    phase4Store.informedDateShowingSuccess,
    phase4Store.travelStatusIsValid,
    phase4Store.informedDateIsValid,
    wizardType,
    questions,
    t.wizard.success,
    wizardAnswers,
  ]);

  // Get success icon based on last answer
  const getSuccessIcon = useMemo(() => {
    const answers =
      wizardType === 'travel_status'
        ? phase4Store.travelStatusAnswers
        : phase4Store.informedDateAnswers;
    const lastAnswer = answers[answers.length - 1];
    if (!lastAnswer) return null;

    // Find the question and selected option
    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    if (option?.showConfetti) {
      return <span className={qaWizardConfig.success.icon.emoji}>🎉</span>;
    }

    return <CheckCircleIcon className={qaWizardConfig.success.icon.check} />;
  }, [
    phase4Store.travelStatusAnswers,
    phase4Store.informedDateAnswers,
    questions,
    wizardType,
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
                      onClick={() => {
                        console.log('Back button clicked');
                        goToPrevious();
                      }}
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
                    onClick={() => {
                      console.log('Next/Submit button clicked');
                      goToNext();
                    }}
                    disabled={!isCurrentQuestionAnswered}
                    className={`px-4 py-2 bg-[#F54538] text-white rounded-md ${
                      !isCurrentQuestionAnswered
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-[#E03F33]'
                    }`}
                    whileHover={
                      isCurrentQuestionAnswered ? { scale: 1.05 } : {}
                    }
                    whileTap={isCurrentQuestionAnswered ? { scale: 0.95 } : {}}
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

export default Phase4QAWizard;
