'use client';

import React, { useEffect, useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useAppSelector } from '@/store/hooks';
import { useSteps } from '@/context/StepsContext';

interface Phase {
  id: number;
  name: string;
  steps: number[];
}

interface ProgressTrackerProps {
  currentStep: number;
}

const TOTAL_PHASES = 6;

// Define phases and their steps
const PHASES: Phase[] = [
  { id: 1, name: 'Initial Details', steps: [1] },
  { id: 2, name: 'Flight Details', steps: [2] },
  { id: 3, name: 'Personal Info', steps: [3] },
  { id: 4, name: 'Documentation', steps: [] },
  { id: 5, name: 'Review', steps: [] },
  { id: 6, name: 'Complete', steps: [] },
];

export default function ProgressTracker({ currentStep }: ProgressTrackerProps) {
  const { completedSteps } = useAppSelector((state) => state.booking);
  const { availableSteps } = useSteps();
  const totalSteps = availableSteps.length;
  const [isExpanded, setIsExpanded] = useState(true);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  // Handle scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = (window.scrollY / totalHeight) * 100;
      setScrollProgress(Math.min(progress, 100));
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Find current phase based on current step
  const getCurrentPhase = () => {
    const phase = PHASES.find((phase) => phase.steps.includes(currentStep));
    return phase ? phase.id : 1;
  };

  // Calculate phase-based progress (for display)
  const calculatePhaseProgress = () => {
    const currentPhase = getCurrentPhase();
    const progressPerPhase = 100 / TOTAL_PHASES;

    // Calculate completed phases progress
    const completedPhasesProgress = (currentPhase - 1) * progressPerPhase;

    // Calculate current phase progress based on completed steps
    const currentPhaseSteps = PHASES[currentPhase - 1].steps;
    const completedStepsInPhase = currentPhaseSteps.filter((step) =>
      completedSteps.includes(step)
    );
    const stepProgress =
      currentPhaseSteps.length > 0
        ? (completedStepsInPhase.length / currentPhaseSteps.length) *
          progressPerPhase
        : 0;

    // Add partial progress for current step if it's not completed
    const currentStepProgress =
      !completedSteps.includes(currentStep) &&
      currentPhaseSteps.includes(currentStep)
        ? (progressPerPhase / currentPhaseSteps.length) * 0.5
        : 0;

    return Math.min(
      completedPhasesProgress + stepProgress + currentStepProgress,
      100
    );
  };

  const phaseProgress = calculatePhaseProgress();
  const currentPhase = getCurrentPhase();

  const getStepStatus = (stepNumber: number) => {
    // If we're past this step and it's not completed
    if (
      scrollProgress >= (stepNumber / totalSteps) * 100 &&
      !completedSteps.includes(stepNumber)
    ) {
      return 'error';
    }
    // If the step is completed
    if (completedSteps.includes(stepNumber)) {
      return 'completed';
    }
    // If this is the current visible step
    if (Math.ceil(scrollProgress / (100 / totalSteps)) === stepNumber) {
      return 'active';
    }
    // If we haven't reached this step yet
    return 'pending';
  };

  const getStepPosition = (stepNumber: number) => {
    const totalSteps = availableSteps.length;
    if (totalSteps === 1) return '50%';
    if (stepNumber === 1) return '0';
    if (stepNumber === totalSteps) return '100%';

    const spacing = 100 / (totalSteps - 1);
    return `${(stepNumber - 1) * spacing}%`;
  };

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="fixed bottom-[88px] right-4 z-20 bg-white rounded-full w-10 h-10 shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
        aria-label={isExpanded ? 'Hide progress' : 'Show progress'}
      >
        {isExpanded ? (
          <ChevronDownIcon className="w-6 h-6 text-gray-600" />
        ) : (
          <ChevronUpIcon className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {/* Main progress tracker */}
      {isExpanded ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-10">
          <div className="max-w-[644px] mx-auto px-4 py-4">
            {/* Progress percentage and steps */}
            <div className="flex justify-between items-center mb-4 px-5">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {Math.round(phaseProgress)}%
                </div>
                <div className="text-sm text-gray-500">
                  Phase {currentPhase} of {TOTAL_PHASES} -{' '}
                  {PHASES[currentPhase - 1].name}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {completedSteps.length} steps completed
              </div>
            </div>

            {/* Progress bar and steps */}
            <div className="relative px-5">
              {/* Main progress bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F54538] via-[#FF8669] to-[#FFB49A] rounded-full transition-all duration-150 ease-out"
                  style={{
                    width: `${scrollProgress}%`,
                    transform: 'translateZ(0)',
                    willChange: 'width',
                  }}
                />
              </div>

              {/* Step indicators */}
              <div className="absolute inset-0 flex">
                {availableSteps.map((_, index) => {
                  const stepNumber = index + 1;
                  const status = getStepStatus(stepNumber);
                  const isCurrentStep =
                    Math.ceil(scrollProgress / (100 / totalSteps)) === stepNumber;

                  return (
                    <div
                      key={stepNumber}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: getStepPosition(stepNumber),
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300
                          ${
                            status === 'completed'
                              ? 'bg-[#22C55E] text-white scale-100'
                              : status === 'error'
                              ? 'bg-red-500 text-white scale-100'
                              : status === 'active'
                              ? 'bg-white border-2 border-[#F54538] text-[#F54538] scale-110'
                              : 'bg-white border border-gray-300 text-gray-400 scale-90'
                          }`}
                      >
                        {status === 'completed' && (
                          <CheckIcon className="w-3 h-3" />
                        )}
                        {status === 'error' && (
                          <XMarkIcon className="w-3 h-3" />
                        )}
                        {status === 'active' && (
                          <div className="w-1.5 h-1.5 bg-[#F54538] rounded-full" />
                        )}
                        {status === 'pending' && (
                          <span className="text-[10px]">{stepNumber}</span>
                        )}
                      </div>
                      {isCurrentStep && (
                        <div className="mt-0.5 text-xs font-medium text-[#F54538] whitespace-nowrap">
                          Step {stepNumber}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Minimal progress bar - shown when main progress bar is hidden */
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <div className="h-1.5 w-full bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-[#F54538] via-[#FF8669] to-[#FFB49A] transition-all duration-150 ease-out"
              style={{
                width: `${scrollProgress}%`,
                transform: 'translateZ(0)',
                willChange: 'width',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
