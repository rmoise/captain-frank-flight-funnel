"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import useStore from "@/store/index";
import { useStoreWithEqualityFn } from "zustand/traditional";
import { shallow } from "zustand/shallow";
import { ErrorMessage } from "@/components/ui/feedback/ErrorMessage";
import { ValidationPhase } from "@/types/shared/validation";
import type { Store } from "@/store/types";
import { defaultLocale } from "@/config/language";
import { getTranslation } from "@/translations";

// Type-safe JSON parse function
function safeJSONParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

// Define valid phases
const VALID_PHASES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
type ValidationStep = (typeof VALID_PHASES)[number];

// Define phase to path mapping
const PHASE_PATHS: Record<ValidationStep | 8, string> = {
  1: "/phases/initial-assessment",
  2: "/phases/compensation-estimate",
  3: "/phases/flight-details",
  4: "/phases/trip-experience",
  5: "/phases/claim-success",
  6: "/phases/agreement",
  7: "/phases/claim-submitted",
  8: "/phases/claim-rejected",
};

// Define phase names for back button text
const PHASE_NAMES: Record<ValidationStep | 8, string> = {
  1: "Initial Assessment",
  2: "Compensation Estimate",
  3: "Flight Details",
  4: "Trip Experience",
  5: "Claim Success",
  6: "Agreement",
  7: "Claim Submitted",
  8: "Claim Rejected",
};

// Define mapping from numeric phases to ValidationPhase enum
const PHASE_TO_VALIDATION_PHASE: Record<ValidationStep, ValidationPhase> = {
  1: ValidationPhase.INITIAL_ASSESSMENT,
  2: ValidationPhase.COMPENSATION_ESTIMATE,
  3: ValidationPhase.FLIGHT_DETAILS,
  4: ValidationPhase.TRIP_EXPERIENCE,
  5: ValidationPhase.CLAIM_SUCCESS,
  6: ValidationPhase.AGREEMENT,
  7: ValidationPhase.CLAIM_SUBMITTED,
  8: ValidationPhase.CLAIM_REJECTED,
};

// Define mapping from ValidationPhase enum to numeric phases
const VALIDATION_PHASE_TO_PHASE: Record<string, ValidationStep | undefined> = {
  [ValidationPhase.INITIAL_ASSESSMENT]: 1,
  [ValidationPhase.COMPENSATION_ESTIMATE]: 2,
  [ValidationPhase.FLIGHT_DETAILS]: 3,
  [ValidationPhase.TRIP_EXPERIENCE]: 4,
  [ValidationPhase.CLAIM_SUCCESS]: 5,
  [ValidationPhase.AGREEMENT]: 6,
  [ValidationPhase.CLAIM_SUBMITTED]: 7,
  [ValidationPhase.CLAIM_REJECTED]: 8 as any, // Casting since 8 is not in ValidationStep
  // Add remaining mappings for other enum values that don't map to numeric phases
  [ValidationPhase.PERSONAL_DETAILS]: undefined,
  [ValidationPhase.TERMS_AND_CONDITIONS]: undefined,
  [ValidationPhase.SUMMARY]: undefined,
  [ValidationPhase.CONFIRMATION]: undefined,
  [ValidationPhase.INITIAL]: undefined,
  [ValidationPhase.EXPERIENCE]: undefined,
  [ValidationPhase.JOURNEY]: undefined,
  [ValidationPhase.FINAL]: undefined,
  [ValidationPhase.STEP_1]: undefined,
  [ValidationPhase.STEP_2]: undefined,
  [ValidationPhase.STEP_3]: undefined,
  [ValidationPhase.STEP_4]: undefined,
  [ValidationPhase.STEP_5]: undefined,
};

// Helper function to extract phase from pathname (copied from NavigationProvider)
function getPhaseFromPathname(pathname: string): ValidationPhase | null {
  // Remove the language prefix (e.g., /en, /de) if it exists
  const pathWithoutLang = pathname.replace(/^\/[a-z]{2}(?=\/)/, "");

  const phaseMap: Record<string, ValidationPhase> = {
    "/phases/initial-assessment": ValidationPhase.INITIAL_ASSESSMENT,
    "/phases/compensation-estimate": ValidationPhase.COMPENSATION_ESTIMATE,
    "/phases/flight-details": ValidationPhase.FLIGHT_DETAILS,
    "/phases/trip-experience": ValidationPhase.TRIP_EXPERIENCE,
    "/phases/claim-success": ValidationPhase.CLAIM_SUCCESS,
    "/phases/claim-rejected": ValidationPhase.CLAIM_REJECTED,
    "/phases/agreement": ValidationPhase.AGREEMENT,
    "/phases/claim-submitted": ValidationPhase.CLAIM_SUBMITTED,
  };

  // Use the path without the language prefix for lookup
  return phaseMap[pathWithoutLang] || null;
}

