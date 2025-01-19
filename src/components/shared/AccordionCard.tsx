import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAccordion } from './AccordionContext';

export interface AccordionCardProps {
  title: string;
  children: React.ReactNode;
  isCompleted: boolean;
  isOpenByDefault?: boolean;
  className?: string;
  eyebrow?: string;
  // Kept for future use in accordion card headers
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  subtitle?: string;
  summary?: string;
  hasInteracted?: boolean;
  stepId: string;
  isValid?: boolean;
  shouldStayOpen?: boolean;
  isQA?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  children,
  isCompleted,
  isOpenByDefault = false,
  className = '',
  eyebrow,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  subtitle,
  summary,
  hasInteracted = false,
  stepId,
  isValid = false,
  shouldStayOpen = false,
  isQA = false,
  isOpen,
  onToggle,
}) => {
  const {
    activeAccordion,
    setActiveAccordion,
    autoTransition,
    isManualTransition,
  } = useAccordion();

  // Track if we're waiting for validation
  // isValidating is kept as part of the validation state management pattern
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const [isValidating, setIsValidating] = useState(false);
  const validationTimer = React.useRef<NodeJS.Timeout>();
  const isValidatingRef = React.useRef(false);
  const wasValidRef = React.useRef(isValid);
  const wasManualRef = React.useRef(false);
  const defaultOpenHandledRef = React.useRef(false);

  // Track when manual transitions occur
  useEffect(() => {
    if (isManualTransition) {
      wasManualRef.current = true;
      const timer = setTimeout(() => {
        wasManualRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isManualTransition]);

  // Handle default open state only once on mount
  useEffect(() => {
    if (
      isOpenByDefault &&
      !activeAccordion &&
      !isManualTransition &&
      !defaultOpenHandledRef.current
    ) {
      setActiveAccordion(stepId);
      defaultOpenHandledRef.current = true;
    }
  }, [
    isOpenByDefault,
    activeAccordion,
    setActiveAccordion,
    stepId,
    isManualTransition,
  ]);

  // Track previous validity state and handle auto-transition
  useEffect(() => {
    // Skip if not mounted yet
    if (!isInitialLoad.current) {
      isInitialLoad.current = true;
      return;
    }

    // Only start validation if the step is valid and completed
    if (isValid && isCompleted) {
      // Skip validation for flight selector during type changes
      const isFlightSelector =
        stepId === '2' && title.toLowerCase().includes('flug');
      const isCompletedStep = isValid && isCompleted;

      // Skip auto-transition for flight selector unless completed
      if (isFlightSelector && !isCompletedStep) {
        console.log(
          'AccordionCard - Skipping validation for flight selector during type change'
        );
        return;
      }

      console.log('AccordionCard - Step is valid and completed:', {
        stepId,
        wasManual: wasManualRef.current,
        isInitialLoad: isInitialLoad.current,
        activeAccordion,
        isQA,
      });

      // If this is the active accordion and not a manual transition
      if (
        activeAccordion === stepId &&
        !wasManualRef.current &&
        !shouldStayOpen
      ) {
        console.log('AccordionCard - Starting auto-transition:', {
          stepId,
          delay: isQA ? 2000 : 1000,
          isValidating: isValidatingRef.current,
          isFlightSelector,
          isCompletedStep,
        });

        // Set validation state
        setIsValidating(true);
        isValidatingRef.current = true;

        // Wait before transitioning
        const delay = isQA ? 2000 : 1000;
        const timer = setTimeout(() => {
          // Double check conditions before transitioning
          if (
            isValid &&
            isCompleted &&
            activeAccordion === stepId &&
            !shouldStayOpen &&
            !wasManualRef.current &&
            (!isFlightSelector || isCompletedStep)
          ) {
            console.log('AccordionCard - Auto-transitioning:', {
              stepId,
              isQA,
              isValidating: isValidatingRef.current,
            });
            autoTransition(stepId, true, isQA);
          } else {
            console.log('AccordionCard - Conditions no longer met:', {
              stepId,
              isValid,
              isCompleted,
              activeAccordion,
              shouldStayOpen,
              wasManual: wasManualRef.current,
              isValidating: isValidatingRef.current,
            });
          }

          // Reset validation state
          setIsValidating(false);
          isValidatingRef.current = false;
          validationTimer.current = undefined;
        }, delay);

        validationTimer.current = timer;

        return () => {
          if (validationTimer.current) {
            clearTimeout(validationTimer.current);
            validationTimer.current = undefined;
            isValidatingRef.current = false;
            setIsValidating(false);
          }
        };
      }
    } else {
      // Reset validation state when becoming invalid
      wasValidRef.current = false;
    }
  }, [
    isValid,
    isCompleted,
    stepId,
    activeAccordion,
    shouldStayOpen,
    isQA,
    autoTransition,
    title,
  ]);

  // Cleanup validation timer on unmount
  useEffect(() => {
    return () => {
      if (validationTimer.current) {
        clearTimeout(validationTimer.current);
        validationTimer.current = undefined;
        isValidatingRef.current = false;
        setIsValidating(false);
      }
    };
  }, []);

  // Track if this is initial load
  const isInitialLoad = React.useRef(true);

  const currentIsOpen =
    isOpen !== undefined ? isOpen : activeAccordion === stepId;

  const toggleAccordion = (e?: React.MouseEvent) => {
    // Prevent toggle if validating
    if (isValidatingRef.current) {
      console.log('AccordionCard - Ignoring toggle while validating:', {
        stepId,
      });
      return;
    }

    // Only allow toggle from within the header
    if (e?.target) {
      const target = e.target as HTMLElement;
      const header = target.closest('.accordion-header');

      if (!header) {
        console.log('AccordionCard - Ignoring click from outside header:', {
          stepId,
          element: target.tagName,
        });
        return;
      }
    }

    console.log('AccordionCard - Toggle clicked:', {
      stepId,
      isCurrentlyOpen: currentIsOpen,
      shouldStayOpen,
      willToggle: !shouldStayOpen,
      isValidating: isValidatingRef.current,
    });

    if (onToggle) {
      onToggle();
    } else if (!shouldStayOpen) {
      setActiveAccordion(currentIsOpen ? null : stepId);
      wasManualRef.current = true;

      // Reset wasManual after a delay
      setTimeout(() => {
        console.log('AccordionCard - Resetting wasManual:', { stepId });
        wasManualRef.current = false;
      }, 1000);
    }
  };

  const getStatusIcon = useMemo(() => {
    if (isCompleted) {
      return (
        <CheckCircleIcon
          className="w-6 h-6 text-green-500"
          aria-hidden="true"
        />
      );
    }
    if (hasInteracted) {
      return (
        <div className="w-2 h-2 rounded-full bg-[#F54538]" aria-hidden="true" />
      );
    }
    return (
      <div className="w-2 h-2 rounded-full bg-gray-300" aria-hidden="true" />
    );
  }, [isCompleted, hasInteracted]);

  return (
    <div
      className={`bg-white rounded-lg transition-all duration-500 ${className}`}
      data-step={stepId}
    >
      <div className="accordion-header">
        <button
          onClick={toggleAccordion}
          type="button"
          className="relative w-full flex flex-col cursor-pointer text-left px-4 sm:px-8 py-6 transition-all duration-300"
        >
          <div className="absolute right-4 sm:right-8 top-6 flex items-center space-x-4 shrink-0">
            {getStatusIcon}
            <ChevronDownIcon
              className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${
                currentIsOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
          <div className="flex-1 pr-20">
            {eyebrow && (
              <p className="text-sm font-medium text-[#F54538] mb-2">
                {eyebrow}
              </p>
            )}
            <div className="flex items-center space-x-3">
              <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
            </div>
            {!currentIsOpen && summary && (
              <p className="mt-2 text-gray-500">{summary}</p>
            )}
          </div>
        </button>
      </div>

      {/* Separate content area */}
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          currentIsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div
          className="px-2 sm:px-8 pb-8"
          onClick={(e) => {
            // Stop propagation for all clicks in the content area
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
