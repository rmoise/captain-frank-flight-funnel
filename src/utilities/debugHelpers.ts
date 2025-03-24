/**
 * Debug utility functions to help troubleshoot application issues
 */

/**
 * Completely clears localStorage and sessionStorage
 * Use in browser console to fix stuck loading states:
 *
 * Example usage:
 * ```js
 * import { clearAllStorage } from '@/utilities/debugHelpers';
 * clearAllStorage();
 * ```
 */
export const clearAllStorage = () => {
  try {
    // Save essential information
    const bookingNumberValue = sessionStorage.getItem("booking_number");

    // Clear everything
    localStorage.clear();
    sessionStorage.clear();

    // Restore only booking number if it existed
    if (bookingNumberValue) {
      sessionStorage.setItem("booking_number", bookingNumberValue);
    }

    console.log("=== DEBUG: All storage cleared ===", {
      preservedBookingNumber: !!bookingNumberValue,
      timestamp: new Date().toISOString(),
    });

    // Force reload the page
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    return true;
  } catch (e) {
    console.error("=== DEBUG: Error clearing storage ===", e);
    return false;
  }
};

/**
 * Fixes phase transition issues by ensuring phase data is properly synced
 * between different storage keys
 */
export const fixPhaseTransition = () => {
  try {
    // Get current phase
    const currentPhaseStr = localStorage.getItem("currentPhase");
    const currentPhase = currentPhaseStr ? parseInt(currentPhaseStr, 10) : 1;

    // Get completed phases
    const completedPhasesStr = localStorage.getItem("completedPhases");
    const completedPhases = completedPhasesStr
      ? JSON.parse(completedPhasesStr)
      : [];

    // Ensure previous phase is marked as completed
    if (currentPhase > 1 && !completedPhases.includes(currentPhase - 1)) {
      completedPhases.push(currentPhase - 1);
      localStorage.setItem("completedPhases", JSON.stringify(completedPhases));
    }

    // Get phases completed via continue
    const phasesCompletedViaContinueStr = localStorage.getItem(
      "phasesCompletedViaContinue"
    );
    const phasesCompletedViaContinue = phasesCompletedViaContinueStr
      ? JSON.parse(phasesCompletedViaContinueStr)
      : [];

    // Ensure previous phase is marked as completed via continue
    if (
      currentPhase > 1 &&
      !phasesCompletedViaContinue.includes(currentPhase - 1)
    ) {
      phasesCompletedViaContinue.push(currentPhase - 1);
      localStorage.setItem(
        "phasesCompletedViaContinue",
        JSON.stringify(phasesCompletedViaContinue)
      );
    }

    // Clean up any potentially corrupted phase state data
    if (currentPhase === 2) {
      // Mark phase 1 as explicitly completed
      const phase1StateStr = localStorage.getItem("phase1State");
      if (phase1StateStr) {
        const phase1State = JSON.parse(phase1StateStr);
        phase1State._explicitlyCompleted = true;
        localStorage.setItem("phase1State", JSON.stringify(phase1State));
      }
    }

    console.log("=== DEBUG: Fixed phase transition ===", {
      currentPhase,
      completedPhases,
      phasesCompletedViaContinue,
      timestamp: new Date().toISOString(),
    });

    // Force reload the page
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }

    return true;
  } catch (e) {
    console.error("=== DEBUG: Error fixing phase transition ===", e);
    return false;
  }
};
