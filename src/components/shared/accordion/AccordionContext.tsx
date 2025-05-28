"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface AccordionContextType {
  canToggle: boolean;
  preventToggle: () => void;
  allowToggle: () => void;
  activeStepId: string | null;
  setActiveStepId: (stepId: string | null) => void;
  clearActiveStepId: () => void;
  openAccordions: Set<string>;
  setOpenAccordions: (
    accordions: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  autoTransition: (stepId: string, forceOpen?: boolean) => void;
}

const AccordionContext = createContext<AccordionContextType | undefined>(
  undefined
);

export const AccordionProvider: React.FC<{
  children: React.ReactNode;
  initialActiveStepId?: string | null;
}> = ({ children, initialActiveStepId = null }) => {
  const [canToggle, setCanToggle] = useState(true);
  const [activeStepId, setActiveStepIdState] = useState<string | null>(
    initialActiveStepId
  );
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(initialActiveStepId ? [initialActiveStepId] : [])
  );

  const preventToggle = useCallback(() => setCanToggle(false), []);
  const allowToggle = useCallback(() => setCanToggle(true), []);

  const setActiveStepId = useCallback((stepId: string | null) => {
    console.log("[AccordionContext] Setting active step:", stepId);
    setActiveStepIdState(stepId);
  }, []);

  const clearActiveStepId = useCallback(() => {
    console.log("[AccordionContext] Clearing active step");
    setActiveStepIdState(null);
  }, []);

  const autoTransition = useCallback(
    (stepId: string, forceOpen: boolean = false) => {
      console.log(
        "[AccordionContext] Auto transitioning to step:",
        stepId,
        forceOpen
      );
      if (forceOpen) {
        setOpenAccordions((prev) => new Set([...prev, stepId]));
      }
    },
    []
  );

  const contextValue = {
    canToggle,
    preventToggle,
    allowToggle,
    activeStepId,
    setActiveStepId,
    clearActiveStepId,
    openAccordions,
    setOpenAccordions,
    autoTransition,
  };

  return (
    <AccordionContext.Provider value={contextValue}>
      {children}
    </AccordionContext.Provider>
  );
};

export const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (context === undefined) {
    throw new Error("useAccordion must be used within an AccordionProvider");
  }
  return context;
};
