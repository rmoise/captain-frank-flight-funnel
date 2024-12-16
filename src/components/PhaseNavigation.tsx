import React from 'react';
import { TOTAL_PHASES } from '@/constants/phases';

interface PhaseNavigationProps {
  currentPhase: number;
  completedPhases: number[];
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  currentPhase,
  completedPhases,
}) => {
  const totalPhases = TOTAL_PHASES;

  return (
    <div className="w-full py-4 mt-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-2">
          {Array.from({ length: totalPhases }).map((_, index) => {
            const phaseNumber = index + 1;
            const isCompleted = completedPhases.includes(phaseNumber);
            const isActive = phaseNumber === currentPhase;
            return (
              <div key={index} className="flex-1 relative">
                {/* Progress bar */}
                <div
                  className={`h-2 rounded-full transition-colors duration-300
                    ${isCompleted ? 'bg-[#F54538]' : isActive ? 'bg-[#F54538]' : 'bg-[#FEE2E2]'}`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};