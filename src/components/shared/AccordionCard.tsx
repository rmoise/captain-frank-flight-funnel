import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import {
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  EllipsisHorizontalCircleIcon,
} from '@heroicons/react/24/outline';
import { AccordionProvider, useAccordion } from './AccordionContext';
import { useAppDispatch } from '@/store/hooks';
import { setStep } from '@/store/bookingSlice';

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  eyebrow?: string;
  summary?: string;
  className?: string;
  shouldStayOpen?: boolean;
  hasInteracted?: boolean;
  isOpenByDefault?: boolean;
}

const AccordionContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div className="pt-4 relative">{children}</div>;
};

const getStorageKey = (title: string) => {
  return `accordion_${title.toLowerCase().replace(/\s+/g, '_')}`;
};

const AccordionCardInner: React.FC<AccordionCardProps> = ({
  title,
  subtitle,
  children,
  isActive,
  isCompleted,
  eyebrow,
  summary,
  className = '',
  shouldStayOpen = false,
  hasInteracted = false,
  isOpenByDefault = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const stepId = parseInt(eyebrow?.replace('Step ', '') || '1');
  const storageKey = getStorageKey(title);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isExpanded, setIsExpanded] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(`${storageKey}_expanded`);
      if (savedState !== null) {
        return savedState === 'true';
      }
    }
    return isOpenByDefault || title.includes('Tell us about your flight') || title.includes('What happened with your flight?');
  });

  const [localHasInteracted, setLocalHasInteracted] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedInteraction = localStorage.getItem(`${storageKey}_interacted`);
      if (savedInteraction !== null) {
        return savedInteraction === 'true';
      }
    }
    return hasInteracted;
  });

  const { canToggle } = useAccordion();

  const [wasCompletedBefore, setWasCompletedBefore] = useState(false);
  const [lastCompletionTime, setLastCompletionTime] = useState(0);
  const [prevCompletedState, setPrevCompletedState] = useState(isCompleted);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${storageKey}_expanded`, isExpanded.toString());
    }
  }, [isExpanded, storageKey]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(
        `${storageKey}_interacted`,
        localHasInteracted.toString()
      );
    }
  }, [localHasInteracted, storageKey]);

  const findNextOpenStep = () => {
    let nextStep = stepId + 1;
    while (nextStep <= 3) {
      const stepElement = document.querySelector(`[data-step="${nextStep}"]`);
      if (stepElement) {
        const isStepOpen = stepElement.querySelector('[aria-expanded="true"]');
        if (isStepOpen) {
          return nextStep;
        }
      }
      nextStep++;
    }

    nextStep = stepId + 1;
    while (nextStep <= 3) {
      const stepElement = document.querySelector(`[data-step="${nextStep}"]`);
      if (stepElement) {
        const isStepCompleted = stepElement.querySelector('.text-green-500');
        if (!isStepCompleted) {
          return nextStep;
        }
      }
      nextStep++;
    }

    return stepId + 1;
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isCompleted && !prevCompletedState && !shouldStayOpen) {
      timeoutId = setTimeout(() => {
        setIsExpanded(false);

        setTimeout(() => {
          const nextStepId = findNextOpenStep();
          if (nextStepId <= 3) {
            dispatch(setStep(nextStepId));

            const nextStep = document.querySelector(`[data-step="${nextStepId}"]`);
            if (nextStep) {
              setTimeout(() => {
                const windowHeight = window.innerHeight;
                const cardHeight = nextStep.getBoundingClientRect().height;
                const scrollPosition =
                  nextStep.getBoundingClientRect().top +
                  window.pageYOffset -
                  ((windowHeight - cardHeight) / 2);

                window.scrollTo({
                  top: Math.max(0, scrollPosition),
                  behavior: 'smooth'
                });
              }, 100);
            }
          }
        }, 300);
      }, title.includes('Tell us about your flight') ? 1500 : 2500);
    }
    setPrevCompletedState(isCompleted);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCompleted, shouldStayOpen, stepId, dispatch]);

  useEffect(() => {
    if (!isCompleted) {
      setLastCompletionTime(0);
    }
  }, [isCompleted]);

  useEffect(() => {
    if (hasInteracted && !localHasInteracted) {
      setLocalHasInteracted(true);
    }
  }, [hasInteracted, localHasInteracted]);

  useEffect(() => {
    if (isActive && !isExpanded) {
    }
  }, [isActive, isExpanded]);

  const debounce = (func: Function, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  useEffect(() => {
    let lastIntersectionTime = 0;
    const minTimeBetweenUpdates = 300;

    const handleIntersection = debounce((entries: IntersectionObserverEntry[]) => {
      const now = Date.now();
      entries.forEach((entry) => {
        if (entry.isIntersecting &&
            entry.intersectionRatio > 0.5 &&
            (now - lastIntersectionTime) > minTimeBetweenUpdates) {

          const rect = entry.boundingClientRect;
          const windowHeight = window.innerHeight;
          const elementCenter = rect.top + (rect.height / 2);
          const viewportCenter = windowHeight / 2;

          if (Math.abs(elementCenter - viewportCenter) < windowHeight * 0.2) {
            const newStepId = parseInt(eyebrow?.replace('Step ', '') || '1');
            dispatch(setStep(newStepId));
            lastIntersectionTime = now;
          }
        }
      });
    }, 50);

    const observer = new IntersectionObserver(
      handleIntersection,
      {
        root: null,
        rootMargin: '-20% 0px -20% 0px',
        threshold: [0, 0.25, 0.5, 0.75, 1.0]
      }
    );

    const currentCard = cardRef.current;
    if (currentCard) {
      observer.observe(currentCard);
    }

    return () => {
      if (currentCard) {
        observer.unobserve(currentCard);
      }
      observer.disconnect();
    };
  }, [dispatch, eyebrow]);

  const handleHeaderClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('input, button, select, textarea, [role="listbox"], [role="option"]')) {
      return;
    }

    if (!canToggle) return;

    if (isActive && isExpanded) {
      const nextStepId = findNextOpenStep();
      if (nextStepId <= 3) {
        setTimeout(() => {
          setIsExpanded(false);
          setTimeout(() => {
            dispatch(setStep(nextStepId));
            const nextStep = document.querySelector(`[data-step="${nextStepId}"]`);
            if (nextStep) {
              const headerHeight = 80;
              const windowHeight = window.innerHeight;
              const cardHeight = nextStep.getBoundingClientRect().height;
              const scrollPosition =
                nextStep.getBoundingClientRect().top +
                window.pageYOffset -
                ((windowHeight - cardHeight) / 2);

              window.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
              });
            }
          }, 100);
        }, 300);
      } else {
        setIsExpanded(false);
      }
    } else {
      setIsExpanded(!isExpanded);

      if (!isExpanded) {
        const card = cardRef.current;
        if (card) {
          const headerHeight = 80;
          const windowHeight = window.innerHeight;
          const cardHeight = card.getBoundingClientRect().height;
          const scrollPosition =
            card.getBoundingClientRect().top +
            window.pageYOffset -
            ((windowHeight - cardHeight) / 2);

          window.scrollTo({
            top: Math.max(0, scrollPosition),
            behavior: 'smooth'
          });
        }
      }
    }

    if (!localHasInteracted) {
      setLocalHasInteracted(true);
    }
  };

  const showIcon = !isExpanded && (isCompleted || hasInteracted || localHasInteracted);
  const showSummary = (isCompleted || localHasInteracted || shouldStayOpen) && summary;

  return (
    <motion.div
      data-step={stepId}
      initial={false}
      animate={{
        y: isActive ? -4 : 0,
        transition: { duration: 0.2 }
      }}
    >
      <Card
        ref={cardRef}
        className={`${className} transition-shadow duration-300 ${
          isActive
            ? 'shadow-lg'
            : 'shadow-sm hover:shadow-md'
        }`}
      >
        <div className="relative">
          <div
            className="w-full flex items-start justify-between cursor-pointer text-left p-4"
            onClick={handleHeaderClick}
          >
            <div className="flex-1">
              {eyebrow && (
                <div className="text-sm text-gray-500 mb-1">{eyebrow}</div>
              )}
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
              </div>
              {subtitle && isExpanded && (
                <p className="text-sm text-gray-500 mt-2">{subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-4 pt-1">
              {showSummary && !isExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-gray-600"
                >
                  {summary}
                </motion.div>
              )}
              <div className="flex items-center gap-2">
                {showIcon && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {isCompleted ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <XCircleIcon className="w-6 h-6 text-[#F54538]" />
                    )}
                  </motion.div>
                )}
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUpIcon className="w-6 h-6 text-gray-400" />
                </motion.div>
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden px-4 pb-4"
              >
                <AccordionContent>{children}</AccordionContent>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
};

export const AccordionCard: React.FC<AccordionCardProps> = (props) => {
  return (
    <AccordionProvider>
      <AccordionCardInner {...props} />
    </AccordionProvider>
  );
};
