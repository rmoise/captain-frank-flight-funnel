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
  isTransitioning: boolean;
}

const AccordionContext = createContext<AccordionContextType>({
  activeAccordion: null,
  setActiveAccordion: () => {},
  autoTransition: () => {},
  isManualTransition: false,
  isTransitioning: false,
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastTransitionTime = useRef<number>(0);

  // Expose context to window object
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if this is the first visit
      const hasVisited = localStorage.getItem('hasVisitedInitialAssessment');
      if (!hasVisited) {
        localStorage.setItem('hasVisitedInitialAssessment', 'true');
        // Open step 1 on first visit
        setActiveAccordion('1');
      }

      (window as any).__accordionContext = {
        setActiveAccordion: handleSetActiveAccordion,
      };
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__accordionContext;
      }
    };
  }, []);

  const handleSetActiveAccordion = (id: string | null) => {
    console.log('AccordionContext - Setting active accordion:', {
      current: activeAccordion,
      new: id,
      isManual: true,
    });

    // Prevent rapid transitions
    const now = Date.now();
    if (now - lastTransitionTime.current < 500) {
      return;
    }
    lastTransitionTime.current = now;

    // If we're already transitioning, don't start another transition
    if (isTransitioning) {
      return;
    }

    setIsManualTransition(true);
    setIsTransitioning(true);

    // Mark as manually opened in session storage
    if (id) {
      sessionStorage.setItem(`step_${id}_manually_opened`, 'true');
      sessionStorage.setItem(`step_${id}_interacted`, 'true');
      // Set a timestamp for when this step was manually opened
      sessionStorage.setItem(
        `step_${id}_manual_open_time`,
        Date.now().toString()
      );
    }

    // Set the new active accordion immediately
    setActiveAccordion(id);

    // Reset transition flags after animation completes
    setTimeout(() => {
      setIsManualTransition(false);
      setIsTransitioning(false);
    }, 500);
  };

  const autoTransition = (id: string, isValid: boolean, isQA = false) => {
    // Skip if no auto transition handler provided
    if (!onAutoTransition) return;

    // Skip if we're already transitioning
    if (isTransitioning) return;

    // Skip if this was a manual transition
    if (isManualTransition) return;

    // Check if this step was recently manually opened
    const manualOpenTime = sessionStorage.getItem(
      `step_${id}_manual_open_time`
    );
    if (manualOpenTime) {
      const timeSinceManualOpen = Date.now() - parseInt(manualOpenTime);
      // If manually opened within the last 2 seconds, skip auto-transition
      if (timeSinceManualOpen < 2000) {
        return;
      }
    }

    // Debounce the validation check
    if (transitionTimer.current) {
      clearTimeout(transitionTimer.current);
    }

    transitionTimer.current = setTimeout(() => {
      if (isValid && activeAccordion === id) {
        const nextId = onAutoTransition(id);
        console.log('AccordionContext - Auto transition result:', {
          currentId: id,
          nextId,
          isValid,
          delay: isQA ? 2000 : 1000,
          currentTime: new Date().toISOString(),
        });

        if (nextId !== null) {
          // Mark current step as completed
          sessionStorage.setItem(`step_${id}_completed`, 'true');

          // Use different delays for QA vs other transitions
          const delay = isQA ? 2000 : 1000;
          console.log(
            `AccordionContext - Starting ${delay}ms delay for step ${id} -> ${nextId}`
          );

          setIsTransitioning(true);
          // Set the next accordion as active
          setActiveAccordion(nextId);

          // Scroll to the next accordion after a brief delay to ensure it's expanded
          setTimeout(() => {
            const nextAccordion = document.querySelector(
              `[data-step="${nextId}"]`
            );
            if (nextAccordion) {
              nextAccordion.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
              });
            }
            setIsTransitioning(false);
          }, 500);
        }
      }
    }, 100);
  };

  return (
    <AccordionContext.Provider
      value={{
        activeAccordion,
        setActiveAccordion: handleSetActiveAccordion,
        autoTransition,
        isManualTransition,
        isTransitioning,
      }}
    >
      {children}
    </AccordionContext.Provider>
  );
};
