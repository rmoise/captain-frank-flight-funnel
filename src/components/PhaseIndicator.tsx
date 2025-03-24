'use client';

import React from 'react';
import useStore from '@/lib/state/store';
import { CheckIcon } from '@heroicons/react/24/solid';

interface Phase {
  id: number;
  name: string;
  description?: string;
}

interface PhaseIndicatorProps {
  phases: Phase[];
  onPhaseClick?: (phase: number) => void;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  phases,
  onPhaseClick,
}) => {
  const { currentPhase, completedPhases } = useStore();

  const handlePhaseClick = (phaseId: number) => {
    if (!onPhaseClick || phaseId > currentPhase) return;
    onPhaseClick(phaseId);
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === phase.id;
          const isClickable = phase.id <= currentPhase;

          return (
            <React.Fragment key={phase.id}>
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                />
              )}
              <button
                onClick={() => handlePhaseClick(phase.id)}
                disabled={!isClickable}
                className={`relative flex flex-col items-center group ${
                  !isClickable ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isCompleted
                      ? 'bg-primary-600 border-primary-600'
                      : isCurrent
                        ? 'border-primary-600 bg-white'
                        : 'border-gray-300 bg-white'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? 'text-primary-600' : 'text-gray-500'
                      }`}
                    >
                      {phase.id}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent
                        ? 'text-primary-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {phase.name}
                  </div>
                  {phase.description && (
                    <div className="text-xs text-gray-500 mt-1">
                      {phase.description}
                    </div>
                  )}
                </div>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