export interface PhaseGuardProps {
  phase: ValidationStep;
  children: React.ReactNode;
  skipStoreUpdates?: boolean;
}

// Helper function to check if a phase is authorized
const isPhaseAuthorized = (
  phase: ValidationStep | string | number,
  completedPhases: ValidationPhase[],
  currentPhase: ValidationPhase,
  phasesCompletedViaContinue: number[],
  isClaimSuccess: boolean,
  isClaimRejected: boolean,
  pathname: string // Add pathname to check directly
): boolean => {
  // Convert string/number phase to a consistent numeric phase representation
  let numericPhase: number | null = null;
  if (typeof phase === "number") {
    // Ensure it's a valid phase number
    if (VALID_PHASES.includes(phase as ValidationStep)) {
      numericPhase = phase;
    }
  } else if (typeof phase === "string") {
    const parsed = parseInt(phase, 10);
    if (!isNaN(parsed) && VALID_PHASES.includes(parsed as ValidationStep)) {
      numericPhase = parsed;
    } else {
      const nameMap: { [key: string]: number } = {
        initial_assessment: 1,
        compensation_estimate: 2,
        flight_details: 3,
        trip_experience: 4,
        claim_success: 5,
        agreement: 6,
        claim_submitted: 7,
        claim_rejected: 8,
      };
      const mappedPhase = nameMap[phase.toLowerCase()];
      // Allow 8 even though it's not in VALID_PHASES
      if (
        mappedPhase &&
        (VALID_PHASES.includes(mappedPhase as ValidationStep) ||
          mappedPhase === 8)
      ) {
        numericPhase = mappedPhase;
      }
    }
  }

  if (numericPhase === null) return false;

  // Explicitly allow claim_rejected (phase 8)
  if (numericPhase === 8) {
    console.log(
      "[isPhaseAuthorized] Explicitly allowing access to phase 8 (claim-rejected)"
    );
    return true;
  }

  // Special case for phase 1 (always accessible)
  if (numericPhase === 1) {
    return true;
  }

  // Special case for claim success/rejected conflicts
  // Check numeric phase directly
  if (numericPhase === 5 && isClaimRejected) return false;
  if (numericPhase === 8 && isClaimSuccess) return false; // Already handled above, but safe check

  // === NEW CHECK FOR PHASE 2 ===
  if (numericPhase === 2) {
    const phase1ValidationPhase = PHASE_TO_VALIDATION_PHASE[1];
    if (
      completedPhases.includes(phase1ValidationPhase) &&
      !phasesCompletedViaContinue.includes(1)
    ) {
      return false;
    }
  }

  // The current page can be accessed if the URL matches the expected phase
  const currentPhaseFromPath = getPhaseFromPathname(pathname);
  const numericPhaseFromPath = currentPhaseFromPath
    ? VALIDATION_PHASE_TO_PHASE[currentPhaseFromPath]
    : null;

  if (numericPhaseFromPath === numericPhase) {
    console.log(
      `[isPhaseAuthorized] Access granted: Current path phase (${numericPhaseFromPath}) matches requested phase (${numericPhase}).`
    );
    return true;
  }

  // Any completed phase can be accessed
  // Fix type predicate for filter: ensure p is not undefined and is a valid ValidationStep
  const completedNumericPhases = completedPhases
    .map((p) => VALIDATION_PHASE_TO_PHASE[p])
    .filter(
      (p): p is ValidationStep =>
        p !== undefined && VALID_PHASES.includes(p as ValidationStep)
    );

  if (completedNumericPhases.includes(numericPhase as ValidationStep)) {
    // Cast numericPhase here
    console.log(
      `[isPhaseAuthorized] Access granted: Phase ${numericPhase} is in completed phases.`
    );
    return true;
  }

  // Phase after the last completed one is accessible
  const lastCompletedNumericPhase =
    completedNumericPhases.length > 0 ? Math.max(...completedNumericPhases) : 0;
  // Cast numericPhase for comparison
  if (
    numericPhase === lastCompletedNumericPhase + 1 &&
    VALID_PHASES.includes(numericPhase as ValidationStep)
  ) {
    console.log(
      `[isPhaseAuthorized] Access granted: Phase ${numericPhase} is the next phase after last completed (${lastCompletedNumericPhase}).`
    );
    return true;
  }

  // Default: Deny access
  console.log(`[isPhaseAuthorized] Access denied for phase ${numericPhase}.`);
  return false;
};

