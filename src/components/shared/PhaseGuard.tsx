"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import useStore from "@/lib/state/store";
import { ErrorMessage } from "./ErrorMessage";
import type { ValidationStep } from "@/lib/state/types";

// Define valid phases
const VALID_PHASES: ValidationStep[] = [1, 2, 3, 4, 5, 6, 7];

// Define phase to path mapping
const PHASE_PATHS = {
  1: "/phases/initial-assessment",
  2: "/phases/compensation-estimate",
  3: "/phases/flight-details",
  4: "/phases/trip-experience",
  5: "/phases/claim-success",
  6: "/phases/agreement",
  7: "/phases/claim-submitted",
  8: "/phases/claim-rejected",
} as const;

// Define phase names for back button text
const PHASE_NAMES = {
  1: "Initial Assessment",
  2: "Compensation Estimate",
  3: "Flight Details",
  4: "Trip Experience",
  5: "Claim Success",
  6: "Agreement",
  7: "Claim Submitted",
  8: "Claim Rejected",
} as const;

export interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

// PhaseGuard component that checks if the user is authorized to access the page
export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation();
  const store = useStore();
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [blockReason, setBlockReason] = useState<
    "default" | "claimSuccess" | "claimRejected"
  >("default");

  // Refs to prevent infinite loops
  const storeUpdateAttemptRef = useRef(0);
  const hasUpdatedStoreRef = useRef(false);

  // Logging control
  const logRef = useRef({
    lastLogTime: 0,
    lastLogType: "",
  });

  const controlledLog = (type: string, data: any) => {
    const now = Date.now();
    // Only log the same type of message once every 3 seconds
    if (
      now - logRef.current.lastLogTime > 3000 ||
      logRef.current.lastLogType !== type
    ) {
      console.log(`=== PhaseGuard - ${type} ===`, {
        ...data,
        timestamp: new Date().toISOString(),
      });
      logRef.current = {
        lastLogTime: now,
        lastLogType: type,
      };
    }
  };

  // Helper function to get a valid phase to navigate to
  const getValidPhaseToNavigate = (): ValidationStep => {
    // Start with the current phase from the store
    let targetPhase = store.currentPhase;

    // Ensure it's within valid range
    if (!VALID_PHASES.includes(targetPhase)) {
      // If current phase is invalid, find the highest completed phase
      const completedPhases = store.completedPhases || [];
      const validCompletedPhases = completedPhases.filter((p) =>
        VALID_PHASES.includes(p as ValidationStep)
      ) as ValidationStep[];

      if (validCompletedPhases.length > 0) {
        // Navigate to the highest completed phase
        targetPhase = Math.max(...validCompletedPhases) as ValidationStep;
      } else {
        // Default to phase 1 if no valid completed phases
        targetPhase = 1;
      }
    }

    return targetPhase;
  };

  // Helper function to get the appropriate phase to navigate to
  const getAppropriatePhaseToNavigate = (): ValidationStep => {
    // Get the valid phase to navigate to
    const targetPhase = getValidPhaseToNavigate();

    // Special handling for phase 2 (compensation-estimate)
    if (phase === 2) {
      // Check if phase 1 was completed via continue button
      const phasesCompletedViaContinueStr = localStorage.getItem(
        "phasesCompletedViaContinue"
      );
      const phasesCompletedViaContinue = phasesCompletedViaContinueStr
        ? JSON.parse(phasesCompletedViaContinueStr)
        : [];

      // Navigate to phase 1 if it wasn't completed via continue button
      if (!phasesCompletedViaContinue.includes(1)) {
        return 1 as ValidationStep;
      }
    }

    // Special handling for phase 3 (flight-details)
    if (phase === 3) {
      // Check if phase 2 was completed
      const completedPhasesStr = localStorage.getItem("completedPhases");
      const completedPhases = completedPhasesStr
        ? JSON.parse(completedPhasesStr)
        : [];

      const phasesCompletedViaContinueStr = localStorage.getItem(
        "phasesCompletedViaContinue"
      );
      const phasesCompletedViaContinue = phasesCompletedViaContinueStr
        ? JSON.parse(phasesCompletedViaContinueStr)
        : [];

      // Navigate to phase 2 if it wasn't completed
      if (
        !completedPhases.includes(2) &&
        !phasesCompletedViaContinue.includes(2)
      ) {
        return 2 as ValidationStep;
      }
    }

    // Special handling for phase 5 (claim-success)
    if (phase === 5) {
      // Navigate to phase 4 (trip-experience) if not completed
      if (!store.completedPhases.includes(4)) {
        return 4 as ValidationStep;
      }
    }

    // Special handling for phase 6 (agreement)
    if (phase === 6) {
      // Navigate to phase 5 (claim-success) if not completed
      if (!store.completedPhases.includes(5)) {
        return 5 as ValidationStep;
      }
    }

    // Special handling for phase 7 (claim-submitted)
    if (phase === 7) {
      // Navigate to phase 6 (agreement) if not completed
      if (!store.completedPhases.includes(6)) {
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
      const completedPhases = store.completedPhases || [];
      const validCompletedPhases = completedPhases.filter(
        (p) => VALID_PHASES.includes(p as ValidationStep) && p !== phase
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
  };

  // Helper function to get appropriate back button text
  const getBackButtonText = (): string => {
    // Get the appropriate phase to navigate to
    const actualTargetPhase = getAppropriatePhaseToNavigate();

    // Get the phase name for the button text
    const phaseName = PHASE_NAMES[actualTargetPhase] || "Previous Step";

    // Use translation if available, otherwise use a generic message with the phase name
    return (
      t.phases?.unauthorized?.backText?.[actualTargetPhase] ||
      t.common?.back ||
      `Go back to ${phaseName}`
    );
  };

  // Effect to initialize store from localStorage if needed
  useEffect(() => {
    // Only run this once
    if (hasUpdatedStoreRef.current) return;

    // Check if we need to initialize from localStorage
    const shouldInitialize =
      (!store.completedPhases || store.completedPhases.length === 0) &&
      (!store.phasesCompletedViaContinue ||
        store.phasesCompletedViaContinue.length === 0);

    if (shouldInitialize) {
      try {
        // Get data from localStorage
        const completedPhasesStr = localStorage.getItem("completedPhases");
        const phasesCompletedViaContinueStr = localStorage.getItem(
          "phasesCompletedViaContinue"
        );
        const currentPhaseStr = localStorage.getItem("currentPhase");

        // Parse data if available
        const completedPhases = completedPhasesStr
          ? JSON.parse(completedPhasesStr)
          : [];
        const phasesCompletedViaContinue = phasesCompletedViaContinueStr
          ? JSON.parse(phasesCompletedViaContinueStr)
          : [];
        const currentPhaseValue = currentPhaseStr
          ? parseInt(currentPhaseStr, 10)
          : 1;

        // Ensure currentPhase is a valid phase
        const currentPhase = (
          VALID_PHASES.includes(currentPhaseValue as ValidationStep)
            ? currentPhaseValue
            : 1
        ) as ValidationStep;

        // Log initialization
        controlledLog("Store Initialization", {
          completedPhases,
          phasesCompletedViaContinue,
          currentPhase,
          timestamp: new Date().toISOString(),
        });

        // Update store if we found data and changes are needed
        const needsUpdate =
          completedPhases.length > 0 ||
          phasesCompletedViaContinue.length > 0 ||
          currentPhase !== store.currentPhase;

        if (needsUpdate) {
          hasUpdatedStoreRef.current = true; // Set this first to prevent recursive updates
          useStore.setState({
            completedPhases,
            phasesCompletedViaContinue,
            currentPhase,
            _lastUpdate: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error initializing store from localStorage:", error);
      }
    }
    // Explicitly list dependencies to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount, don't add dependencies

  // Effect to update store when claim is successful
  useEffect(() => {
    // Only run this for phase 5 (claim-success) and phase 6 (agreement)
    if (phase !== 5 && phase !== 6) return;

    // Check if claim is successful and we haven't updated the store yet
    if (
      store._isClaimSuccess &&
      !hasUpdatedStoreRef.current &&
      storeUpdateAttemptRef.current < 3
    ) {
      storeUpdateAttemptRef.current += 1;

      // Get URL parameters
      const url = new URL(window.location.href);
      const bypassCheck = url.searchParams.get("bypass_phase_check") === "true";
      const redirected = url.searchParams.get("redirected") === "true";
      const completedPhasesParam = url.searchParams.get("completed_phases");

      controlledLog("Claim Success Store Update", {
        phase,
        isClaimSuccess: store._isClaimSuccess,
        currentPhase: store.currentPhase,
        completedPhases: store.completedPhases,
        phasesCompletedViaContinue: store.phasesCompletedViaContinue,
        bypassCheck,
        redirected,
        completedPhasesParam,
        updateAttempt: storeUpdateAttemptRef.current,
      });

      // Mark the update as processed before making changes to prevent loops
      hasUpdatedStoreRef.current = true;

      // If we're on phase 5 (claim-success), ensure phases 1-4 are completed
      if (phase === 5) {
        const phasesToComplete = [1, 2, 3, 4] as ValidationStep[];
        const newCompletedPhases = [
          ...new Set([...store.completedPhases, ...phasesToComplete]),
        ] as ValidationStep[];
        const newPhasesCompletedViaContinue = [
          ...new Set([
            ...store.phasesCompletedViaContinue,
            ...phasesToComplete,
          ]),
        ] as ValidationStep[];

        // Update store with completed phases
        useStore.setState({
          completedPhases: newCompletedPhases,
          phasesCompletedViaContinue: newPhasesCompletedViaContinue,
          currentPhase: 5 as ValidationStep,
          _lastUpdate: Date.now(),
        });

        // Update localStorage
        localStorage.setItem(
          "completedPhases",
          JSON.stringify(newCompletedPhases)
        );
        localStorage.setItem(
          "phasesCompletedViaContinue",
          JSON.stringify(newPhasesCompletedViaContinue)
        );
        localStorage.setItem("currentPhase", "5");
      }

      // If we're on phase 6 (agreement), ensure phases 1-5 are completed
      if (phase === 6) {
        const phasesToComplete = [1, 2, 3, 4, 5] as ValidationStep[];
        const newCompletedPhases = [
          ...new Set([...store.completedPhases, ...phasesToComplete]),
        ] as ValidationStep[];
        const newPhasesCompletedViaContinue = [
          ...new Set([
            ...store.phasesCompletedViaContinue,
            ...phasesToComplete,
          ]),
        ] as ValidationStep[];

        // Update store with completed phases
        useStore.setState({
          completedPhases: newCompletedPhases,
          phasesCompletedViaContinue: newPhasesCompletedViaContinue,
          currentPhase: 6 as ValidationStep,
          _lastUpdate: Date.now(),
        });

        // Update localStorage
        localStorage.setItem(
          "completedPhases",
          JSON.stringify(newCompletedPhases)
        );
        localStorage.setItem(
          "phasesCompletedViaContinue",
          JSON.stringify(newPhasesCompletedViaContinue)
        );
        localStorage.setItem("currentPhase", "6");
      }
    }
    // Use a limited set of dependencies to prevent infinite updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, store._isClaimSuccess]);

  // Check for debug mode
  const [showDebug, setShowDebug] = useState(false);

  // Effect to check for debug mode
  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const debug = url.searchParams.get("debug_phase_guard") === "true";
      setShowDebug(debug);
    }
  }, []);

  // Create ref to track initialization status
  const hasCheckedAuthRef = React.useRef(false);

  // Check if the user is authorized to access the page
  useEffect(() => {
    // Only check once to prevent loops
    if (hasCheckedAuthRef.current) return;
    hasCheckedAuthRef.current = true;

    // Phase 1 is always accessible
    if (phase === 1) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    // Use the most reliable source of truth - localStorage - to prevent circular dependencies
    try {
      const currentPhaseStr = localStorage.getItem("currentPhase");
      const completedPhasesStr = localStorage.getItem("completedPhases");
      const currentPhase = currentPhaseStr ? parseInt(currentPhaseStr, 10) : 1;
      const completedPhases = completedPhasesStr
        ? JSON.parse(completedPhasesStr)
        : [];

      // Check for URL parameters that might bypass phase checks
      const url = new URL(window.location.href);
      const bypassCheck = url.searchParams.get("bypass_phase_check") === "true";
      const sharedFlightParam = url.searchParams.get("shared_flight");

      // Also check for shared link flag in localStorage
      const hasSharedLink = Boolean(sharedFlightParam);
      const hasSharedLinkFlag =
        localStorage.getItem("_sharedFlightData") === "true";

      // Special case for trip-experience page (phase 4) with shared link
      if (phase === 4 && (hasSharedLink || hasSharedLinkFlag)) {
        // Allow access for shared links
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // Special case for phase 4 (trip-experience) - check if phases 1-3 are completed
      if (phase === 4) {
        const requiredPhases = [1, 2, 3];
        const isAuthorized =
          bypassCheck ||
          phase === currentPhase ||
          completedPhases.includes(phase) ||
          phase < currentPhase ||
          requiredPhases.every((p) => completedPhases.includes(p));

        setIsAuthorized(isAuthorized);
        setIsLoading(false);
        return;
      }

      // Special case for phase 2 (compensation-estimate) - ensure phase 1 is completed via continue
      if (phase === 2) {
        const phasesCompletedViaContinueStr = localStorage.getItem(
          "phasesCompletedViaContinue"
        );
        const phasesCompletedViaContinue = phasesCompletedViaContinueStr
          ? JSON.parse(phasesCompletedViaContinueStr)
          : [];

        const isAuthorized =
          bypassCheck ||
          phase === currentPhase ||
          completedPhases.includes(phase) ||
          phase < currentPhase ||
          phasesCompletedViaContinue.includes(1);

        console.log("=== PhaseGuard - Phase 2 Authorization Check ===", {
          isAuthorized,
          bypassCheck,
          currentPhase,
          completedPhases,
          phasesCompletedViaContinue,
          phase1CompletedViaContinue: phasesCompletedViaContinue.includes(1),
          timestamp: new Date().toISOString(),
        });

        setIsAuthorized(isAuthorized);
        setIsLoading(false);
        return;
      }

      // Special case for phase 3 (flight-details) - ensure phase 2 is completed via continue
      if (phase === 3) {
        const phasesCompletedViaContinueStr = localStorage.getItem(
          "phasesCompletedViaContinue"
        );
        const phasesCompletedViaContinue = phasesCompletedViaContinueStr
          ? JSON.parse(phasesCompletedViaContinueStr)
          : [];

        // Additional debug for phase 2 completion state
        const phase2StateStr = localStorage.getItem("phase2State");
        const phase2StateObj = phase2StateStr ? JSON.parse(phase2StateStr) : {};
        const phase2ExplicitlyCompleted = localStorage.getItem(
          "phase2_explicitlyCompleted"
        );
        const phase2Simple = localStorage.getItem("phase2_simple");

        // Check if phase 2 is completed via continue or if it's in completed phases
        const isAuthorized =
          bypassCheck ||
          phase === currentPhase ||
          completedPhases.includes(phase) ||
          phase < currentPhase ||
          completedPhases.includes(2) ||
          phasesCompletedViaContinue.includes(2);

        console.log(
          "=== PhaseGuard - Phase 3 Authorization Check [DETAILED] ===",
          {
            isAuthorized,
            bypassCheck,
            currentPhase,
            completedPhases,
            phasesCompletedViaContinue,
            phase2Completed: completedPhases.includes(2),
            phase2CompletedViaContinue: phasesCompletedViaContinue.includes(2),
            phase2StateExists: !!phase2StateStr,
            phase2StateHasExplicitlyCompleted:
              phase2StateObj._explicitlyCompleted,
            phase2ExplicitlyCompletedFlag: phase2ExplicitlyCompleted,
            phase2SimpleExists: !!phase2Simple,
            timestamp: new Date().toISOString(),
          }
        );

        setIsAuthorized(isAuthorized);
        setIsLoading(false);
        return;
      }

      // For all other phases including 5 (claim-success) and 6 (agreement)
      // Check if the user has completed the required previous phases
      let isAuthorized =
        bypassCheck ||
        phase === currentPhase ||
        completedPhases.includes(phase) ||
        phase < currentPhase;

      // Special case for phase 5 (claim-success)
      if (phase === 5) {
        // If user has a rejected claim, they shouldn't be able to access claim-success
        if (store._isClaimRejected) {
          setIsAuthorized(false);
          setBlockReason("claimRejected");
          setIsLoading(false);
          return;
        }

        // For phase 5 (claim-success), ensure phase 4 is completed
        isAuthorized =
          isAuthorized ||
          (completedPhases.includes(4) && store._isClaimSuccess);
      } else if (phase === 6) {
        // For phase 6 (agreement), ensure phase 5 is completed
        isAuthorized = isAuthorized || completedPhases.includes(5);
      } else if (phase === 7) {
        // Special case for phase 7 (claim-submitted) - accessible after agreement page
        // Check if we have query parameters indicating we came from successful submission
        const url = new URL(window.location.href);
        const claimId = url.searchParams.get("claim_id");

        if (claimId) {
          console.log("=== PhaseGuard - Claim Submitted With Claim ID ===", {
            claimId,
            currentPhase,
            completedPhases,
            timestamp: new Date().toISOString(),
          });

          // Allow access if claim_id is present, this indicates successful submission
          setIsAuthorized(true);
          setIsLoading(false);

          // Also update completedPhases to include phase 6 for future navigation
          if (!completedPhases.includes(6)) {
            const newCompletedPhases = [...completedPhases, 6];
            localStorage.setItem(
              "completedPhases",
              JSON.stringify(newCompletedPhases)
            );

            // Get and update phasesCompletedViaContinue as well
            const phasesCompletedViaContinueStr = localStorage.getItem(
              "phasesCompletedViaContinue"
            );
            const phasesCompletedViaContinue = phasesCompletedViaContinueStr
              ? JSON.parse(phasesCompletedViaContinueStr)
              : [];

            if (!phasesCompletedViaContinue.includes(6)) {
              const newPhasesCompletedViaContinue = [
                ...phasesCompletedViaContinue,
                6,
              ];
              localStorage.setItem(
                "phasesCompletedViaContinue",
                JSON.stringify(newPhasesCompletedViaContinue)
              );

              // Update store with both arrays
              useStore.setState({
                completedPhases: newCompletedPhases,
                phasesCompletedViaContinue: newPhasesCompletedViaContinue,
                currentPhase: 7,
                _lastUpdate: Date.now(),
              });
            } else {
              // Update store with just completedPhases
              useStore.setState({
                completedPhases: newCompletedPhases,
                currentPhase: 7,
                _lastUpdate: Date.now(),
              });
            }
          }

          return;
        }

        // Without claim_id, check if phase 6 is completed
        isAuthorized = isAuthorized || completedPhases.includes(6);
      } else if (pathname?.includes("claim-rejected")) {
        // Special case for claim-rejected page - if user has a successful claim, show error
        if (store._isClaimSuccess) {
          console.log("=== PhaseGuard - Claim-Rejected Access Blocked ===", {
            pathname,
            isClaimSuccess: store._isClaimSuccess,
            isClaimRejected: store._isClaimRejected,
            timestamp: new Date().toISOString(),
          });
          setIsAuthorized(false);
          setBlockReason("claimSuccess");
          setIsLoading(false);
          return;
        }
      } else if (pathname?.includes("claim-success")) {
        // Additional check for claim-success page - if user has a rejected claim, show error
        if (store._isClaimRejected) {
          console.log("=== PhaseGuard - Claim-Success Access Blocked ===", {
            pathname,
            isClaimSuccess: store._isClaimSuccess,
            isClaimRejected: store._isClaimRejected,
            timestamp: new Date().toISOString(),
          });
          setIsAuthorized(false);
          setBlockReason("claimRejected");
          setIsLoading(false);
          return;
        }
      }

      setIsAuthorized(isAuthorized);
      setIsLoading(false);

      // Log decision without causing re-renders
      console.log("=== PhaseGuard - Initial Authorization Decision ===", {
        phase,
        currentPhase,
        completedPhases,
        authorized: isAuthorized,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error during phase authorization check:", error);
      setIsAuthorized(true); // Default to true on error to avoid blocking users
      setIsLoading(false);
    }
  }, [phase, pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p className="mb-4">Please wait while we prepare your page.</p>
          <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show unauthorized message
  if (!isAuthorized) {
    // Get specific messages based on phase
    let title =
      t.phases.unauthorized.titles?.[phase] || t.phases.unauthorized.title;
    let message =
      t.phases.unauthorized.messages?.[phase] || t.phases.unauthorized.message;
    let buttonText = getBackButtonText();

    // Use specific messages for different block reasons
    if (blockReason === "claimRejected") {
      title = t.phases.claimRejected?.accessDenied?.title || "Claim Rejected";
      message =
        t.phases.claimRejected?.accessDenied?.message ||
        "Your claim has been rejected. You cannot access the claim success page because your claim was rejected. Please check your email for more information.";
      buttonText =
        t.phases.claimRejected?.accessDenied?.back ||
        "View Rejected Claim Details";
    } else if (blockReason === "claimSuccess") {
      title = t.phases.claimSuccess?.accessDenied?.title || "Claim Successful";
      message =
        t.phases.claimSuccess?.accessDenied?.message ||
        "Your claim has been successfully processed. You cannot access the claim rejected page because your claim was successful. Please proceed with the next steps to complete your claim.";
      buttonText =
        t.phases.claimSuccess?.accessDenied?.back || "Return to Claim Success";
    }

    return (
      <main className="max-w-3xl mx-auto px-4 pt-8">
        <ErrorMessage
          title={title}
          message={message}
          buttonText={buttonText}
          onButtonClick={() => {
            // Navigate based on block reason
            if (blockReason === "claimRejected") {
              // Extract language from current path if present
              const langMatch = pathname?.match(/^\/(de|en)/);
              const langPrefix = langMatch ? langMatch[0] : "";
              router.push(`${langPrefix}/phases/claim-rejected`);
            } else if (blockReason === "claimSuccess") {
              // Extract language from current path if present
              const langMatch = pathname?.match(/^\/(de|en)/);
              const langPrefix = langMatch ? langMatch[0] : "";
              router.push(`${langPrefix}/phases/claim-success`);
            } else {
              // Get the appropriate phase to navigate to
              const targetPhase = getAppropriatePhaseToNavigate();

              // Extract language from current path if present
              const langMatch = pathname?.match(/^\/(de|en)/);
              const langPrefix = langMatch ? langMatch[0] : "";

              // Get the path for the target phase
              const phasePath = PHASE_PATHS[targetPhase];

              // Navigate to the appropriate page
              router.push(`${langPrefix}${phasePath}`);
            }
          }}
        />
      </main>
    );
  }

  // User is authorized, render the children
  return (
    <>
      {children}

      {/* Debug overlay - only shown when debug_phase_guard=true is in the URL */}
      {showDebug && (
        <div className="fixed bottom-0 right-0 bg-black bg-opacity-80 text-white p-4 max-w-md max-h-96 overflow-auto text-xs z-50 m-2 rounded-lg">
          <h2 className="text-sm font-bold mb-2">PhaseGuard Debug</h2>
          <div className="grid grid-cols-2 gap-1">
            <div>Current Phase:</div>
            <div>{phase}</div>
            <div>Store Current Phase:</div>
            <div>{store.currentPhase}</div>
            <div>Completed Phases:</div>
            <div>{store.completedPhases?.join(", ") || "None"}</div>
            <div>Completed Via Continue:</div>
            <div>{store.phasesCompletedViaContinue?.join(", ") || "None"}</div>
            <div>Is Authorized:</div>
            <div>{isAuthorized ? "Yes" : "No"}</div>
            <div>Claim Success:</div>
            <div>{store._isClaimSuccess ? "Yes" : "No"}</div>
            <div>Claim Rejected:</div>
            <div>{store._isClaimRejected ? "Yes" : "No"}</div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-600">
            <button
              className="bg-red-500 text-white px-2 py-1 rounded text-xs mr-2"
              onClick={() => setShowDebug(false)}
            >
              Close
            </button>
            <button
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
              onClick={() => {
                localStorage.removeItem("completedPhases");
                localStorage.removeItem("phasesCompletedViaContinue");
                localStorage.removeItem("currentPhase");
                window.location.reload();
              }}
            >
              Reset Phase Data
            </button>
          </div>
        </div>
      )}
    </>
  );
};
