'use client';

import React from 'react';
import useStore from '@/lib/state/store';
import { CheckIcon } from '@heroicons/react/24/solid';
import type { ValidationStep } from '@/lib/state/types';

interface Step {
  id: ValidationStep;
  name: string;
  description?: string;
}

interface ProgressBarProps {
  steps: Step[];
  onStepClick?: (step: ValidationStep) => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  steps,
  onStepClick,
}) => {
  const { currentStep, completedSteps, openSteps } = useStore();

  const handleStepClick = (stepId: ValidationStep) => {
    if (!openSteps.includes(stepId) || !onStepClick) return;
    onStepClick(stepId);
  };

  return (
    <nav aria-label="Progress">
      <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
        {steps.map((step) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = currentStep === step.id;
          const isClickable = openSteps.includes(step.id);

          return (
            <li key={step.id} className="md:flex-1">
              <button
                onClick={() => handleStepClick(step.id)}
                disabled={!isClickable}
                className={`group flex w-full flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pl-0 md:pt-4 md:pb-0 ${
                  isCompleted
                    ? 'border-primary-600'
                    : isCurrent
                      ? 'border-primary-600'
                      : 'border-gray-200'
                } ${!isClickable ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span className="text-sm font-medium">
                  <span
                    className={`${
                      isCompleted || isCurrent
                        ? 'text-primary-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon
                        className="h-5 w-5 text-primary-600"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-300">
                        {step.id}
                      </span>
                    )}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center space-x-2">
                  <span
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent
                        ? 'text-primary-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.name}
                  </span>
                  {step.description && (
                    <span className="text-sm text-gray-500">
                      {step.description}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
