import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react';

interface AccordionContextType {
  activeAccordion: string | null;
  setActiveAccordion: (id: string | null) => void;
  autoTransition: (id: string, isValid: boolean, isQA?: boolean) => void;
  isManualTransition: boolean;
}

const AccordionContext = createContext<AccordionContextType>({
  activeAccordion: null,
  setActiveAccordion: () => {},
  autoTransition: () => {},
  isManualTransition: false,
});

export const useAccordion = () => useContext(AccordionContext);

export const AccordionProvider: React.FC<{
  children: React.ReactNode;
  onAutoTransition?: (nextId: string) => string | null;
  initialActiveAccordion?: string | null;
}> = ({ children, onAutoTransition, initialActiveAccordion = null }) => {
  const [activeAccordion, setActiveAccordion] = useState<string | null>(
    initialActiveAccordion
  );
  const [isManualTransition, setIsManualTransition] = useState(false);
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);

  // Persist active accordion state
  useEffect(() => {
    if (activeAccordion) {
      sessionStorage.setItem('activeAccordion', activeAccordion);
    } else {
      sessionStorage.removeItem('activeAccordion');
    }
  }, [activeAccordion]);

  const handleSetActiveAccordion = (id: string | null) => {
    console.log('AccordionContext - Setting active accordion:', {
      current: activeAccordion,
      new: id,
      isManual: true,
    });
    setIsManualTransition(true);
    setActiveAccordion(id);

    // Reset manual transition flag after a short delay
    setTimeout(() => {
      console.log('AccordionContext - Resetting manual transition flag');
      setIsManualTransition(false);
    }, 100);
  };

  const autoTransition = (id: string, isValid: boolean, isQA = false) => {
    // Skip if no auto transition handler provided
    if (!onAutoTransition) return;

    // Debounce the validation check
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
    }
    transitionTimer.current = setTimeout(() => {
      if (isValid && activeAccordion === id) {
        const nextId = onAutoTransition(id);
        console.log('AccordionContext - Auto transition result:', {
          nextId,
          delay: isQA ? 2000 : 1000,
          currentTime: new Date().toISOString(),
        });

        if (nextId !== null) {
          // Use different delays for QA vs other transitions
          const delay = isQA ? 2000 : 1000;
          console.log(
            `AccordionContext - Starting ${delay}ms delay for step ${id}`
          );

          setIsTransitioning(true);
          setTimeout(() => {
            console.log(`AccordionContext - Delay complete for step ${id}`, {
              currentTime: new Date().toISOString(),
            });
            setActiveAccordion(nextId);
            setIsTransitioning(false);
          }, delay);
        }
      }
    }, 500);
  };

  return (
    <AccordionContext.Provider
      value={{
        activeAccordion,
        setActiveAccordion: handleSetActiveAccordion,
        autoTransition,
        isManualTransition,
      }}
    >
      {children}
    </AccordionContext.Provider>
  );
};
