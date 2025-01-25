'use client';

import React, {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Answer } from '../../types/wizard';
import { Question } from '../../types/experience';
import { QuestionAnswer } from '../shared/QuestionAnswer';
import type { Flight } from '../../types/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
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
  const prevWizardTypeRef = useRef(wizardType);
  const [currentStep, setCurrentStep] = useState(0);

  // Reset step when type changes
  useEffect(() => {
    console.log('=== Phase4QAWizard - wizardType changed ===', {
      from: prevWizardTypeRef.current,
      to: wizardType,
      currentStep,
      travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
      informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
    });

    if (prevWizardTypeRef.current !== wizardType) {
      console.log('Resetting current step');
      // Just reset the current step
      setCurrentStep(0);
      // Update the ref
      prevWizardTypeRef.current = wizardType;
    }
  }, [wizardType, phase4Store, currentStep]);

  // Get current answers
  const wizardAnswers = useMemo(() => {
    // Never use initialAnswers for informed date wizard
    if (wizardType === 'informed_date') {
      return phase4Store.informedDateAnswers;
    }
    if (initialAnswers && initialAnswers.length > 0) {
      return initialAnswers;
    }
    return phase4Store.travelStatusAnswers;
  }, [initialAnswers, phase4Store, wizardType]);

  // Get visible questions
  const visibleQuestions = useMemo(() => {
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return [];
    }

    const firstQuestion = questions[0];
    const remainingQuestions = questions.slice(1);

    const filteredRemaining = remainingQuestions.filter(
      (question: Question) => {
        if (question.showIf) {
          try {
            return question.showIf(wizardAnswers);
          } catch (err) {
            return false;
          }
        }
        return true;
      }
    );

    return [firstQuestion, ...filteredRemaining];
  }, [questions, wizardAnswers]);

  // Get current question
  const currentQuestion = useMemo(() => {
    if (!visibleQuestions || visibleQuestions.length === 0) {
      return null;
    }

    if (currentStep < 0 || currentStep >= visibleQuestions.length) {
      return visibleQuestions[0];
    }

    return visibleQuestions[currentStep];
  }, [visibleQuestions, currentStep]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useMemo(() => {
    if (!currentQuestion) return false;

    if (currentQuestion.type === 'flight_selector') {
      return Boolean(selectedFlight && selectedFlight.id);
    }

    return wizardAnswers.some((a) => a.questionId === currentQuestion.id);
  }, [currentQuestion, selectedFlight, wizardAnswers]);

  // Handle selection of an answer
  const handleSelect = useCallback(
    (questionId: string, value: string | number | boolean) => {
      console.log('=== Phase4QAWizard - handleSelect ENTRY ===', {
        questionId,
        value,
        wizardType,
        currentStep,
        isCurrentQuestionAnswered,
        travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
        informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
        travelStatusStepValidation: phase4Store.travelStatusStepValidation,
        informedDateStepValidation: phase4Store.informedDateStepValidation,
        travelStatusStepInteraction: phase4Store.travelStatusStepInteraction,
        informedDateStepInteraction: phase4Store.informedDateStepInteraction,
      });

      // Create new answer
      const answer = { questionId, value };

      // Only update the answer in the store, no auto-transition
      phase4Store.setWizardAnswer(answer);

      console.log('=== Phase4QAWizard - handleSelect EXIT ===', {
        currentStep,
        isCurrentQuestionAnswered: wizardAnswers.some(
          (a) => a.questionId === currentQuestion?.id
        ),
        travelStatusShowingSuccess: phase4Store.travelStatusShowingSuccess,
        informedDateShowingSuccess: phase4Store.informedDateShowingSuccess,
        travelStatusStepValidation: phase4Store.travelStatusStepValidation,
        informedDateStepValidation: phase4Store.informedDateStepValidation,
        travelStatusStepInteraction: phase4Store.travelStatusStepInteraction,
        informedDateStepInteraction: phase4Store.informedDateStepInteraction,
      });
    },
    [
      phase4Store,
      wizardType,
      currentStep,
      isCurrentQuestionAnswered,
      currentQuestion,
      wizardAnswers,
    ]
  );

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      const answer = wizardAnswers.find((a) => a.questionId === questionId);
      return answer?.value?.toString() || '';
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

    // Reset state based on wizard type
    if (wizardType === 'travel_status') {
      phase4Store.resetTravelStatusState();
    } else {
      phase4Store.resetInformedDateState();
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
  }, [phase4Store, wizardType]);

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
                initialSelectedFlight={selectedFlight}
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
