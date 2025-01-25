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
    if (prevWizardTypeRef.current !== wizardType) {
      console.log('Wizard type changed, resetting step:', {
        from: prevWizardTypeRef.current,
        to: wizardType,
      });
      setCurrentStep(0);
      prevWizardTypeRef.current = wizardType;
    }
  }, [wizardType]);

  // Get current answers
  const wizardAnswers = useMemo(() => {
    if (initialAnswers && initialAnswers.length > 0) {
      return initialAnswers;
    }
    return wizardType === 'travel_status'
      ? phase4Store.travelStatusAnswers
      : phase4Store.informedDateAnswers;
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

  // Handle going to next step
  const goToNext = useCallback(() => {
    if (!isCurrentQuestionAnswered) {
      console.log('❌ Current question not answered, cannot proceed');
      return;
    }

    const nextStep = currentStep + 1;
    const isLastStep = nextStep >= visibleQuestions.length;

    if (!isLastStep) {
      setCurrentStep(nextStep);
    } else {
      // Move to success state by setting step past the last question
      setCurrentStep(visibleQuestions.length);

      // Update validation state
      phase4Store.updateValidationState({
        stepValidation: {
          ...phase4Store.stepValidation,
          [wizardType === 'travel_status' ? 2 : 3]: true,
        },
        stepInteraction: {
          ...phase4Store.stepInteraction,
          [wizardType === 'travel_status' ? 2 : 3]: true,
        },
        wizardShowingSuccess: true,
        wizardIsValid: true,
        isWizardValid: true,
        isWizardSubmitted: true,
      });

      // Call onComplete after a delay to allow success message to show
      if (onComplete) {
        window.setTimeout(() => {
          onComplete(wizardAnswers);
        }, 1500);
      }
    }
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

  // Handle selection of an answer
  const handleSelect = useCallback(
    (questionId: string, value: string | number | boolean) => {
      const answer = { questionId, value, visible: true };
      phase4Store.setWizardAnswer(answer);
    },
    [phase4Store]
  );

  // Get current answer for a question
  const getCurrentAnswer = useCallback(
    (questionId: string): string => {
      const answer = wizardAnswers.find((a) => a.questionId === questionId);
      return answer?.value?.toString() || '';
    },
    [wizardAnswers]
  );

  // Handle going back to questions
  const handleBackToQuestions = useCallback(() => {
    setCurrentStep(0);
  }, []);

  // Get success state
  const successState = useMemo(() => {
    const isLastStep = currentStep >= visibleQuestions.length;
    const hasAnswers = wizardAnswers.length > 0;

    if (!isLastStep || !hasAnswers) {
      return { showing: false, message: '' };
    }

    const lastAnswer = wizardAnswers[wizardAnswers.length - 1];
    if (!lastAnswer) return { showing: false, message: '' };

    const question = questions.find((q) => q.id === lastAnswer.questionId);
    const option = question?.options?.find((o) => o.value === lastAnswer.value);

    // Check if this is an alternative flight question
    const isAlternativeFlight =
      question?.id === 'alternative_flight_airline_expense' ||
      question?.id === 'alternative_flight_own_expense';

    // Don't show success for alternative flight questions
    if (isAlternativeFlight) {
      return { showing: false, message: '' };
    }

    return {
      showing: true,
      message: option?.showConfetti
        ? t.wizard.success.goodChance
        : t.wizard.success.answersSaved,
    };
  }, [
    currentStep,
    visibleQuestions.length,
    wizardAnswers,
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
