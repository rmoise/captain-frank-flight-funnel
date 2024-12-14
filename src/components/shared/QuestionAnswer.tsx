import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Question, Answer } from '@/types/wizard';
import { ProgressIndicator } from './ProgressIndicator';
import { QuestionText } from './QuestionText';

interface QuestionAnswerProps {
  questions: Question[];
  currentStep: number;
  direction: number;
  getCurrentAnswer: () => string;
  handleAnswer: (value: string) => void;
  illustration?: string;
  showProgress?: boolean;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  questions,
  currentStep,
  direction,
  getCurrentAnswer,
  handleAnswer,
  illustration,
  showProgress = true,
}) => {
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
            placeholder={question.placeholder || "Type your answer..."}
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
              £
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  return (
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
            <Image
              src={illustration}
              alt="Question illustration"
              className="w-full h-full object-contain"
              width={400}
              height={400}
            />
          </motion.div>
        </div>
      )}

      {/* Question content column */}
      <div className={illustration ? '' : 'md:col-span-2'}>
        {showProgress && (
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={questions.length}
            className="mb-8"
          />
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ x: direction * 200, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -200, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <QuestionText text={questions[currentStep].text} />
            {renderQuestion(questions[currentStep])}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
