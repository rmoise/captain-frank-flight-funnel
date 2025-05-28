import React from "react";
import { AccordionCardClient } from "./AccordionCardClient";

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isActive?: boolean;
  isCompleted: boolean;
  eyebrow?: string;
  summary?: string;
  className?: string;
  shouldStayOpen?: boolean;
  hasInteracted?: boolean;
  isOpenByDefault?: boolean;
  stepId?: string;
  isValid?: boolean;
  isQA?: boolean;
  isOpen?: boolean;
  onToggle?: (stepId: string, isOpen: boolean) => void;
  onInteraction?: () => void;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  subtitle,
  children,
  isActive,
  isCompleted,
  eyebrow,
  summary,
  className = "",
  shouldStayOpen = false,
  hasInteracted = false,
  isOpenByDefault = false,
  stepId = "1",
  isValid = false,
  isQA = false,
  isOpen,
  onToggle,
  onInteraction,
}) => {
  // Add debugging to see what props are being passed
  console.log(`[AccordionCard] Rendering step ${stepId}:`, {
    title,
    isCompleted,
    isValid,
    isActive,
    isOpen,
  });

  return (
    <AccordionCardClient
      title={title}
      subtitle={subtitle}
      isCompleted={isCompleted}
      eyebrow={eyebrow}
      summary={summary}
      className={`${className} ${
        isActive
          ? "shadow-lg ring-1 ring-black/5 -translate-y-1"
          : "shadow-none translate-y-0"
      }`}
      shouldStayOpen={shouldStayOpen}
      hasInteracted={hasInteracted}
      isOpenByDefault={isOpenByDefault || isOpen}
      stepId={stepId}
      isValid={isValid}
      isQA={isQA}
      onToggle={onToggle}
      onInteraction={onInteraction}
    >
      {children}
    </AccordionCardClient>
  );
};
