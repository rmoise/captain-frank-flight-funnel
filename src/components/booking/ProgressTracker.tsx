'use client';

import React from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useAppSelector } from '@/store/hooks';
import { useSteps } from '@/context/StepsContext';

interface ProgressTrackerProps {
  currentStep: number;
  progress?: number;
}

export default function ProgressTracker({ currentStep, progress = 0 }: ProgressTrackerProps) {
  const { completedSteps } = useAppSelector((state) => state.booking);
  const { availableSteps } = useSteps();
  const totalSteps = availableSteps.length;

  const getStepStatus = (stepNumber: number) => {
    // If we're past this step and it's not completed
    if (progress >= (stepNumber / totalSteps) * 100 && !completedSteps.includes(stepNumber)) {
      return 'error';
    }
    // If the step is completed
    if (completedSteps.includes(stepNumber)) {
      return 'completed';
    }
    // If this is the current visible step
    if (Math.ceil(progress / (100 / totalSteps)) === stepNumber) {
      return 'active';
    }
    // If we haven't reached this step yet
    return 'pending';
  };

  const getProgressWidth = () => {
    const baseWidth = 600;
    return `${progress * (baseWidth / 100)}px`;
  };

  const getStepPosition = (stepNumber: number) => {
    if (totalSteps === 1) return '50%';
    if (stepNumber === 1) return '0';
    if (stepNumber === totalSteps) return '100%';

    const spacing = 100 / (totalSteps - 1);
    return `${(stepNumber - 1) * spacing}%`;
  };

  return (
    <div className="w-full max-w-[644px] mx-auto h-[124px] pt-[15px] pb-4 bg-white/80 backdrop-blur-md rounded-lg shadow-lg flex-col justify-start items-start gap-2.5">
      <div className="h-[93px] relative w-full">
        <div className="left-[22px] top-0 absolute flex-col justify-start items-start">
          <div className="justify-center items-center inline-flex">
            <div className="text-center text-brand-gray-muted text-[8px] font-bold font-heebo leading-none tracking-wide">
              Your progress
            </div>
          </div>
          <div className="flex flex-col mt-[2px]">
            <div className="text-center text-brand-gray-text text-base font-bold font-heebo leading-none">
              {Math.round(progress)}% complete
            </div>
          </div>
        </div>

        <div className="px-[22px] py-[5px] left-0 top-[53px] absolute flex-col justify-start items-start gap-2.5 inline-flex w-full">
          <div className="w-full max-w-[600px] h-3 relative">
            <div className="w-full h-3 relative overflow-hidden">
              <div className="w-full h-3 absolute progress-bar progress-bar-bg rounded-[64px]" />
              <div
                className="h-3 absolute progress-bar progress-bar-fill rounded-[64px] transition-all duration-100 ease-out"
                style={{
                  width: getProgressWidth(),
                  transformOrigin: 'left center',
                }}
              />
            </div>

            <div className="absolute inset-0 w-full">
              {availableSteps.map((_, index) => {
                const stepNumber = index + 1;
                const status = getStepStatus(stepNumber);
                const isCurrentStep = Math.ceil(progress / (100 / totalSteps)) === stepNumber;
                const isPastStep = progress >= (stepNumber / totalSteps) * 100;

                return (
                  <div
                    key={stepNumber}
                    className="absolute flex-col justify-start items-center gap-2 inline-flex"
                    style={{
                      left: getStepPosition(stepNumber),
                      top: '50%',
                      transform: 'translate(-50%, -25%)',
                      width: '60px',
                    }}
                  >
                    <div
                      className={`w-5 h-5 rounded-[64px] flex items-center justify-center transition-all duration-300
                        ${
                          status === 'completed'
                            ? 'bg-brand-green'
                            : status === 'error'
                            ? 'bg-red-500'
                            : status === 'active'
                            ? 'bg-white border-2 border-brand-green'
                            : 'bg-white border border-[#c6c6c6]'
                        }
                      `}
                    >
                      {status === 'completed' && (
                        <CheckIcon className="w-3 h-3 text-white" />
                      )}
                      {status === 'error' && (
                        <XMarkIcon className="w-3 h-3 text-white" />
                      )}
                      {status === 'active' && (
                        <div className="w-1 h-1 bg-brand-green rounded-full" />
                      )}
                    </div>
                    <div
                      className={`text-center text-[10px] font-medium font-heebo leading-none tracking-wide mt-2
                        ${isCurrentStep ? 'text-brand-green' : 'text-brand-gray-step'}
                      `}
                    >
                      Step {stepNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
