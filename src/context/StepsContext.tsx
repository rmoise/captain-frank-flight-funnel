'use client';

import React, { createContext, useContext, useState } from 'react';
import { useAppSelector } from '@/store/hooks';

interface StepsContextType {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ id: number; title: string }>;
}

const StepsContext = createContext<StepsContextType | undefined>(undefined);

const INITIAL_STEPS = [
  { id: 1, title: 'Flight Details' },
  { id: 2, title: 'Flight Issues' },
  { id: 3, title: 'Personal Details' },
];

export function StepsProvider({ children }: { children: React.ReactNode }) {
  const { currentStep } = useAppSelector((state) => state.booking);
  const [steps] = useState(INITIAL_STEPS);

  return (
    <StepsContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        steps,
      }}
    >
      {children}
    </StepsContext.Provider>
  );
}

export function useSteps() {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error('useSteps must be used within a StepsProvider');
  }
  return context;
}
