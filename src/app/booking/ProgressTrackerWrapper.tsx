'use client';

import React from 'react';
import ProgressTracker from '@/components/booking/ProgressTracker';
import { useAppSelector } from '@/store/hooks';

export function ProgressTrackerWrapper() {
  const { currentStep, progress } = useAppSelector((state) => state.booking);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 w-full bg-transparent pointer-events-none transition-all duration-500 ease-in-out will-change-transform"
      style={{ zIndex: 10 }}
    >
      <div className="container mx-auto pointer-events-auto">
        <ProgressTracker
          currentStep={currentStep}
          progress={progress}
        />
      </div>
    </div>
  );
}