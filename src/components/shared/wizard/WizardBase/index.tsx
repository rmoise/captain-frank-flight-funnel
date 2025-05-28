"use client";

declare global {
  interface Window {
    __wizardSuccessTimeout?: NodeJS.Timeout;
    __inClaimRejectedContext?: boolean;
  }
}

import React, { useMemo, useEffect, useState } from "react";
import { Answer, Question } from "@/types/shared/wizard";
import type { Flight } from "@/store/types";
import { Phase1QAWizard } from "../Phase1QAWizard";
import { Phase4QAWizard } from "../Phase4QAWizard";
import useStore from "@/store";
import { ProgressBar } from "./ProgressBar";
import { Navigation } from "./Navigation";

interface WizardBaseProps {
  questions: Question[];
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  isStepComplete: boolean;
  children: React.ReactNode;
  onComplete?: (answers: Answer[]) => void;
  initialAnswers?: Answer[];
  selectedFlight?: Flight | null;
  phase?: number;
  wizardType?: "travel_status" | "informed_date";
}

// Enhance the isSafeToRenderPhase4 function
const isSafeToRenderPhase4 = (pathname: string): boolean => {
  // Check for explicit global flag first (most reliable)
  if (typeof window !== "undefined" && window.__inClaimRejectedContext) {
    console.log("[WizardBase] Detected claim-rejected context via global flag");
    return false;
  }

  // Check pathname as fallback
  if (pathname.includes("/claim-rejected")) {
    console.log("[WizardBase] Detected claim-rejected context via pathname");
    return false;
  }

  return true;
};

export const WizardBase: React.FC<WizardBaseProps> = ({
  questions,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  isStepComplete,
  children,
  onComplete,
  initialAnswers = [],
  selectedFlight,
  phase = 1,
  wizardType: passedWizardType,
}) => {
  const store = useStore();
  // Improve safety check with useMemo to prevent unnecessary re-evaluations
  const isSafeContext = useMemo(() => {
    // Always safe for phases other than 4
    if (phase !== 4) return true;

    // Check if we're in claim-rejected context
    if (typeof window !== "undefined") {
      // Check global flag first (most reliable)
      if (window.__inClaimRejectedContext) {
        console.log(
          "[WizardBase] Detected claim-rejected context via global flag"
        );
        return false;
      }

      // Check pathname as secondary check
      if (window.location.pathname.includes("/claim-rejected")) {
        console.log(
          "[WizardBase] Detected claim-rejected context via pathname"
        );
        return false;
      }
    }

    return true;
  }, [phase]);

  // Determine wizard type based on first question ID
  const wizardType = useMemo(() => {
    if (passedWizardType) {
      return passedWizardType;
    }

    const firstQuestionId = questions[0]?.id;
    if (!firstQuestionId) return "default";

    if (firstQuestionId.startsWith("issue_")) {
      return "issue";
    }

    if (
      firstQuestionId === "informed_date" ||
      firstQuestionId === "specific_informed_date"
    ) {
      return "informed_date";
    }
    if (
      firstQuestionId === "travel_status" ||
      firstQuestionId === "refund_status" ||
      firstQuestionId === "ticket_cost"
    ) {
      return "travel_status";
    }

    const type = firstQuestionId.split("_")[0];
    return type === "travel" ? "travel_status" : type;
  }, [questions, passedWizardType]);

  // For phase 1, use the dedicated Phase1QAWizard
  if (phase === 1) {
    const handlePhase1Complete = () => {
      if (onComplete) {
        onComplete(store.wizard.answers);
      }
    };

    return (
      <div className="w-full space-y-6">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

        <div className="min-h-[300px]">
          <Phase1QAWizard
            questions={questions}
            onComplete={handlePhase1Complete}
            store={store}
          />
        </div>

        <Navigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onBack={onBack}
          isStepComplete={isStepComplete}
        />
      </div>
    );
  }

  // For phase 4, use the dedicated Phase4QAWizard ONLY if safe
  if (phase === 4 && isSafeContext) {
    return (
      <div className="w-full space-y-6">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

        <div className="min-h-[300px]">
          <Phase4QAWizard
            questions={questions}
            onComplete={onComplete}
            initialAnswers={initialAnswers}
            selectedFlight={selectedFlight}
            wizardType={
              (wizardType as "travel_status" | "informed_date") ||
              "travel_status"
            }
          />
        </div>

        <Navigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onBack={onBack}
          isStepComplete={isStepComplete}
        />
      </div>
    );
  }

  // Return a simpler component for phase 4 when in claim-rejected context
  if (phase === 4) {
    return (
      <div className="w-full space-y-6">
        <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />
        <div className="min-h-[300px]">
          {/* Simple placeholder with no store dependencies */}
          <div className="py-4">
            <p className="text-center text-gray-500">
              Content not available in this context
            </p>
          </div>
        </div>
        <Navigation
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={onNext}
          onBack={onBack}
          isStepComplete={isStepComplete}
        />
      </div>
    );
  }

  // For other phases, show placeholder
  return (
    <div className="w-full space-y-6">
      <ProgressBar currentStep={currentStep} totalSteps={totalSteps} />

      <div className="min-h-[300px]">{children}</div>

      <Navigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onNext={onNext}
        onBack={onBack}
        isStepComplete={isStepComplete}
      />
    </div>
  );
};