// Function to get a valid phase to navigate to
function getValidPhaseToNavigate(
  currentPhase: ValidationPhase,
  completedPhases: ValidationPhase[]
): ValidationStep {
  // Convert ValidationPhase enum to numeric phase
  const currentNumericPhase = VALIDATION_PHASE_TO_PHASE[currentPhase] || 1;

  if (!VALID_PHASES.includes(currentNumericPhase as ValidationStep)) {
    // Filter completed phases to get only valid numeric phases
    const validCompletedPhases = completedPhases
      .map((phase) => VALIDATION_PHASE_TO_PHASE[phase])
      .filter(
        (phase) =>
          phase !== undefined && VALID_PHASES.includes(phase as ValidationStep)
      ) as ValidationStep[];

    if (validCompletedPhases.length > 0) {
      return Math.max(...validCompletedPhases) as ValidationStep;
    } else {
      return 1 as ValidationStep;
    }
  }

  return currentNumericPhase as ValidationStep;
}

// Function to get the appropriate phase to navigate to
function getAppropriatePhaseToNavigate(
  phase: ValidationStep,
  currentPhase: ValidationPhase,
  completedPhases: ValidationPhase[],
  phasesCompletedViaContinue: number[]
): ValidationStep {
  // Get the valid phase to navigate to
  const targetPhase = getValidPhaseToNavigate(currentPhase, completedPhases);

  // Special handling for phase 2 (compensation-estimate)
  if (phase === 2) {
    // Navigate to phase 1 if it wasn't completed via continue button
    if (!phasesCompletedViaContinue.includes(1)) {
      return 1 as ValidationStep;
    }
  }

  // Special handling for phase 3 (flight-details)
  if (phase === 3) {
    // Check if phase 2 was completed via store
    const phase2ValidationKey = PHASE_TO_VALIDATION_PHASE[2];
    const isPhase2CompletedInStore =
      completedPhases.includes(phase2ValidationKey);

    // Navigate to phase 2 if it wasn't completed
    if (!isPhase2CompletedInStore && !phasesCompletedViaContinue.includes(2)) {
      return 2 as ValidationStep;
    }
  }

  // Special handling for phase 5 (claim-success)
  if (phase === 5) {
    // Navigate to phase 4 (trip-experience) if not completed
    const validationPhase = PHASE_TO_VALIDATION_PHASE[4];
    if (!completedPhases.includes(validationPhase)) {
      return 4 as ValidationStep;
    }
  }

  // Special handling for phase 6 (agreement)
  if (phase === 6) {
    // Navigate to phase 5 (claim-success) if not completed
    const validationPhase = PHASE_TO_VALIDATION_PHASE[5];
    if (!completedPhases.includes(validationPhase)) {
      return 5 as ValidationStep;
    }
  }

  // Special handling for phase 7 (claim-submitted)
  if (phase === 7) {
    // Navigate to phase 6 (agreement) if not completed
    const validationPhase = PHASE_TO_VALIDATION_PHASE[6];
    if (!completedPhases.includes(validationPhase)) {
      return 6 as ValidationStep;
    }

    // Check URL for claim_id parameter which indicates successful submission
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const claimId = url.searchParams.get("claim_id");

      // If no claim_id, redirect to agreement page
      if (!claimId) {
        return 6 as ValidationStep;
      }
    }
  }

  // If the target phase is the same as the current phase (which shouldn't be accessible),
  // find the highest completed phase that is not the current phase
  if (targetPhase === phase) {
    // Convert ValidationPhase values to numeric phases
    const validCompletedPhases = completedPhases
      .map((phaseValue) => VALIDATION_PHASE_TO_PHASE[phaseValue])
      .filter(
        (numericPhase) =>
          numericPhase !== undefined &&
          VALID_PHASES.includes(numericPhase as ValidationStep) &&
          numericPhase !== phase
      ) as ValidationStep[];

    if (validCompletedPhases.length > 0) {
      // Navigate to the highest completed phase that is not the current phase
      return Math.max(...validCompletedPhases) as ValidationStep;
    } else {
      // Default to phase 1 if no valid completed phases
      return 1 as ValidationStep;
    }
  }

  return targetPhase;
}

