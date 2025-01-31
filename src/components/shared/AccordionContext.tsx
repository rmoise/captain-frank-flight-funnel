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
  setOpenAccordions: (ids: Set<string>) => void;
  autoTransition: (id: string, isValid: boolean) => void;
}

const AccordionContext = createContext<AccordionContextType>({
  openAccordions: new Set(),
  setOpenAccordions: () => {},
  autoTransition: () => {},
});

export const useAccordion = () => useContext(AccordionContext);

export const AccordionProvider: React.FC<{
  children: React.ReactNode;
  initialActiveAccordion?: string | null;
}> = ({ children, initialActiveAccordion = null }) => {
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(initialActiveAccordion ? [initialActiveAccordion] : [])
  );

  const autoTransition = useCallback((id: string, isValid: boolean) => {
    if (isValid) {
      setOpenAccordions((prev) => new Set([...prev, id]));
    }
  }, []);

  const value = useMemo(
    () => ({
      openAccordions,
      setOpenAccordions,
      autoTransition,
    }),
    [openAccordions, autoTransition]
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
