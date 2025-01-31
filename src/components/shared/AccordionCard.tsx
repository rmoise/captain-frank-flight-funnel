import React, { useEffect, useMemo } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import { useAccordion } from './AccordionContext';

export interface AccordionCardProps {
  title: string;
  children: React.ReactNode;
  isCompleted: boolean;
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
  isOpenByDefault?: boolean;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  children,
  isCompleted,
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
  isOpenByDefault = false,
}) => {
  const {
    activeAccordion,
    setActiveAccordion,
    autoTransition,
    isManualTransition,
    isTransitioning,
  } = useAccordion();

  // Track manual transitions
  const wasManualRef = React.useRef(false);
  const defaultOpenHandledRef = React.useRef(false);

  // Track form interaction
  const [isInteractingWithForm, setIsInteractingWithForm] =
    React.useState(false);

  // Track when manual transitions occur
  useEffect(() => {
    if (isManualTransition) {
      wasManualRef.current = true;
      sessionStorage.setItem(`step_${stepId}_interacted`, 'true');
      const timer = setTimeout(() => {
        wasManualRef.current = false;
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isManualTransition, stepId]);

  // Handle default open state only once on mount
  useEffect(() => {
    // Only handle default opening on first visit
    const hasVisited = localStorage.getItem('hasVisitedInitialAssessment');
    if (!hasVisited && (stepId === '1' || isOpenByDefault)) {
      setActiveAccordion(stepId);
      defaultOpenHandledRef.current = true;
    } else {
      defaultOpenHandledRef.current = true;
    }
  }, [stepId, setActiveAccordion, isOpenByDefault]);

  // Handle auto-transition when step becomes valid and completed
  useEffect(() => {
    // Only trigger auto-transition if the step is valid, completed, and currently open
    const isStepValid = isValid && isCompleted;
    console.log('=== AccordionCard Auto-transition Check ===', {
      stepId,
      isStepValid,
      isValid,
      isCompleted,
      activeAccordion,
      isTransitioning,
      wasManual: wasManualRef.current,
      isInteractingWithForm,
      timestamp: new Date().toISOString(),
    });

    if (!isStepValid) return;
    if (!activeAccordion || activeAccordion !== stepId) return;
    if (isTransitioning) return;
    if (wasManualRef.current) return;
    if (isInteractingWithForm) return; // Prevent auto-transition while interacting with form

    // Check if this was a manual reopening
    const manualOpenTime = sessionStorage.getItem(
      `step_${stepId}_manual_open_time`
    );
    if (manualOpenTime) {
      const timeSinceManualOpen = Date.now() - parseInt(manualOpenTime);
      // If manually opened within the last 2 seconds, skip auto-transition
      if (timeSinceManualOpen < 2000) {
        console.log('=== Skipping Auto-transition (Recent Manual Open) ===', {
          stepId,
          timeSinceManualOpen,
          timestamp: new Date().toISOString(),
        });
        return;
      }
    }

    const delay = isQA ? 2000 : 1000;
    console.log('=== Setting Auto-transition Timer ===', {
      stepId,
      delay,
      isQA,
      timestamp: new Date().toISOString(),
    });

    const timer = setTimeout(() => {
      if (activeAccordion === stepId && !isInteractingWithForm) {
        console.log('=== Executing Auto-transition ===', {
          stepId,
          isValid,
          isCompleted,
          isQA,
          delay,
          isInteractingWithForm,
          currentTime: new Date().toISOString(),
        });
        autoTransition(stepId, true, isQA);
      } else {
        console.log('=== Auto-transition Cancelled ===', {
          stepId,
          activeAccordion,
          isInteractingWithForm,
          timestamp: new Date().toISOString(),
        });
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [
    isValid,
    isCompleted,
    stepId,
    activeAccordion,
    isQA,
    autoTransition,
    isTransitioning,
    isInteractingWithForm,
  ]);

  const currentIsOpen =
    isOpen !== undefined ? isOpen : activeAccordion === stepId;

  const toggleAccordion = (e?: React.MouseEvent) => {
    // Only allow toggle from within the header
    if (e?.target) {
      const target = e.target as HTMLElement;

      // Prevent toggle if interacting with input fields or their wrappers
      if (
        target.tagName.toLowerCase() === 'input' ||
        target.tagName.toLowerCase() === 'select' ||
        target.tagName.toLowerCase() === 'textarea' ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea') ||
        target.closest('[role="combobox"]') ||
        target.closest('[role="listbox"]') ||
        target.closest('[role="searchbox"]') ||
        target.closest('[role="textbox"]') ||
        target.closest('.form-field') ||
        target.closest('.input-wrapper') ||
        target.closest('label')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      // Check if click is within header
      const header = target.closest('.accordion-header');
      if (!header) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    if (onToggle) {
      onToggle();
    } else {
      // Don't close if shouldStayOpen is true and accordion is already open
      if (shouldStayOpen && currentIsOpen) {
        return;
      }

      // Toggle the accordion
      setActiveAccordion(currentIsOpen ? null : stepId);
      wasManualRef.current = true;

      // For completed steps, set a longer manual flag duration
      if (isCompleted) {
        setTimeout(() => {
          wasManualRef.current = false;
        }, 2000);
      } else {
        setTimeout(() => {
          wasManualRef.current = false;
        }, 1000);
      }
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
      onFocus={() => setIsInteractingWithForm(true)}
      onBlur={() => {
        // Add a small delay before setting to false to ensure we don't transition too quickly
        setTimeout(() => setIsInteractingWithForm(false), 500);
      }}
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