// Main PhaseGuard component
export const PhaseGuard: React.FC<PhaseGuardProps> = memo((props) => {
  const {
    phase: expectedPhaseProp,
    children,
    skipStoreUpdates = false,
  } = props;
  const router = useRouter();
  const pathname = usePathname(); // Returns string | null
  const { t } = useTranslation();
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isStoreInitialized = useStoreWithEqualityFn(
    useStore,
    (state: Store) => state.core.isInitialized,
    shallow
  );
  const {
    completedPhases,
    currentPhase,
    phasesCompletedViaContinue,
    isClaimSuccess,
    isClaimRejected,
  } = useStoreWithEqualityFn(
    useStore,
    (state: Store) => state.navigation,
    shallow
  );
  const isTransitioning = useStoreWithEqualityFn(
    useStore,
    (state: Store) => state.navigation.isTransitioning,
    shallow
  );
  const redirectAttempted = useRef(false);

  // Main authorization and redirection effect
  useEffect(() => {
    // Skip if store isn't ready or no pathname
    if (!isStoreInitialized || !pathname) {
      console.log(
        "PhaseGuard: Skipping effect - Store not initialized or no pathname."
      );
      setIsLoading(true);
      return;
    }

    // Determine the phase based on the current URL
    const urlPhase = getPhaseFromPathname(pathname);
    const expectedValidationPhase =
      PHASE_TO_VALIDATION_PHASE[expectedPhaseProp];

    console.log("=== PhaseGuard - CHECKING AUTHORIZATION ===", {
      expectedPhaseProp,
      expectedValidationPhase,
      pathname,
      urlPhase,
      currentPhaseFromStore: currentPhase,
      completedPhases,
      isStoreInitialized,
      isTransitioning,
      isClaimSuccess,
      isClaimRejected,
      skipStoreUpdates, // Log this prop
    });

    // Call the authorization function, passing pathname
    const shouldBeAuthorized = isPhaseAuthorized(
      expectedPhaseProp,
      completedPhases,
      currentPhase,
      phasesCompletedViaContinue || [], // Provide default empty array
      isClaimSuccess || false, // Provide default false
      isClaimRejected || false, // Provide default false
      pathname // Pass pathname here
    );

    if (shouldBeAuthorized) {
      console.log(
        `PhaseGuard: Setting authorized for phase ${expectedPhaseProp}.`
      );
      setIsAuthorized(true);
      setIsLoading(false);
      setErrorMessage(null);
      redirectAttempted.current = false; // Reset redirect flag if authorized
    } else {
      console.log(
        `PhaseGuard: Setting NOT authorized for phase ${expectedPhaseProp}. Attempting redirect.`
      );
      setIsAuthorized(false);
      setErrorMessage(null); // Clear previous errors before potential redirect

      // Only redirect if not already transitioning and haven't tried yet
      if (!isTransitioning && !redirectAttempted.current) {
        redirectAttempted.current = true;

        const targetRedirectPhase = getAppropriatePhaseToNavigate(
          expectedPhaseProp,
          currentPhase,
          completedPhases,
          phasesCompletedViaContinue || [] // Provide default empty array
        );

        if (targetRedirectPhase) {
          const targetPath = PHASE_PATHS[targetRedirectPhase];
          // Use defaultLocale if lang is missing (shouldn't happen with middleware)
          const lang = pathname?.split("/")[1] || defaultLocale;
          const redirectUrl = `/${lang}${targetPath}`;
          console.log(`PhaseGuard: Redirecting to ${redirectUrl}`);
          router.replace(redirectUrl);
          // Keep loading true while redirecting
          setIsLoading(true);
        } else {
          console.error(
            `PhaseGuard: Authorization failed for phase ${expectedPhaseProp}, but no redirect target determined.`
          );
          // Don't show error message during transitions to avoid flash of error content
          // setErrorMessage(t("errors.phaseGuard.authorizationFailed"));
          setIsLoading(false); // Stop loading if error occurs
        }
      } else {
        console.log(
          "PhaseGuard: Skipping redirect (already transitioning or attempted)."
        );
        // If we skipped redirect but aren't authorized, show loading briefly
        // but don't get stuck if redirect fails multiple times.
        if (!isAuthorized) setIsLoading(false);
      }
    }

    // Add skipStoreUpdates to dependencies
  }, [
    isStoreInitialized,
    expectedPhaseProp,
    pathname,
    currentPhase,
    completedPhases,
    phasesCompletedViaContinue,
    isClaimSuccess,
    isClaimRejected,
    router,
    isTransitioning,
    t,
    skipStoreUpdates, // Add skipStoreUpdates dependency
  ]);

  // Render Loading State
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f7fa",
        }}
      >
        {/* Consistent Loading Spinner */}
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render Error Message if authorization fails and redirect doesn't happen
  // Suppress error messages during form submissions to prevent flash of error content
  if (errorMessage && !isTransitioning) {
    return (
      <div style={{ padding: "20px" }}>
        <p className="text-red-600 font-semibold">Authorization Error</p>
        <p className="text-red-500 mt-2">{errorMessage}</p>
      </div>
    );
  }

  // Render children only if authorized
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Don't render anything during transitions to prevent flash of unauthorized content
  if (isTransitioning) {
    return null;
  }

  // Fallback if not authorized and not loading/error (should ideally be handled by redirect)
  console.log(
    `PhaseGuard: Rendering fallback (null) for phase ${expectedPhaseProp} as not authorized.`
  );
  return null;
});

PhaseGuard.displayName = "PhaseGuard";
