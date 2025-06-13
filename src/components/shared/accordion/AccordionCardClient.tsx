"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/layout/Card";
import {
  ChevronUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useAccordion } from "./AccordionContext";
import { ValidationPhase } from "@/types/shared/validation";
import { FlightSegment } from "@/types/shared/flight";

// Declare global store for TypeScript
declare global {
  interface Window {
    __ZUSTAND_STORE__?: {
      getState: () => {
        flight: {
          segments: FlightSegment[];
        };
        actions?: {
          validation?: {
            setStepValidation: (
              phase: ValidationPhase,
              isValid: boolean
            ) => void;
          };
        };
      };
    };
  }
}

// Helper function to generate a unique key for localStorage
const getStorageKey = (title: string) => {
  return `accordion-${title.replace(/\s+/g, "-").toLowerCase()}`;
};

export interface AccordionCardClientProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isCompleted: boolean;
  eyebrow?: string;
  summary?: string;
  className?: string;
  stepId: string;
  isValid?: boolean;
  isQA?: boolean;
  isOpenByDefault?: boolean;
  shouldStayOpen?: boolean;
  hasInteracted?: boolean;
  onInteraction?: () => void;
  onToggle?: (stepId: string, isOpen: boolean) => void;
}

const AccordionContent: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <div className="pt-4 relative">{children}</div>;
};

