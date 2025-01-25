import React, { useEffect, useMemo } from 'react';
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

  // Track manual transitions
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

  // Handle auto-transition when step becomes valid and completed
  useEffect(() => {
    if (!isValid || !isCompleted) return;
    if (!activeAccordion || activeAccordion !== stepId) return;
    if (wasManualRef.current || shouldStayOpen) return;

    const isFlightSelector =
      stepId === '2' && title.toLowerCase().includes('flug');
    if (isFlightSelector && !isCompleted) return;

    const delay = isQA ? 2000 : 1000;
    const timer = setTimeout(() => {
      if (activeAccordion === stepId) {
        autoTransition(stepId, true, isQA);
      }
    }, delay);

    return () => clearTimeout(timer);
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

  const currentIsOpen =
    isOpen !== undefined ? isOpen : activeAccordion === stepId;

  const toggleAccordion = (e?: React.MouseEvent) => {
    // Only allow toggle from within the header
    if (e?.target) {
      const target = e.target as HTMLElement;
      const header = target.closest('.accordion-header');

      if (!header) {
        return;
      }
    }

    if (onToggle) {
      onToggle();
    } else if (!shouldStayOpen) {
      setActiveAccordion(currentIsOpen ? null : stepId);
      wasManualRef.current = true;

      setTimeout(() => {
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
