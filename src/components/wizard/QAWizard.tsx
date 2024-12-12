'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Answer } from '@/types/wizard';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useSteps } from '@/context/StepsContext';
import { useBookingContext } from '@/context/BookingContext';
import { useFunnel } from '@/context/FunnelContext';

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
}

export const QAWizard: React.FC<QAWizardProps> = ({
  questions,
  onComplete,
  initialAnswers = [],
  illustration,
}) => {
  const { dispatch: bookingDispatch } = useBookingContext();
  const { dispatch: funnelDispatch } = useFunnel();
  const { registerStep, unregisterStep } = useSteps();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const [direction, setDirection] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Register step only once on mount
  useEffect(() => {
    registerStep('QAWizard', 2);
    // Mark as incomplete initially
    bookingDispatch({ type: 'UNCOMPLETE_STEP', payload: 2 });
    return () => {
      unregisterStep('QAWizard');
    };
  }, []); // Empty dependency array since we only want this on mount/unmount

  // Handle completion state changes
  useEffect(() => {
    if (isCompleted) {
      bookingDispatch({ type: 'COMPLETE_STEP', payload: 2 });
    } else {
      bookingDispatch({ type: 'UNCOMPLETE_STEP', payload: 2 });
    }
  }, [isCompleted, bookingDispatch]);

  // Filter questions based on current answers
  const activeQuestions = questions.filter(
    (question) => !question.showIf || question.showIf(answers)
  );

  const handleAnswer = (value: string) => {
    const currentQuestion = activeQuestions[currentStep];
    const selectedOption = currentQuestion.options?.find(
      (opt) => opt.value === value
    );

    if (selectedOption?.externalLink) {
      window.location.href = selectedOption.externalLink;
      return;
    }

    const newAnswers = [...answers];
    const existingAnswerIndex = answers.findIndex(
      (a) => a.questionId === currentQuestion.id
    );

    if (existingAnswerIndex >= 0) {
      newAnswers[existingAnswerIndex].value = value;
      const filteredAnswers = newAnswers.filter((answer) => {
        const question = questions.find((q) => q.id === answer.questionId);
        return !question?.showIf || question.showIf(newAnswers);
      });
      setAnswers(filteredAnswers);
    } else {
      newAnswers.push({
        questionId: currentQuestion.id,
        value,
      });
      setAnswers(newAnswers);
    }
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

  const renderQuestion = (question: Question) => {
    switch (question.type) {
      case 'radio':
        return (
          <div className="space-y-4">
            {question.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={getCurrentAnswer() === option.value}
                  onChange={(e) => handleAnswer(e.target.value)}
                  className="h-4 w-4 text-red-500"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'text':
        return (
          <input
            type="text"
            value={getCurrentAnswer()}
            onChange={(e) => handleAnswer(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            placeholder="Type your answer..."
          />
        );

      case 'select':
        return (
          <select
            value={getCurrentAnswer()}
            onChange={(e) => handleAnswer(e.target.value)}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Select an option...</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              value={getCurrentAnswer()}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={question.placeholder}
              min={question.min}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              ��
            </span>
          </div>
        );

      default:
        return null;
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
      showSuccessMessage ? '🎉 Yay, you have a good chance of claiming it.' : ''
    );
    setIsCompleted(true);
    onComplete(answers);
    bookingDispatch({ type: 'COMPLETE_STEP', payload: 2 });

    // Mark the current phase as complete instead of automatically moving to next phase
    funnelDispatch({ type: 'COMPLETE_CURRENT_PHASE' });
  };

  const isPathComplete = () => {
    // Get all questions that should be shown based on current answers
    const requiredQuestions = questions.filter(
      (q) => !q.showIf || q.showIf(answers)
    );

    // Check if all required questions have answers
    return requiredQuestions.every((question) =>
      answers.some(
        (answer) => answer.questionId === question.id && answer.value
      )
    );
  };

  if (isCompleted) {
    return (
      <section data-step="2" className="max-w-6xl mx-auto p-6 pb-24 mb-24">
        {/* Keep the same grid layout as the questions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Illustration column */}
          {illustration && (
            <div className="hidden md:block">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="relative w-full max-w-[400px] aspect-square"
              >
                <img
                  src={illustration}
                  alt="Wizard illustration"
                  className="w-full h-full object-contain"
                />
              </motion.div>
            </div>
          )}

          {/* Success message column */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center justify-center space-y-4"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              {successMessage ? (
                <span className="text-6xl">🎉</span>
              ) : (
                <CheckCircleIcon className="w-20 h-20 text-green-500" />
              )}
            </motion.div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-semibold text-gray-900"
            >
              {successMessage
                ? successMessage
                : 'Thank you for your responses!'}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-gray-600 text-center"
            >
              We're processing your information...
            </motion.p>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={() => setIsCompleted(false)}
              className="mt-4 px-6 py-2 text-red-500 hover:text-red-600 font-medium transition-colors"
            >
              ← Go Back to Questions
            </motion.button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section data-step="2" className="max-w-6xl mx-auto p-6 pb-24 mb-24">
      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        {/* Illustration column */}
        {illustration && (
          <div className="hidden md:block">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="relative w-full max-w-[400px] aspect-square"
            >
              <img
                src={illustration}
                alt="Wizard illustration"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </div>
        )}

        {/* Mobile illustration */}
        {illustration && (
          <div className="md:hidden mb-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="relative aspect-square max-w-[240px] mx-auto"
            >
              <img
                src={illustration}
                alt="Wizard illustration"
                className="w-full h-full object-contain"
              />
            </motion.div>
          </div>
        )}

        {/* Question content column with progress bar */}
        <div className={illustration ? '' : 'md:col-span-2'}>
          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-2 bg-gray-200 rounded-full">
              <div
                className="h-full bg-red-500 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    ((currentStep + 1) / activeQuestions.length) * 100
                  }%`,
                }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600">
              Question {currentStep + 1} of {activeQuestions.length}
            </div>
          </div>

          {/* Question content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: direction * 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction * -200, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-semibold text-gray-900">
                {activeQuestions[currentStep].text}
              </h2>
              {renderQuestion(activeQuestions[currentStep])}
            </motion.div>
          </AnimatePresence>

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
              className={`px-6 py-2 rounded-lg transition-colors
                ${
                  !getCurrentAnswer()
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
            >
              {currentStep === activeQuestions.length - 1 && isPathComplete()
                ? 'Complete'
                : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