export const AccordionCardClient: React.FC<AccordionCardClientProps> = ({
  title,
  subtitle,
  children,
  isCompleted,
  eyebrow,
  summary,
  className = "",
  stepId,
  isValid = false,
  isQA = false,
  isOpenByDefault = false,
  shouldStayOpen = false,
  hasInteracted = false,
  onInteraction,
  onToggle,
}) => {
  const storageKey = getStorageKey(title);
  const numericStepId = parseInt(stepId, 10);
  const { canToggle, activeStepId, setActiveStepId, clearActiveStepId } =
    useAccordion();

  const [isExpanded, setIsExpanded] = useState(isOpenByDefault);
  const [prevCompletedState, setPrevCompletedState] = useState(isCompleted);
  const [localHasInteracted, setLocalHasInteracted] = useState(hasInteracted);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentStableRef = useRef(false);

  const isThisActive = activeStepId === stepId && !isCompleted;

  // The getValidationPhase function might still be useful for other purposes or logging.
  const getValidationPhase = (stepId: string): ValidationPhase => {
    const stepPhase = `STEP_${stepId}` as ValidationPhase;
    if (Object.values(ValidationPhase).includes(stepPhase)) {
      return stepPhase;
    }
    switch (stepId) {
      case "1":
        return ValidationPhase.INITIAL_ASSESSMENT;
      case "2":
        return ValidationPhase.COMPENSATION_ESTIMATE;
      case "3":
        return ValidationPhase.FLIGHT_DETAILS;
      case "4":
        return ValidationPhase.TRIP_EXPERIENCE;
      case "digital-signature":
        return ValidationPhase.STEP_1;
      case "terms-and-conditions":
        return ValidationPhase.TERMS_AND_CONDITIONS;
      default:
        console.warn(
          `[getValidationPhase] Unknown stepId: ${stepId}, defaulting.`
        );
        return ValidationPhase.INITIAL_ASSESSMENT;
    }
  };
  // const validationPhase = getValidationPhase(stepId); // Kept commented as its primary use for direct store lookup was removed

  const propIsCompleted = isCompleted;

  useEffect(() => {
    console.log(
      `[AccordionCardClient] Status Check Effect for step ${stepId}:`,
      {
        propIsCompleted,
        isValid,
        activeStepId,
        isThisActive,
        title,
      }
    );

    if (propIsCompleted && isValid) {
      console.log(
        `[AccordionCardClient] Step ${stepId} is completed and valid based on props.`
      );
    }
  }, [propIsCompleted, isValid, stepId, activeStepId, isThisActive, title]);

  useEffect(() => {
    const contentElement = contentRef.current;
    if (contentElement && isExpanded && !propIsCompleted) {
      const handleFocusOrClick = (event: FocusEvent | MouseEvent) => {
        if (contentElement.contains(event.target as Node)) {
          setActiveStepId(stepId);
          if (!localHasInteracted) {
            setLocalHasInteracted(true);
            if (onInteraction) {
              onInteraction();
            }
          }
        }
      };

      contentElement.addEventListener("focusin", handleFocusOrClick);
      contentElement.addEventListener("click", handleFocusOrClick);

      return () => {
        contentElement.removeEventListener("focusin", handleFocusOrClick);
        contentElement.removeEventListener("click", handleFocusOrClick);
      };
    }
  }, [isExpanded, propIsCompleted, stepId, setActiveStepId, localHasInteracted, onInteraction]);

  // Update based on external hasInteracted changes
  useEffect(() => {
    if (hasInteracted && !localHasInteracted) {
      setLocalHasInteracted(hasInteracted);
    }
  }, [hasInteracted, localHasInteracted]);

  const findNextOpenStep = () => {
    let nextStep = numericStepId + 1;
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

    nextStep = numericStepId + 1;
    while (nextStep <= 3) {
      const stepElement = document.querySelector(`[data-step="${nextStep}"]`);
      if (stepElement) {
        const isStepCompleted = stepElement.querySelector(".text-green-500");
        if (!isStepCompleted) {
          return nextStep;
        }
      }
      nextStep++;
    }

    return numericStepId + 1;
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (propIsCompleted && !prevCompletedState && !shouldStayOpen) {
      timeoutId = setTimeout(
        () => {
          setIsExpanded(false);

          // Clear active step ID if this is the current active step
          if (activeStepId === stepId) {
            clearActiveStepId();
          }

          setTimeout(() => {
            const nextStepId = findNextOpenStep();
            if (nextStepId <= 3) {
              // Convert numeric step ID to correct ValidationPhase enum value
              const nextPhase = getValidationPhase(nextStepId.toString());
              // --- Step 4: Fix action call ---
              // ------------------------------

              const nextStep = document.querySelector(
                `[data-step="${nextStepId}"]`
              );
              if (nextStep) {
                setTimeout(() => {
                  const windowHeight = window.innerHeight;
                  const cardHeight = nextStep.getBoundingClientRect().height;
                  const scrollPosition =
                    nextStep.getBoundingClientRect().top +
                    window.pageYOffset -
                    (windowHeight - cardHeight) / 2;

                  window.scrollTo({
                    top: Math.max(0, scrollPosition),
                    behavior: "smooth",
                  });
                }, 100);
              }
            }
          }, 300);
        },
        title.includes("Tell us about your flight") ? 1500 : 2500
      );
    }
    setPrevCompletedState(propIsCompleted);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    propIsCompleted,
    shouldStayOpen,
    numericStepId,
    // -----------------------------------------------------------
    prevCompletedState,
    title,
    activeStepId,
    stepId,
    clearActiveStepId,
  ]);

  // When accordion is opened, set it as active
  useEffect(() => {
    if (isExpanded && !propIsCompleted) {
      setActiveStepId(stepId);
    }
  }, [isExpanded, stepId, setActiveStepId, propIsCompleted]);

  const handleToggle = () => {
    if (!canToggle) return;

    const nextExpandedState = !isExpanded;
    setIsExpanded(nextExpandedState);

    // Set as active when expanding, clear when collapsing
    if (nextExpandedState) {
      if (!propIsCompleted) {
        setActiveStepId(stepId);
        if (!localHasInteracted) {
          setLocalHasInteracted(true);
          if (onInteraction) {
            onInteraction();
          }
        }
      }
    } else {
      // If this is the current active step, clear it when collapsing
      if (activeStepId === stepId) {
        clearActiveStepId();
      }
    }

    // Call the onToggle callback if provided
    if (onToggle) {
      onToggle(stepId, nextExpandedState);
    }
  };

  const getStatusIcon = () => {
    if (propIsCompleted && isValid) {
      return <CheckCircleIcon className="w-6 h-6 text-green-500" />;
    }
    if (isExpanded && !isValid && !propIsCompleted) {
      return <div className="w-2 h-2 bg-red-500 rounded-full"></div>;
    }
    return <div className="w-2 h-2 bg-gray-300 rounded-full"></div>;
  };

  return (
    <Card
      className={`bg-white rounded-lg transition-all duration-500 mb-4 ${className}`}
      data-step={stepId}
    >
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-full flex flex-col text-left px-4 sm:px-8 py-4 sm:py-6"
        aria-expanded={isExpanded}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {eyebrow && (
              <span className="text-sm text-gray-500 mb-1 block">
                {eyebrow}
              </span>
            )}
            <h3 className="text-lg font-semibold leading-tight">{title}</h3>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0 pt-1">
            {getStatusIcon()}
            <ChevronUpIcon
              className={`w-5 h-5 transform transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </div>
        {/* Only show summary when accordion is closed */}
        {summary && !isExpanded && (
          <p className="text-sm text-gray-600 mt-2">{summary}</p>
        )}
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 sm:px-8 pb-6" ref={contentRef}>
              <AccordionContent>{children}</AccordionContent>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};
