import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export interface AccordionCardProps {
  title: string;
  children: React.ReactNode;
  isCompleted: boolean;
  shouldStayOpen?: boolean;
  isOpenByDefault?: boolean;
  className?: string;
  eyebrow?: string;
  subtitle?: string;
  summary?: string;
  showError?: boolean;
  hasInteracted?: boolean;
  stepId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  children,
  isCompleted,
  shouldStayOpen = false,
  isOpenByDefault = false,
  className = '',
  eyebrow,
  subtitle,
  summary,
  showError = false,
  hasInteracted = false,
  stepId,
  isOpen: controlledIsOpen,
  onToggle,
}) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState(isOpenByDefault);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist accordion state in localStorage
  useEffect(() => {
    if (stepId) {
      const storedState = localStorage.getItem(`accordion_${stepId}`);
      if (storedState !== null) {
        setIsAccordionOpen(JSON.parse(storedState));
      }
    }
  }, [stepId]);

  // Memoize state updates to prevent unnecessary re-renders
  const updateAccordionState = useCallback(
    (newState: boolean) => {
      console.log('\n=== AccordionCard State Update ===');
      console.log('Step ID:', stepId);
      console.log('Is Completed:', isCompleted);
      console.log('Should Stay Open:', shouldStayOpen);
      console.log('Is Open By Default:', isOpenByDefault);
      console.log('Current State:', isAccordionOpen);
      console.log('New State:', newState);

      if (isAccordionOpen !== newState) {
        setIsAccordionOpen(newState);
        if (stepId) {
          localStorage.setItem(`accordion_${stepId}`, JSON.stringify(newState));
        }
        console.log('State updated to:', newState);
      } else {
        console.log('State unchanged, skipping update');
      }
      console.log('=== End AccordionCard State Update ===\n');
    },
    [isAccordionOpen, stepId, isCompleted, shouldStayOpen, isOpenByDefault]
  );

  // Handle controlled state
  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      updateAccordionState(controlledIsOpen);
    }
  }, [controlledIsOpen, updateAccordionState]);

  // Handle default open state and shouldStayOpen
  useEffect(() => {
    if (shouldStayOpen || isOpenByDefault) {
      updateAccordionState(true);
    }
  }, [shouldStayOpen, isOpenByDefault, updateAccordionState]);

  const toggleAccordion = useCallback(() => {
    console.log('\n=== AccordionCard Toggle ===');
    console.log('Step ID:', stepId);
    console.log('Should Stay Open:', shouldStayOpen);
    console.log('Current Is Open:', isAccordionOpen);

    if (shouldStayOpen) {
      console.log('Toggle prevented due to shouldStayOpen');
      return;
    }

    if (onToggle) {
      console.log('Using controlled toggle');
      onToggle();
    } else {
      console.log('Using uncontrolled toggle');
      updateAccordionState(!isAccordionOpen);
    }
    console.log('=== End AccordionCard Toggle ===\n');
  }, [shouldStayOpen, isAccordionOpen, onToggle, stepId, updateAccordionState]);

  const getStatusIcon = useMemo(() => {
    if (!mounted) {
      return <div className="w-2 h-2 rounded-full bg-gray-300" />;
    }

    if (isCompleted) {
      return <CheckCircleIcon className="w-5 h-5 text-green-500 stroke-2" />;
    }
    if (hasInteracted) {
      return <div className="w-2 h-2 rounded-full bg-[#F54538]" />;
    }
    return <div className="w-2 h-2 rounded-full bg-gray-300" />;
  }, [isCompleted, hasInteracted, mounted]);

  return (
    <div
      className={`bg-white rounded-lg transition-all duration-500 ${
        showError ? 'border-2 border-red-500' : ''
      } ${className}`}
      data-step={stepId}
    >
      <button
        onClick={toggleAccordion}
        className="w-full flex items-start justify-between cursor-pointer text-left px-8 py-6 transition-all duration-300"
      >
        <div className="flex-1">
          {eyebrow && (
            <p className="text-sm font-medium text-[#F54538] mb-2">{eyebrow}</p>
          )}
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
          </div>
          {isAccordionOpen && subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {!isAccordionOpen && summary && (
            <p className="text-sm text-gray-500 mt-2">{summary}</p>
          )}
        </div>
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            {getStatusIcon}
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
                isAccordionOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>
      <div
        className={`transition-all duration-300 overflow-hidden ${
          isAccordionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-8 pb-8 pt-4">{children}</div>
      </div>
    </div>
  );
};
