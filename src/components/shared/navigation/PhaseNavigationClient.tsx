"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useValidation } from "@/store/hooks/useValidation";
import { ValidationPhase } from "@/types/shared/validation";

interface PhaseNavigationClientProps {
  phase: ValidationPhase;
}

export function PhaseNavigationClient({ phase }: PhaseNavigationClientProps) {
  const router = useRouter();
  const { getStepValidation } = useValidation();
  const validationState = getStepValidation(phase);

  const handleNext = useCallback(() => {
    if (validationState.isValid && validationState.isComplete) {
      // Get next phase based on current phase
      const nextPhase = getNextPhase(phase);
      if (nextPhase) {
        router.push(`/phases/${nextPhase.toLowerCase()}`);
      }
    }
  }, [router, phase, validationState.isValid, validationState.isComplete]);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <div className="flex justify-between items-center mt-6">
      <Button
        variant="outline"
        onClick={handleBack}
        className="w-[120px]"
        aria-label="Go back to previous page"
      >
        Back
      </Button>

      <Button
        onClick={handleNext}
        disabled={!validationState.isValid || !validationState.isComplete}
        className="w-[120px]"
        aria-label="Continue to next phase"
      >
        Continue
      </Button>
    </div>
  );
}

// Helper function to determine the next phase
function getNextPhase(currentPhase: ValidationPhase): string {
  const phaseOrder: Record<ValidationPhase, string | undefined> = {
    [ValidationPhase.INITIAL_ASSESSMENT]: "compensation-estimate",
    [ValidationPhase.COMPENSATION_ESTIMATE]: "flight-details",
    [ValidationPhase.PERSONAL_DETAILS]: "terms-and-conditions",
    [ValidationPhase.TERMS_AND_CONDITIONS]: "summary",
    [ValidationPhase.SUMMARY]: "confirmation",
    [ValidationPhase.CONFIRMATION]: "claim-success",
    [ValidationPhase.FLIGHT_DETAILS]: "trip-experience",
    [ValidationPhase.TRIP_EXPERIENCE]: "agreement",
    [ValidationPhase.AGREEMENT]: "claim-success",
    [ValidationPhase.CLAIM_SUCCESS]: undefined,
    [ValidationPhase.CLAIM_REJECTED]: undefined,
    [ValidationPhase.CLAIM_SUBMITTED]: undefined,
    [ValidationPhase.INITIAL]: "experience",
    [ValidationPhase.EXPERIENCE]: "journey",
    [ValidationPhase.JOURNEY]: "final",
    [ValidationPhase.FINAL]: undefined,
    [ValidationPhase.STEP_1]: undefined,
    [ValidationPhase.STEP_2]: undefined,
    [ValidationPhase.STEP_3]: undefined,
    [ValidationPhase.STEP_4]: undefined,
    [ValidationPhase.STEP_5]: undefined,
  };

  return phaseOrder[currentPhase] || "initial-assessment";
}
