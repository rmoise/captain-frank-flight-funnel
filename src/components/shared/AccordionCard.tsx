import React, { useEffect, useState, useMemo } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

export interface AccordionCardProps {
  title: string;
  children: React.ReactNode;
  isCompleted: boolean;
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
  shouldStayOpen?: boolean;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  children,
  isCompleted,
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
  shouldStayOpen = false,
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(isOpenByDefault);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (controlledIsOpen !== undefined) {
      setInternalIsOpen(controlledIsOpen);
    }
  }, [controlledIsOpen]);

  const toggleAccordion = () => {
    if (!shouldStayOpen || !internalIsOpen) {
      setInternalIsOpen((prev) => !prev);
      onToggle?.();
    }
  };

  const isAccordionOpen =
    controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

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
        onClick={(e) => {
          e.preventDefault();
          toggleAccordion();
        }}
        type="button"
        className="w-full flex items-start justify-between cursor-pointer text-left px-4 sm:px-8 py-6 transition-all duration-300"
      >
        <div className="flex-1">
          {eyebrow && (
            <p className="text-sm font-medium text-[#F54538] mb-2">{eyebrow}</p>
          )}
          <div className="flex items-center space-x-3">
            <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
          </div>
          {isAccordionOpen && subtitle && (
            <p className="mt-2 text-gray-500">{subtitle}</p>
          )}
          {!isAccordionOpen && summary && (
            <p className="mt-2 text-gray-500">{summary}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {getStatusIcon}
          <ChevronDownIcon
            className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${
              isAccordionOpen ? 'transform rotate-180' : ''
            }`}
          />
        </div>
      </button>
      <div
        className={`overflow-hidden transition-all duration-500 ease-in-out ${
          isAccordionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-2 sm:px-8 pb-8">{children}</div>
      </div>
    </div>
  );
};
