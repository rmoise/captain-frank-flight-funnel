import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';

interface AccordionContextType {
  openAccordions: Set<string>;
  setOpenAccordions: (
    value: Set<string> | ((prev: Set<string>) => Set<string>)
  ) => void;
  autoTransition: (id: string, isValid: boolean) => void;
  activeAccordion: string | null;
  setActiveAccordion: (id: string | null) => void;
}

const AccordionContext = createContext<AccordionContextType>({
  openAccordions: new Set(),
  setOpenAccordions: () => {},
  autoTransition: () => {},
  activeAccordion: null,
  setActiveAccordion: () => {},
});

export const useAccordion = () => useContext(AccordionContext);

export const AccordionProvider: React.FC<{
  children: React.ReactNode;
  initialActiveAccordion?: string | null;
  onAutoTransition?: (currentStepId: string) => string | null;
}> = ({ children, initialActiveAccordion = null, onAutoTransition }) => {
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(initialActiveAccordion ? [initialActiveAccordion] : [])
  );
  const [activeAccordion, setActiveAccordion] = useState<string | null>(
    initialActiveAccordion
  );

  // Check for navigation to phase 3 flag
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const navigatingToPhase3 = localStorage.getItem('navigating_to_phase3') === 'true';
      if (navigatingToPhase3) {
        console.log('=== AccordionProvider - Detected Navigation to Phase 3 ===', {
          timestamp: new Date().toISOString()
        });

        // Ensure the first accordion is open
        setOpenAccordions(new Set(['1']));
        setActiveAccordion('1');
      }
    }
  }, []);

  const autoTransition = useCallback(
    (id: string, isValid: boolean) => {
      if (isValid) {
        setOpenAccordions((prev) => new Set([...prev, id]));
        if (onAutoTransition) {
          const nextStep = onAutoTransition(id);
          if (nextStep) {
            setOpenAccordions((prev) => new Set([...prev, nextStep]));
            setActiveAccordion(nextStep);
          }
        }
      }
    },
    [onAutoTransition]
  );

  const value = useMemo(
    () => ({
      openAccordions,
      setOpenAccordions,
      autoTransition,
      activeAccordion,
      setActiveAccordion,
    }),
    [openAccordions, autoTransition, activeAccordion]
  );

  // Expose context to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__accordionContext = value;
    }
  }, [value]);

  return (
    <AccordionContext.Provider value={value}>
      {children}
    </AccordionContext.Provider>
  );
};
