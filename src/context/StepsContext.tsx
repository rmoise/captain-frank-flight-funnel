'use client';

import React, { createContext, useContext, useState } from 'react';

interface StepsContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  setTotalSteps: (total: number) => void;
}

const StepsContext = createContext<StepsContextType>({
  currentStep: 1,
  setCurrentStep: () => {},
  totalSteps: 1,
  setTotalSteps: () => {},
});

export const StepsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);

  return (
    <StepsContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        totalSteps,
        setTotalSteps,
      }}
    >
      {children}
    </StepsContext.Provider>
  );
};

export const useSteps = () => {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error('useSteps must be used within a StepsProvider');
  }
  return context;
};
