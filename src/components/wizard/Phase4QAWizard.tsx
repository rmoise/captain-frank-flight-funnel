'use client';

import React, {
  useCallback,
  useMemo,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer } from '../../types/wizard';
import { Question } from '../../types/experience';
import { QuestionAnswer } from '../shared/QuestionAnswer';
import type { Flight } from '../../types/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { useFlightStore } from '@/lib/state/flightStore';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { qaWizardConfig } from '@/config/qaWizard';
import { useTranslation } from '@/hooks/useTranslation';

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
      wizardTypeRef.current = wizardType;
      setCurrentStep(0);
    }
  }, [wizardType]);

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
        currentSelectedFlights: phase4Store.selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          departureCity: f.departureCity,
          arrivalCity: f.arrivalCity,
        })),
        originalFlights: useFlightStore.getState().originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          departureCity: f.departureCity,
          arrivalCity: f.arrivalCity,
        })),
        timestamp: new Date().toISOString(),
      });

      // Special handling for informed date questions
      if (
        questionId === 'informed_date' ||
        questionId === 'specific_informed_date'
      ) {
        // For date selection, we want to update the answer without validation
        // and preserve the current step
        phase4Store.batchUpdate({
          informedDateAnswers: [
            ...phase4Store.informedDateAnswers.filter(
              (a) => a.questionId !== questionId
            ),
            { questionId, value },
          ],
          lastAnsweredQuestion: questionId,
          // Preserve current validation and interaction states
          informedDateStepValidation: phase4Store.informedDateStepValidation,
          informedDateStepInteraction: phase4Store.informedDateStepInteraction,
          travelStatusStepValidation: phase4Store.travelStatusStepValidation,
          travelStatusStepInteraction: phase4Store.travelStatusStepInteraction,
          _lastUpdate: Date.now(),
        });

        console.log(
          '=== Phase4QAWizard - handleSelect (Informed Date) EXIT ===',
          {
            questionId,
            value,
            timestamp: new Date().toISOString(),
          }
        );
        return;
      }

      // For travel status changes, log the state
      if (questionId === 'travel_status') {
        console.log('=== Phase4QAWizard - Travel Status Change ===', {
          oldStatus: phase4Store.travelStatusAnswers.find(
            (a) => a.questionId === 'travel_status'
          )?.value,
          newStatus: value,
          requiresAlternativeFlights:
            value === 'provided' || value === 'took_alternative_own',
          currentSelectedFlights: phase4Store.selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });
      }

      // For other answers, proceed with normal handling
      phase4Store.setWizardAnswer({
        questionId,
        value,
        shouldValidate: false,
      });

      console.log('=== Phase4QAWizard - handleSelect EXIT ===', {
        questionId,
        value,
        currentSelectedFlights: phase4Store.selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          departureCity: f.departureCity,
          arrivalCity: f.arrivalCity,
        })),
        timestamp: new Date().toISOString(),
      });
    },
    [phase4Store]
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

  // Handle going to next step
  const goToNext = useCallback(() => {
    console.log('=== Phase4QAWizard - goToNext ENTRY ===', {
      currentStep,
      visibleQuestionsLength: visibleQuestions.length,
      isCurrentQuestionAnswered,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
      travelStatusStepValidation: phase4Store.travelStatusStepValidation,
      informedDateStepValidation: phase4Store.informedDateStepValidation,
      travelStatusStepInteraction: phase4Store.travelStatusStepInteraction,
      informedDateStepInteraction: phase4Store.informedDateStepInteraction,
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
    } else if (currentStep < visibleQuestions.length) {
      console.log('Showing success state and updating validation');
      // Only update validation state and show success when clicking submit
      setCurrentStep(visibleQuestions.length);

      // First, store the current validation state
      const currentStepValidation =
        wizardType === 'travel_status'
          ? { ...phase4Store.travelStatusStepValidation }
          : { ...phase4Store.informedDateStepValidation };
      const currentStepInteraction =
        wizardType === 'travel_status'
          ? { ...phase4Store.travelStatusStepInteraction }
          : { ...phase4Store.informedDateStepInteraction };

      // Show success state immediately - only update the current wizard type
      if (wizardType === 'travel_status') {
        phase4Store.updateValidationState({
          travelStatusShowingSuccess: true,
          travelStatusIsValid: true,
          travelStatusStepValidation: { ...currentStepValidation, 2: true },
          travelStatusStepInteraction: { ...currentStepInteraction, 2: true },
          _lastUpdate: Date.now(),
        });
      } else {
        phase4Store.updateValidationState({
          informedDateShowingSuccess: true,
          informedDateIsValid: true,
          informedDateStepValidation: { ...currentStepValidation, 3: true },
          informedDateStepInteraction: { ...currentStepInteraction, 3: true },
          _lastUpdate: Date.now(),
        });
      }

      // Call onComplete immediately to process the answers
      if (onComplete) {
        console.log('Calling onComplete with answers:', wizardAnswers);
        onComplete(wizardAnswers);
      }
    }

    console.log('=== Phase4QAWizard - goToNext EXIT ===', {
      nextStep: currentStep + 1,
      isLastStep,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
      travelStatusStepValidation: phase4Store.travelStatusStepValidation,
      informedDateStepValidation: phase4Store.informedDateStepValidation,
      travelStatusStepInteraction: phase4Store.travelStatusStepInteraction,
      informedDateStepInteraction: phase4Store.informedDateStepInteraction,
    });
  }, [
    currentStep,
    visibleQuestions.length,
    isCurrentQuestionAnswered,
    phase4Store,
    wizardType,
    onComplete,
    wizardAnswers,
  ]);

  // Handle going back
  const goToPrevious = useCallback(() => {
    if (currentStep > 0) {
      // Reset state based on wizard type
      if (wizardType === 'travel_status') {
        phase4Store.resetTravelStatusState();
      } else {
        phase4Store.resetInformedDateState();
      }
      setCurrentStep(0);
    }
  }, [currentStep, phase4Store, wizardType]);

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
    const answers =
      wizardType === 'travel_status'
        ? phase4Store.travelStatusAnswers
        : phase4Store.informedDateAnswers;

    // Only show success if explicitly set in store for the current wizard type
    const isShowingSuccess =
      wizardType === 'travel_status'
        ? phase4Store.travelStatusShowingSuccess
        : phase4Store.informedDateShowingSuccess;

    console.log('=== Phase4QAWizard - Success State Check ===', {
      wizardType,
      answers,
      isShowingSuccess,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
      travelStatusIsValid: phase4Store.travelStatusIsValid,
      informedDateIsValid: phase4Store.informedDateIsValid,
    });

    if (!isShowingSuccess || !answers || answers.length === 0) {
      return { showing: false, message: '' };
    }

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
