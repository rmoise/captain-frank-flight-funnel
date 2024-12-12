import React, { useState } from 'react';
import { useBookingContext } from '@/context/BookingContext';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import type { Question, Answer } from '@/types/experience';

interface ExperienceCardProps {
  title: string;
  question: string;
  icon: string;
  options: Array<{
    id: string;
    label: string;
  }>;
  selectedOption: string | null | undefined;
  onOptionSelect: (optionId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
  isFocused: boolean;
  anyCardSelected: boolean;
  questions?: Question[];
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  title,
  question,
  icon,
  options,
  selectedOption,
  onOptionSelect,
  isExpanded,
  onToggle,
  isFocused,
  anyCardSelected,
  questions = [],
}) => {
  const { dispatch } = useBookingContext();
  const baseId = options[0].id.split('_')[0];
  const isSelected = selectedOption ? selectedOption.startsWith(baseId) : false;

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const activeQuestions = questions.filter(
    question => !question.showIf || question.showIf(answers)
  );

  const handleAnswer = (value: string) => {
    const currentQuestion = activeQuestions[currentStep];
    const selectedOption = currentQuestion.options?.find(opt => opt.value === value);

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
      const filteredAnswers = newAnswers.filter(answer => {
        const question = questions.find(q => q.id === answer.questionId);
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
    const currentQuestion = activeQuestions[currentStep];
    return answers.find((a) => a.questionId === currentQuestion?.id)?.value || '';
  };

  const goToNext = () => {
    if (currentStep < activeQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isPathComplete = () => {
    const requiredQuestions = questions.filter(q => !q.showIf || q.showIf(answers));
    return requiredQuestions.every(question =>
      answers.some(answer => answer.questionId === question.id && answer.value)
    );
  };

  const handleComplete = () => {
    const delayAnswer = answers.find(a => a.questionId === 'delay_duration')?.value;
    const cancellationAnswer = answers.find(a => a.questionId === 'cancellation_notice')?.value;

    const isLongDelay = delayAnswer === '>3';
    const isEligibleCancellation = cancellationAnswer === 'none' || cancellationAnswer === '0-7';

    const showSuccessMessage = isLongDelay || isEligibleCancellation;

    setSuccessMessage(showSuccessMessage ? '🎉 Yay, you have a good chance of claiming it.' : '');
    setIsCompleted(true);
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleAnswer(option.value);
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={getCurrentAnswer() === option.value}
                  onChange={() => {}}
                  className="h-4 w-4 text-blue-600"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'number':
        return (
          <div className="relative">
            <input
              type="number"
              value={getCurrentAnswer()}
              onChange={(e) => handleAnswer(e.target.value)}
              className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={question.placeholder}
              min={question.min}
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
              €
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  if (isCompleted) {
    return (
      <div className="w-full experience-card">
        <div className="w-full relative bg-[#eceef1] rounded-[10px] p-6">
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
              <CheckCircleIcon className="w-20 h-20 text-green-500" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-2xl font-semibold text-gray-900"
            >
              Thank you for your responses!
            </motion.h2>
            {successMessage && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-lg text-gray-900 font-medium text-center"
              >
                {successMessage}
              </motion.p>
            )}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => setIsCompleted(false)}
              className="mt-4 px-6 py-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              ← Go Back
            </motion.button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full experience-card">
      <div
        className={`w-full relative bg-[#eceef1] rounded-[10px] cursor-pointer overflow-hidden transition-all duration-300 ease-out
          ${
            isFocused
              ? 'border-2 border-black'
              : 'border border-[#d5d6da] hover:border-2 hover:border-gray-300'
          }
          ${
            anyCardSelected
              ? (isSelected || isExpanded)
                ? 'opacity-100'
                : 'opacity-50'
              : 'opacity-100'
          }`}
        style={{
          height: isExpanded ? 'auto' : '280px',
          minHeight: '280px',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
      >
        {/* Title Container */}
        <div className="absolute left-[16px] right-[16px] top-[16px]">
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                if (selectedOption) {
                  onOptionSelect(''); // Clear selection
                  dispatch({ type: 'SET_EXPERIENCE', payload: null });
                  dispatch({ type: 'UNCOMPLETE_STEP', payload: 2 });
                }
              }}
            >
              <div
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  isSelected
                    ? 'border-brand-red bg-brand-red'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M10 3L4.5 8.5L2 6"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>
            </div>
            <div className="text-[#121212] text-xl font-bold">{title}</div>
          </div>
        </div>

        {/* Questions Container */}
        {isExpanded && activeQuestions.length > 0 && (
          <div className="px-6 pt-20 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {activeQuestions[currentStep].text}
                </h3>
                {renderQuestion(activeQuestions[currentStep])}

                {/* Navigation buttons */}
                <div className="flex justify-between mt-6">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goToPrevious();
                    }}
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
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentStep === activeQuestions.length - 1 && isPathComplete()) {
                        handleComplete();
                      } else {
                        goToNext();
                      }
                    }}
                    disabled={!getCurrentAnswer()}
                    className={`px-6 py-2 rounded-lg transition-colors
                      ${
                        !getCurrentAnswer()
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                  >
                    {currentStep === activeQuestions.length - 1 && isPathComplete() ? 'Complete' : 'Next'}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {/* Illustration */}
        {!isExpanded && (
          <div
            className={`w-[200px] h-[120px] lg:w-[240px] lg:h-[140px] absolute left-1/2 -translate-x-1/2 top-[100px] lg:top-[80px]
              transition-all duration-300 ease-out z-10`}
          >
            <img
              loading="lazy"
              src={icon}
              alt={`${title} illustration`}
              className="w-full h-full object-contain"
            />
          </div>
        )}
      </div>
    </div>
  );
};
