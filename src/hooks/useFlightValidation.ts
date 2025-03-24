import { useState, useCallback, useEffect, useRef } from "react";
import {
  validateFlightSelection,
  type ValidationResult,
} from "@/lib/validation/flightValidation";
import type { FlightSegmentData } from "@/types/store";

// Extended record type to include metadata properties
interface ValidationStateRecord extends Record<number, boolean> {
  _isVisualOnly?: boolean;
  _timestamp?: number;
  _lastUpdate?: number;
}

interface UseFlightValidationProps {
  selectedType: "direct" | "multi";
  segments: FlightSegmentData[];
  phase: number;
  stepNumber?: number;
  setValidationState?: (
    updater: (prev: ValidationStateRecord) => ValidationStateRecord
  ) => void;
  validateOnMount?: boolean;
}

interface UseFlightValidationReturn {
  isValid: boolean;
  errors: string[];
  validate: () => ValidationResult;
  clearErrors: () => void;
}

export const useFlightValidation = ({
  selectedType,
  segments,
  phase,
  stepNumber,
  setValidationState,
  validateOnMount = false,
}: UseFlightValidationProps): UseFlightValidationReturn => {
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: false,
    errors: [],
  });

  // Track the last validation state to prevent unnecessary updates
  const lastValidationRef = useRef<{
    isValid: boolean;
    timestamp: number;
    validationState?: ValidationStateRecord;
    errors?: string[];
  } | null>(null);

  // Validation lock to prevent concurrent validations
  const isValidatingRef = useRef(false);

  // Update validation state without triggering re-renders
  const updateValidationState = useCallback(
    (isValid: boolean) => {
      if (!setValidationState || typeof stepNumber !== "number") return;

      // Check if the validation state has actually changed
      if (
        lastValidationRef.current?.isValid === isValid &&
        lastValidationRef.current?.validationState?.[stepNumber] === isValid
      ) {
        return;
      }

      // Use memoized updater to ensure we're not causing unnecessary re-renders
      const timestamp = Date.now();

      // Debounce validation state updates
      const minUpdateInterval = 400; // ms
      if (
        lastValidationRef.current?.validationState &&
        timestamp -
          (lastValidationRef.current.validationState._timestamp || 0) <
          minUpdateInterval
      ) {
        // If we have an existing validation state and it was updated recently, schedule an update
        return;
      }

      let shouldUpdateState = false;

      setValidationState((prev: ValidationStateRecord) => {
        // Only update if the value has changed to prevent unnecessary renders
        if (
          prev[stepNumber] === isValid &&
          prev._timestamp &&
          timestamp - prev._timestamp < minUpdateInterval
        ) {
          return prev;
        }

        shouldUpdateState = true;

        const newState: ValidationStateRecord = {
          ...prev,
          [stepNumber]: isValid,
          _timestamp: timestamp,
          _lastUpdate: timestamp,
        };

        return newState;
      });

      // Only update the ref if we actually updated the state
      if (shouldUpdateState) {
        // Update the ref with the new state (will be done after the state update)
        setTimeout(() => {
          lastValidationRef.current = {
            ...lastValidationRef.current,
            isValid,
            timestamp,
            validationState: lastValidationRef.current?.validationState
              ? {
                  ...lastValidationRef.current.validationState,
                  [stepNumber]: isValid,
                  _timestamp: timestamp,
                }
              : undefined,
          };
        }, 0);
      }
    },
    [setValidationState, stepNumber]
  );

  // Helper to safely update validation result
  const safeSetValidationResult = useCallback((newResult: ValidationResult) => {
    // Enhanced equality check - deep compare errors array as well
    const errorsEqual =
      lastValidationRef.current?.errors?.length === newResult.errors.length &&
      lastValidationRef.current?.errors?.every(
        (err, i) => err === newResult.errors[i]
      );

    // Skip update if nothing changed (both validity and errors)
    if (
      lastValidationRef.current?.isValid === newResult.isValid &&
      errorsEqual
    ) {
      return;
    }

    // Use timestamp for debouncing
    const timestamp = Date.now();

    // Check if we're updating too frequently
    const minUpdateInterval = 300; // ms
    if (
      lastValidationRef.current &&
      timestamp - (lastValidationRef.current.timestamp || 0) < minUpdateInterval
    ) {
      // If updating too frequently, schedule an update instead of doing it immediately
      setTimeout(() => {
        // Re-check if the validation is still needed when the timeout resolves
        if (
          lastValidationRef.current?.isValid !== newResult.isValid ||
          !errorsEqual
        ) {
          setValidationResult(newResult);
          updateValidationState(newResult.isValid);

          // Update the reference
          lastValidationRef.current = {
            isValid: newResult.isValid,
            errors: [...newResult.errors],
            timestamp: Date.now(),
          };
        }
      }, minUpdateInterval);
      return;
    }

    // Safe to update immediately
    setValidationResult(newResult);

    // Only update validation state if enough time has passed
    if (
      !lastValidationRef.current ||
      timestamp - (lastValidationRef.current.timestamp || 0) > minUpdateInterval
    ) {
      updateValidationState(newResult.isValid);

      // Update the reference
      lastValidationRef.current = {
        isValid: newResult.isValid,
        errors: [...newResult.errors],
        timestamp,
      };
    }
  }, []);

  // Validation function
  const validate = useCallback((): ValidationResult => {
    // If already validating, return current result
    if (isValidatingRef.current) {
      return validationResult;
    }

    // Check if we need to throttle validation calls
    const now = Date.now();
    const minValidationInterval = 200; // ms
    if (
      lastValidationRef.current &&
      now - (lastValidationRef.current.timestamp || 0) < minValidationInterval
    ) {
      // Too recent, return current result
      return validationResult;
    }

    // Set validating flag
    isValidatingRef.current = true;

    try {
      // For phase 3, validate flight selections
      if (phase === 3) {
        console.log("=== Flight Validation Phase 3 ===", {
          segments,
          selectedType,
          hasSelectedFlights: segments.some(
            (segment) => segment.selectedFlight
          ),
          allSegmentsValid: segments.every(
            (segment) =>
              segment.fromLocation && segment.toLocation && segment.date
          ),
          timestamp: new Date().toISOString(),
        });

        // For phase 3, validation should pass if:
        // 1. Any segment has a selectedFlight (for back navigation from phase 4)
        // 2. OR if all segments have valid from/to/date data (needed for search)
        const hasSelectedFlights = segments.some(
          (segment) => segment.selectedFlight
        );

        // Check if all segments have valid location data for performing search
        const allSegmentsHaveValidData = segments.every(
          (segment) =>
            segment.fromLocation && segment.toLocation && segment.date
        );

        // If flight selection type is multi, ensure all segments have selectedFlights OR valid data
        // If direct, just check that there's at least one valid segment
        const allSegmentsValid =
          selectedType === "multi"
            ? segments.every(
                (segment) =>
                  segment.selectedFlight ||
                  (segment.fromLocation && segment.toLocation && segment.date)
              )
            : segments.some(
                (segment) =>
                  segment.selectedFlight ||
                  (segment.fromLocation && segment.toLocation && segment.date)
              );

        // Get previously completed phases to check if phase 3 was already completed
        const completedPhasesStr = localStorage.getItem(
          "phasesCompletedViaContinue"
        );
        const completedPhases = completedPhasesStr
          ? JSON.parse(completedPhasesStr)
          : [];
        const wasPhase3Completed = completedPhases.includes(3);

        // We should consider the validation valid if:
        // 1. There are selected flights OR all segments have valid search data
        // 2. OR phase 3 was previously completed (for back navigation)
        const isValid =
          hasSelectedFlights ||
          allSegmentsHaveValidData ||
          allSegmentsValid ||
          wasPhase3Completed;

        const result: ValidationResult = {
          isValid,
          errors: [],
        };

        if (!isValid) {
          if (!hasSelectedFlights && !allSegmentsHaveValidData) {
            result.errors.push(
              "Please either select flights or provide valid flight details"
            );
          } else if (selectedType === "multi" && !allSegmentsValid) {
            result.errors.push(
              "Please fill in details for all flight segments"
            );
          }
        }

        console.log("=== Flight Validation Phase 3 Result ===", {
          isValid,
          errors: result.errors,
          timestamp: new Date().toISOString(),
        });

        safeSetValidationResult(result);
        return result;
      }

      // For other phases, use validateFlightSelection
      const result = validateFlightSelection(selectedType, segments, phase);
      safeSetValidationResult(result);
      return result;
    } finally {
      // Clear validating flag
      isValidatingRef.current = false;
    }
  }, [phase, segments, selectedType, safeSetValidationResult]);

  // Clear errors
  const clearErrors = useCallback(() => {
    const emptyResult = { isValid: false, errors: [] };
    safeSetValidationResult(emptyResult);
  }, [safeSetValidationResult]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validate();
    }
  }, [validateOnMount, validate]);

  // Validate whenever dependencies change
  useEffect(() => {
    // Skip validation in phase 3 if only locations are changing
    if (phase === 3 && !segments.some((segment) => segment.selectedFlight)) {
      return;
    }

    // For Phase 1, we need to separate visual validation from phase completion validation
    if (phase === 1) {
      // First, check if the locations are valid (this is for visual feedback)
      const hasValidLocations = segments.some(
        (segment) =>
          segment.fromLocation &&
          segment.toLocation &&
          segment.fromLocation?.value !== segment.toLocation?.value
      );

      // Get the local storage completion status to check if we've officially completed this phase
      const completedPhases = localStorage.getItem(
        "phasesCompletedViaContinue"
      );
      const phasesCompletedViaContinue = completedPhases
        ? JSON.parse(completedPhases)
        : [];

      // Also check if the phase has been explicitly marked as completed
      let phase1ExplicitlyCompleted = false;
      try {
        const phase1StateStr = localStorage.getItem("phase1State");
        if (phase1StateStr) {
          const phase1State = JSON.parse(phase1StateStr);
          phase1ExplicitlyCompleted = phase1State._explicitlyCompleted === true;
        }
      } catch (e) {
        console.error("Error checking phase1 explicit completion state:", e);
      }

      // Only validate completion/progression if explicitly completed via continue or we're validating from phase > 1
      const shouldValidateForProgression =
        (phase > 1 || phasesCompletedViaContinue.includes(1)) &&
        (phase > 1 || phase1ExplicitlyCompleted);

      // For UI feedback, we'll show valid state if locations are valid, regardless of completion status
      if (hasValidLocations) {
        // Check if we've already set the validation state to avoid infinite loops
        if (setValidationState && stepNumber !== undefined) {
          // Compare with the lastValidationRef to prevent infinite update loops
          const currentTimestamp = Date.now();

          // Only update if:
          // 1. We don't have a last validation record
          // 2. Last validation was invalid but now it's valid
          // 3. Enough time has passed since the last update
          if (
            !lastValidationRef.current ||
            !lastValidationRef.current.isValid ||
            currentTimestamp - (lastValidationRef.current.timestamp || 0) > 800
          ) {
            // Only update if not already valid in our internal state
            if (!validationResult.isValid) {
              // Update the visual validation state (for checkmarks) but don't update the phase completion state
              const timestamp = Date.now();

              // Track if we need to update the validation state
              let shouldUpdateState = false;

              setValidationState((prev: ValidationStateRecord) => {
                // Only update if the value has changed
                if (prev[stepNumber] === true && prev._isVisualOnly === true) {
                  return prev;
                }

                shouldUpdateState = true;

                return {
                  ...prev,
                  [stepNumber]: true, // This makes the checkmark appear
                  _isVisualOnly: true, // Flag to indicate this is only for visual feedback
                  _timestamp: timestamp,
                  _lastUpdate: timestamp,
                };
              });

              // Only update the validation result if we actually updated the state
              // This prevents the loop of state updates
              if (shouldUpdateState) {
                // Update the validation result for UI feedback only
                setValidationResult({
                  isValid: true, // This makes the form fields show as valid
                  errors: [],
                });

                // Update the last validation ref to prevent further updates
                lastValidationRef.current = {
                  isValid: true,
                  timestamp,
                };
              }
            }
          }
        }

        // For phase completion logic, we still need to check if it's been completed via continue
        if (!shouldValidateForProgression) {
          // Avoid excessive logging to prevent flooding the console
          if (
            !lastValidationRef.current ||
            Date.now() - (lastValidationRef.current.timestamp || 0) > 1000
          ) {
            console.log("=== Phase 1 location validation ===", {
              status: "valid locations but phase not completed via continue",
              hasValidLocations,
              segments: segments.map((s) => ({
                fromLocation: s.fromLocation?.value,
                toLocation: s.toLocation?.value,
              })),
              shouldValidateForProgression,
              phasesCompletedViaContinue,
              phase1ExplicitlyCompleted,
              timestamp: new Date().toISOString(),
            });
          }

          // For UI state only (checkmarks), report as valid
          // But for actual phase validation, it's not valid until continue is pressed
          return;
        }
      }
    }

    // Skip validation if nothing has changed
    if (
      lastValidationRef.current?.isValid === validationResult.isValid &&
      lastValidationRef.current?.timestamp > Date.now() - 500
    ) {
      return;
    }

    // Run validation immediately (debounce to prevent excessive validation)
    const throttledValidate = () => {
      if (!isValidatingRef.current) {
        validate();
      }
    };

    // Use requestAnimationFrame to ensure we don't call validate during render
    const rafId = requestAnimationFrame(throttledValidate);

    // Clean up the animation frame if the component unmounts
    return () => cancelAnimationFrame(rafId);
  }, [selectedType, segments, phase, validate, setValidationState, stepNumber]);

  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    validate,
    clearErrors,
  };
};
