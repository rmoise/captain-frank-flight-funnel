import React from 'react';
import { useFunnel } from '@/context/FunnelContext';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const phases = [
  { id: 'initial', label: 'Basic Info' },
  { id: 'qualification', label: 'Qualification' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'review', label: 'Review' },
];

export const FunnelProgress: React.FC = () => {
  const { state } = useFunnel();
  const currentPhaseIndex = phases.findIndex(phase => phase.id === state.currentPhase);

  return (
    <div className="w-full max-w-4xl mx-auto mb-8">
      <div className="relative">
        {/* Progress bar */}
        <div className="h-1 bg-gray-200 absolute w-full top-1/2 -translate-y-1/2" />
        <div
          className="h-1 bg-red-500 absolute transition-all duration-500 top-1/2 -translate-y-1/2"
          style={{
            width: `${(currentPhaseIndex / (phases.length - 1)) * 100}%`,
          }}
        />

        {/* Phase indicators */}
        <div className="relative z-10 flex justify-between">
          {phases.map((phase, index) => {
            const isComplete = index <= currentPhaseIndex;
            const isCurrent = index === currentPhaseIndex;

            return (
              <div
                key={phase.id}
                className="flex flex-col items-center"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center
                    ${isComplete ? 'bg-red-500' : 'bg-gray-200'}
                    ${isCurrent ? 'ring-2 ring-red-500 ring-offset-2' : ''}
                  `}
                >
                  {isComplete ? (
                    <CheckCircleIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span className="text-gray-600">{index + 1}</span>
                  )}
                </div>
                <span className="mt-2 text-sm font-medium text-gray-600">
                  {phase.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};