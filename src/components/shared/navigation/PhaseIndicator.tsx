"use client";

import React from "react";
import useStore from "@/store";
import { CheckIcon } from "@heroicons/react/24/solid";
import { ValidationPhase } from "@/types/shared/validation";

interface Phase {
  id: ValidationPhase;
  name: string;
  description?: string;
}

interface PhaseIndicatorProps {
  phases: Phase[];
  onPhaseClick?: (phase: ValidationPhase) => void;
}

export const PhaseIndicator: React.FC<PhaseIndicatorProps> = ({
  phases,
  onPhaseClick,
}) => {
  const { currentPhase, completedPhases } = useStore(
    (state) => state.navigation
  );

  const handlePhaseClick = (phaseId: ValidationPhase) => {
    if (!onPhaseClick) return;

    // Don't allow clicking on phases that are beyond the current phase
    const currentPhaseValue =
      Object.values(ValidationPhase).indexOf(currentPhase);
    const clickedPhaseValue = Object.values(ValidationPhase).indexOf(phaseId);

    if (clickedPhaseValue > currentPhaseValue) return;

    onPhaseClick(phaseId);
  };

  return (
    <div className="py-4">
      <div className="flex items-center justify-between">
        {phases.map((phase, index) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === phase.id;

          // Check if phase is clickable (not beyond current phase)
          const currentPhaseValue =
            Object.values(ValidationPhase).indexOf(currentPhase);
          const thisPhaseValue = Object.values(ValidationPhase).indexOf(
            phase.id
          );
          const isClickable = thisPhaseValue <= currentPhaseValue;

          return (
            <React.Fragment key={phase.id}>
              {index > 0 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    isCompleted ? "bg-primary-600" : "bg-gray-200"
                  }`}
                />
              )}
              <button
                onClick={() => handlePhaseClick(phase.id)}
                disabled={!isClickable}
                aria-label={`Go to ${phase.name} phase`}
                className={`relative flex flex-col items-center group ${
                  !isClickable ? "cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isCompleted
                      ? "bg-primary-600 border-primary-600"
                      : isCurrent
                      ? "border-primary-600 bg-white"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-6 h-6 text-white" />
                  ) : (
                    <span
                      className={`text-sm font-medium ${
                        isCurrent ? "text-primary-600" : "text-gray-500"
                      }`}
                    >
                      {thisPhaseValue + 1}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-center">
                  <div
                    className={`text-sm font-medium ${
                      isCompleted || isCurrent
                        ? "text-primary-600"
                        : "text-gray-500"
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
