'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { PHASES } from '@/constants/phases';
import { setStep } from '@/store/bookingSlice';

interface ProgressTrackerProps {
  phaseData: {
    currentPhase: number;
    totalPhases: number;
    phaseName: string;
    completedSteps: number[];
    totalStepsInPhase: number;
    phaseProgress: number;
    stepInPhase: number;
  };
}

const STEPS = [
  { id: 1, title: 'Flight Details' },
  { id: 2, title: 'Flight Issues' },
  { id: 3, title: 'Personal Details' }
];

const PERCENT_PER_PHASE = 100 / PHASES.length; // ≈ 16.67% per phase

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  phaseData,
}) => {
  const dispatch = useAppDispatch();
  const {
    completedSteps = [],
    wizardAnswers = [],
    personalDetails,
    currentStep,
    completedPhases = []
  } = useAppSelector((state) => state.booking);

  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem('progressTracker_expanded');
      return savedState === null ? true : savedState === 'true';
    }
    return true;
  });

  // Save expanded state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('progressTracker_expanded', isExpanded.toString());
    }
  }, [isExpanded]);

  const getStepStatus = (stepNumber: number) => {
    // First check if this is the current step
    if (stepNumber === currentStep) {
      return 'current';
    }

    // Then check if it's completed
    if (completedSteps.includes(stepNumber)) {
      return 'completed';
    }

    // Check for incomplete states
    if (stepNumber === 2 && wizardAnswers.length > 0 && !completedSteps.includes(2)) {
      return 'incomplete';
    }

    if (stepNumber === 3 && personalDetails && !completedSteps.includes(3)) {
      return 'incomplete';
    }

    // If step is before current step and not completed, mark as incomplete
    if (stepNumber < currentStep) {
      return 'incomplete';
    }

    return 'pending';
  };

  // Calculate total progress based on completed phases and current phase progress
  const calculateTotalProgress = () => {
    // Calculate progress from fully completed phases
    const completedPhasesProgress = completedPhases.length * PERCENT_PER_PHASE;

    // Calculate progress from current phase
    const currentPhaseStepProgress = (completedSteps.length / phaseData.totalStepsInPhase) * PERCENT_PER_PHASE;

    // Total progress is the sum of completed phases plus current phase progress
    return completedPhasesProgress + (phaseData.currentPhase > completedPhases.length ? currentPhaseStepProgress : 0);
  };

  const totalProgress = calculateTotalProgress();

  const handleStepClick = useCallback((stepId: number) => {
    dispatch(setStep(stepId));

    // Find the step element
    const stepElement = document.querySelector(`[data-step="${stepId}"]`);
    if (stepElement) {
      // Find the accordion header and check if it's expanded
      const accordionContent = stepElement.querySelector('[style*="height: auto"]');
      if (!accordionContent) {
        // Only click to open if it's not already expanded
        const accordionHeader = stepElement.querySelector('.w-full.flex.items-start.justify-between.cursor-pointer');
        if (accordionHeader instanceof HTMLElement) {
          accordionHeader.click();
          // Wait for accordion animation to complete before scrolling
          setTimeout(() => {
            const windowHeight = window.innerHeight;
            const cardHeight = stepElement.getBoundingClientRect().height;
            const scrollPosition =
              stepElement.getBoundingClientRect().top +
              window.pageYOffset -
              ((windowHeight - cardHeight) / 2);

            window.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: 'smooth'
            });
          }, 300); // Match the accordion animation duration
        }
      } else {
        // If already expanded, just scroll
        const windowHeight = window.innerHeight;
        const cardHeight = stepElement.getBoundingClientRect().height;
        const scrollPosition =
          stepElement.getBoundingClientRect().top +
          window.pageYOffset -
          ((windowHeight - cardHeight) / 2);

        window.scrollTo({
          top: Math.max(0, scrollPosition),
          behavior: 'smooth'
        });
      }
    }
  }, [dispatch]);

  return (
    <>
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

      {isExpanded ? (
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg z-10">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="text-sm font-medium text-gray-900">
                  {Math.round(totalProgress)}%
                </div>
                <div className="text-sm text-gray-500">
                  Phase {phaseData.currentPhase} of {phaseData.totalPhases} -{' '}
                  {phaseData.phaseName}
                </div>
              </div>
              <div className="text-sm text-gray-500">
                {completedSteps.length} of {STEPS.length} steps completed
              </div>
            </div>

            <div className="relative">
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F54538] via-[#FF8669] to-[#FFB49A] transition-all duration-300 ease-out"
                  style={{ width: `${totalProgress}%` }}
                />
              </div>

              <div className="absolute top-0 left-0 right-0 -mt-1">
                <div className="flex justify-between">
                  {STEPS.map((step) => {
                    const status = getStepStatus(step.id);
                    return (
                      <button
                        key={step.id}
                        onClick={() => handleStepClick(step.id)}
                        className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-125 ${
                          status === 'completed'
                            ? 'bg-[#22C55E] text-white scale-110'
                            : status === 'current'
                            ? 'bg-white border-2 border-[#F54538] scale-110'
                            : status === 'incomplete'
                            ? 'bg-[#F54538] text-white scale-100'
                            : 'bg-white border border-gray-300 scale-90'
                        }`}
                      >
                        {status === 'completed' && (
                          <CheckIcon className="w-2.5 h-2.5" />
                        )}
                        {status === 'incomplete' && (
                          <XMarkIcon className="w-2.5 h-2.5" />
                        )}
                        {status === 'current' && (
                          <div className="w-1.5 h-1.5 bg-[#F54538] rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-2">
              Step {currentStep} of {STEPS.length}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 z-10">
          <div className="h-1.5 w-full bg-gray-100">
            <div
              className="h-full bg-gradient-to-r from-[#F54538] via-[#FF8669] to-[#FFB49A] transition-all duration-300 ease-out"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>
      )}
    </>
  );
};
