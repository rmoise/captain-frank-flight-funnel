'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '@/lib/state/store';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { PHASES } from '@/constants/phases';

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

interface Step {
  id: number;
  title: string;
}

const PERCENT_PER_PHASE = 100 / PHASES.length;

export const ProgressTracker = ({ phaseData }: ProgressTrackerProps) => {
  const {
    completedSteps,
    wizardAnswers,
    personalDetails,
    currentPhase,
    completedPhases,
    setCurrentPhase,
  } = useStore();

  const [isClient, setIsClient] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    setIsClient(true);
    const savedState = localStorage.getItem('progressTracker_expanded');
    if (savedState !== null) {
      setIsExpanded(savedState === 'true');
    }
  }, []);

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber === currentPhase) {
      return 'current';
    }

    if (completedSteps.includes(stepNumber)) {
      return 'completed';
    }

    if (stepNumber === 3) {
      if (personalDetails) {
        const hasValidEmail =
          personalDetails.email &&
          /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
            personalDetails.email
          );
        const hasRequiredFields =
          personalDetails.firstName?.trim() &&
          personalDetails.lastName?.trim() &&
          hasValidEmail;
        if (!hasRequiredFields) {
          return 'incomplete';
        }
      } else {
        return 'incomplete';
      }
    }

    if (
      stepNumber === 2 &&
      Object.keys(wizardAnswers).length > 0 &&
      !completedSteps.includes(2)
    ) {
      return 'incomplete';
    }

    if (stepNumber < currentPhase) {
      return 'incomplete';
    }

    return 'pending';
  };

  const renderStepIcon = (step: Step, status: string) => {
    if (status === 'completed') {
      return <CheckIcon className="w-2.5 h-2.5" />;
    }
    if (status === 'incomplete') {
      return <XMarkIcon className="w-2.5 h-2.5" />;
    }
    if (status === 'current') {
      return <div className="w-1.5 h-1.5 bg-[#F54538] rounded-full" />;
    }
    return null;
  };

  const getStepClassName = (step: Step, status: string) => {
    const baseClass =
      'w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer hover:scale-125';

    if (status === 'completed') {
      return `${baseClass} bg-[#22C55E] text-white scale-110`;
    }
    if (status === 'current') {
      return `${baseClass} bg-white border-2 border-[#F54538] scale-110`;
    }
    if (status === 'incomplete') {
      return `${baseClass} bg-[#F54538] text-white scale-100`;
    }
    return `${baseClass} bg-white border border-gray-300 scale-90`;
  };

  const calculateTotalProgress = useCallback(() => {
    if (phaseData.currentPhase === 6) {
      return 100;
    }

    const steps = Array.isArray(completedSteps) ? completedSteps : [];
    const completedPhasesProgress =
      (completedPhases?.length || 0) * PERCENT_PER_PHASE;
    const currentPhaseStepProgress =
      (steps.length / phaseData.totalStepsInPhase) * PERCENT_PER_PHASE;

    return (
      completedPhasesProgress +
      (phaseData.currentPhase > (completedPhases?.length || 0)
        ? currentPhaseStepProgress
        : 0)
    );
  }, [
    completedPhases?.length,
    completedSteps,
    phaseData.totalStepsInPhase,
    phaseData.currentPhase,
  ]);

  useEffect(() => {
    if (isClient) {
      setProgress(calculateTotalProgress());
    }
  }, [isClient, calculateTotalProgress]);

  useEffect(() => {
    if (isClient) {
      localStorage.setItem('progressTracker_expanded', isExpanded.toString());
    }
  }, [isExpanded, isClient]);

  const handleExpandClick = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleStepClick = useCallback(
    (stepId: number) => {
      if (!isClient) return;

      setCurrentPhase(stepId);

      const stepElement = document.querySelector(`[data-step="${stepId}"]`);
      if (stepElement) {
        const accordionContent = stepElement.querySelector(
          '[style*="height: auto"]'
        );
        if (!accordionContent) {
          const accordionHeader = stepElement.querySelector(
            '.w-full.flex.items-start.justify-between.cursor-pointer'
          );
          if (accordionHeader instanceof HTMLElement) {
            accordionHeader.click();
            setTimeout(() => {
              const windowHeight = window.innerHeight;
              const cardHeight = stepElement.getBoundingClientRect().height;
              const scrollPosition =
                stepElement.getBoundingClientRect().top +
                window.pageYOffset -
                (windowHeight - cardHeight) / 2;

              window.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth',
              });
            }, 300);
          }
        } else {
          const windowHeight = window.innerHeight;
          const cardHeight = stepElement.getBoundingClientRect().height;
          const scrollPosition =
            stepElement.getBoundingClientRect().top +
            window.pageYOffset -
            (windowHeight - cardHeight) / 2;

          window.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth',
          });
        }
      }
    },
    [setCurrentPhase, isClient]
  );

  const currentPhaseSteps = useMemo(() => {
    const phase = PHASES.find((p) => p.id === phaseData.currentPhase);
    return phase
      ? phase.steps.map((stepNumber) => ({
          id: stepNumber,
          title: `Step ${stepNumber}`,
        }))
      : [];
  }, [phaseData.currentPhase]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between py-2">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  Phase {phaseData.currentPhase} of {phaseData.totalPhases}
                </p>
                <h2 className="text-lg font-semibold text-gray-900">
                  {phaseData.phaseName}
                </h2>
              </div>
              <button
                onClick={handleExpandClick}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                {isExpanded ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronUpIcon className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
            <div className="mt-2">
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#22C55E] transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {isExpanded && (
          <div className="py-4">
            <div className="space-y-4">
              {currentPhaseSteps.map((step) => {
                const status = getStepStatus(step.id);
                return (
                  <button
                    key={step.id}
                    onClick={() => handleStepClick(step.id)}
                    className="w-full flex items-center space-x-3 py-1"
                  >
                    <div className={getStepClassName(step, status)}>
                      {renderStepIcon(step, status)}
                    </div>
                    <span className="text-sm text-gray-700">{step.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
