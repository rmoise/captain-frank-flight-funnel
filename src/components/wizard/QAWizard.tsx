'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import type { Answer } from '@/types/wizard';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useSteps } from '@/context/StepsContext';
import { useBookingContext } from '@/context/BookingContext';
import { useFunnel } from '@/context/FunnelContext';
import { QuestionAnswer } from '../shared/QuestionAnswer';
import { PageHeader } from '../shared/PageHeader';

interface Question {
  id: string;
  text: string;
  type: 'radio' | 'text' | 'select' | 'number';
  options?: Array<{
    id: string;
    label: string;
    value: string;
    externalLink?: string;
  }>;
  showIf?: (answers: Answer[]) => boolean;
  placeholder?: string;
  min?: number;
}

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
  const { dispatch: bookingDispatch } = useBookingContext();
  const { dispatch: funnelDispatch } = useFunnel();
  const { registerStep, unregisterStep } = useSteps();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const [direction, setDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    registerStep('QAWizard', 2);
    return () => {
      unregisterStep('QAWizard');
    };
  }, [registerStep, unregisterStep]);

  const activeQuestions = questions.filter(
    (question) => !question.showIf || question.showIf(answers)
  );

  const handleInteraction = () => {
    if (!hasInteracted) {
      setHasInteracted(true);
      onInteract?.();
    }
  };

  const handleAnswer = (value: string) => {
    handleInteraction();
    const currentQuestion = activeQuestions[currentStep];
    const selectedOption = currentQuestion.options?.find(
      (opt) => opt.value === value
    );

    if (selectedOption?.externalLink) {
      window.location.href = selectedOption.externalLink;
      return;
    }

    const existingAnswerIndex = answers.findIndex(
      (a) => a.questionId === currentQuestion.id
    );

    let newAnswers: Answer[];
    if (existingAnswerIndex >= 0) {
      newAnswers = answers.map((answer, index) =>
        index === existingAnswerIndex ? { ...answer, value } : answer
      );
    } else {
      newAnswers = [
        ...answers,
        {
          questionId: currentQuestion.id,
          value,
        },
      ];
    }

    const filteredAnswers = newAnswers.filter((answer) => {
      const question = questions.find((q) => q.id === answer.questionId);
      return !question?.showIf || question.showIf([...newAnswers]);
    });

    setAnswers(filteredAnswers);
  };

  const getCurrentAnswer = () => {
    return (
      answers.find((a) => a.questionId === activeQuestions[currentStep].id)
        ?.value || ''
    );
  };

  const goToNext = () => {
    if (currentStep < activeQuestions.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
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
    setSuccessMessage(
      showSuccessMessage ? 'Yay, you have a good chance of claiming it.' : ''
    );
    setIsCompleted(true);
    onComplete(answers);
  };

  const isPathComplete = () => {
    const requiredQuestions = questions.filter(
      (q) => !q.showIf || q.showIf(answers)
    );
    return requiredQuestions.every((question) =>
      answers.some(
        (answer) => answer.questionId === question.id && answer.value
      )
    );
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
            onClick={() => setIsCompleted(false)}
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
      <QuestionAnswer
        questions={activeQuestions}
        currentStep={currentStep}
        direction={direction}
        getCurrentAnswer={getCurrentAnswer}
        handleAnswer={handleAnswer}
        illustration={illustration}
      />

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        <button
          onClick={goToPrevious}
          disabled={currentStep === 0}
          className={`px-6 py-2 rounded-lg transition-colors
            ${
              currentStep === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
        >
          Previous
        </button>
        <button
          onClick={
            currentStep === activeQuestions.length - 1 && isPathComplete()
              ? handleComplete
              : goToNext
          }
          disabled={!getCurrentAnswer()}
          className={`px-8 py-3 text-lg rounded-lg transition-colors
            ${
              !getCurrentAnswer()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#374151] hover:bg-[#4B5563] text-white'
            }`}
        >
          {currentStep === activeQuestions.length - 1 && isPathComplete()
            ? 'Complete'
            : 'Next'}
        </button>
      </div>
    </section>
  );
};
