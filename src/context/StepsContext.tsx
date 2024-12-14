'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface StepsContextType {
  availableSteps: Array<{ name: string; number: number }>;
  registerStep: (componentName: string, stepNumber: number) => void;
  unregisterStep: (componentName: string) => void;
}

const StepsContext = createContext<StepsContextType | undefined>(undefined);

export function StepsProvider({ children }: { children: React.ReactNode }) {
  const [availableSteps, setAvailableSteps] = useState<
    Array<{ name: string; number: number }>
  >([]);

  const registerStep = useCallback(
    (componentName: string, stepNumber: number) => {
      setAvailableSteps((prev) => {
        const exists = prev.some((step) => step.name === componentName);
        if (exists) return prev;
        return [...prev, { name: componentName, number: stepNumber }].sort(
          (a, b) => a.number - b.number
        );
      });
    },
    []
  );

  const unregisterStep = useCallback((componentName: string) => {
    setAvailableSteps((prev) =>
      prev.filter((step) => step.name !== componentName)
    );
  }, []);

  const value = React.useMemo(
    () => ({
      availableSteps,
      registerStep,
      unregisterStep,
    }),
    [availableSteps, registerStep, unregisterStep]
  );

  return (
    <StepsContext.Provider value={value}>{children}</StepsContext.Provider>
  );
}

export const useSteps = () => {
  const context = useContext(StepsContext);
  if (!context) {
    throw new Error('useSteps must be used within a StepsProvider');
  }
  return context;
};
