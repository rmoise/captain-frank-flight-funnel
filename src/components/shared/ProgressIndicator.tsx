import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  showStepCount?: boolean;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  showStepCount = true,
  className = '',
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={className}>
      <div className="h-2 bg-gray-200 rounded-full">
        <div
          className="h-full bg-red-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      {showStepCount && (
        <div className="mt-2 text-sm text-gray-600">
          Step {currentStep + 1} of {totalSteps}
        </div>
      )}
    </div>
  );
};
