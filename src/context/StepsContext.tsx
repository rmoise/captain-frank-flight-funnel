'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface StepsContextType {
  availableSteps: Array<{ name: string; number: number }>;
  registerStep: (componentName: string, stepNumber: number) => void;
  unregisterStep: (componentName: string) => void;
}

const StepsContext = createContext<StepsContextType | undefined>(undefined);

export function StepsProvider({ children }: { children: React.ReactNode }) {
  const [availableSteps, setAvailableSteps] = useState<Array<{ name: string; number: number }>>([]);

  const registerStep = (componentName: string, stepNumber: number) => {
    setAvailableSteps(prev => {
      if (prev.some(step => step.name === componentName)) return prev;
      return [...prev, { name: componentName, number: stepNumber }]
        .sort((a, b) => a.number - b.number);
    });
  };

  const unregisterStep = (componentName: string) => {
    setAvailableSteps(prev => prev.filter(step => step.name !== componentName));
  };

  return (
    <StepsContext.Provider value={{
      availableSteps,
      registerStep,
      unregisterStep
    }}>
      {children}
    </StepsContext.Provider>
  );
}

export const useSteps = () => {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error('useSteps must be used within a StepsProvider');
  }
  return context;
};