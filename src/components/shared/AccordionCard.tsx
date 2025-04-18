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
  subtitle?: string;
  summary?: string;
  hasInteracted?: boolean;
  stepId: string;
  isValid?: boolean;
  shouldStayOpen?: boolean;
  /**
   * @deprecated This prop is reserved for future Q&A functionality
   */
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
  subtitle,
  summary,
  hasInteracted = false,
  stepId,
  isValid = false,
  shouldStayOpen = false,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  isQA = false,
  isOpen,
  onToggle,
  isOpenByDefault = false,
}) => {
  const { openAccordions, setOpenAccordions, autoTransition } = useAccordion();

  // Track form interaction
  const [isInteractingWithForm, setIsInteractingWithForm] =
    React.useState(false);

  // Define currentIsOpen before using it
  const currentIsOpen =
    isOpen !== undefined ? isOpen : openAccordions.has(stepId);

  // Handle default open state only once on mount
  useEffect(() => {
    // Only handle default opening on first visit
    const hasVisited = localStorage.getItem('hasVisitedInitialAssessment');
    if (!hasVisited && (stepId === '1' || isOpenByDefault)) {
      setOpenAccordions(new Set([stepId]));
    }
  }, [stepId, setOpenAccordions, isOpenByDefault]);

  // Handle auto-transition when step becomes valid and completed
  useEffect(() => {
    if (isInteractingWithForm) return;

    // Only attempt auto-transition when a step is both completed and valid
    if (isCompleted && isValid) {
      console.log(`=== Step ${stepId} is completed and valid, auto-transitioning ===`, {
        stepId,
        isCompleted,
        isValid,
        currentOpenState: currentIsOpen,
        timestamp: new Date().toISOString()
      });

      // First, ensure this step is open if it wasn't already
      if (!currentIsOpen && setOpenAccordions) {
        setOpenAccordions((prev: Set<string>) => new Set([...prev, stepId]));
      }

      // Then attempt to open the next step (numeric steps only)
      if (!isNaN(parseInt(stepId))) {
        const nextStepId = (parseInt(stepId) + 1).toString();
        console.log(`Attempting to auto-transition to step ${nextStepId}`);
        autoTransition(nextStepId, true);
      }
    }
  }, [isCompleted, isValid, stepId, autoTransition, isInteractingWithForm, currentIsOpen, setOpenAccordions]);

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
      setOpenAccordions((prev: Set<string>) => {
        const newSet = new Set(prev);
        if (currentIsOpen) {
          newSet.delete(stepId);
        } else {
          newSet.add(stepId);
        }
        return newSet;
      });
    }
  };

  // Add debugging log to track status of accordion card
  console.log(`Accordion Card Status for step ${stepId}:`, {
    isCompleted,
    isValid,
    hasInteracted,
    stepId,
    timestamp: new Date().toISOString()
  });

  const getStatusIcon = useMemo(() => {
    // Show check mark only if both completed AND valid
    if (isCompleted && isValid) {
      return (
        <CheckCircleIcon
          className="w-6 h-6 text-green-500"
          aria-hidden="true"
        />
      );
    }
    // Show check mark if explicitly marked as completed
    else if (isCompleted) {
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
  }, [isCompleted, hasInteracted, isValid]);

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
            {currentIsOpen && subtitle && (
              <p className="mt-2 text-gray-600">{subtitle}</p>
            )}
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
