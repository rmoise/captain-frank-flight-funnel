import { useState, useCallback, useEffect, useRef } from 'react';
import {
  validateFlightSelection,
  type FlightSegment,
  type ValidationResult,
} from '@/lib/validation/flightValidation';

interface UseFlightValidationProps {
  selectedType: 'direct' | 'multi';
  segments: FlightSegment[];
  phase: number;
  stepNumber?: number;
  setValidationState?: (
    updater: (prev: Record<number, boolean>) => Record<number, boolean>
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

  // Cache for validation results
  const lastValidationRef = useRef<{
    selectedType: string;
    segments: FlightSegment[];
    phase: number;
    result: ValidationResult;
  } | null>(null);

  // Debounce timer
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if validation inputs have changed
  const hasValidationInputsChanged = useCallback(() => {
    if (!lastValidationRef.current) return true;

    const {
      selectedType: lastType,
      segments: lastSegments,
      phase: lastPhase,
    } = lastValidationRef.current;

    // Quick equality check for primitive values
    if (lastType !== selectedType || lastPhase !== phase) return true;

    // Deep equality check for segments
    if (lastSegments.length !== segments.length) return true;

    // For multi-city flights in phase < 3, only validate when all flights are selected
    if (selectedType === 'multi' && phase < 3) {
      const allFlightsSelected = segments.every(
        (segment) => segment.selectedFlight
      );
      const prevAllFlightsSelected = lastSegments.every(
        (segment) => segment.selectedFlight
      );

      // If we're transitioning from not-all-selected to all-selected, validate
      if (allFlightsSelected !== prevAllFlightsSelected) {
        return true;
      }

      // If not all flights are selected, skip validation
      if (!allFlightsSelected) {
        return false;
      }
    }

    return segments.some((segment, index) => {
      const lastSegment = lastSegments[index];
      return (
        segment.fromLocation?.value !== lastSegment.fromLocation?.value ||
        segment.toLocation?.value !== lastSegment.toLocation?.value ||
        segment.date !== lastSegment.date ||
        segment.selectedFlight?.id !== lastSegment.selectedFlight?.id
      );
    });
  }, [selectedType, segments, phase]);

  // Validation function with caching
  const validate = useCallback((): ValidationResult => {
    // Clear any pending validation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // For phase 3, validate only when all flights are selected
    if (phase === 3) {
      const allFlightsSelected = segments.every(
        (segment) => segment.selectedFlight !== null
      );

      if (!allFlightsSelected) {
        const result = {
          isValid: false,
          errors: ['All flight segments must be selected'],
        };
        setValidationResult(result);

        // Update validation state if provided
        if (setValidationState && typeof stepNumber === 'number') {
          setValidationState((prev) => ({
            ...prev,
            [stepNumber]: false,
          }));
        }

        return result;
      }
    }

    // Check if we can use cached result
    if (!hasValidationInputsChanged() && lastValidationRef.current) {
      return lastValidationRef.current.result;
    }

    // Perform validation
    const result = validateFlightSelection(selectedType, segments, phase);
    setValidationResult(result);

    // Update validation state if provided
    if (setValidationState && typeof stepNumber === 'number') {
      setValidationState((prev) => ({
        ...prev,
        [stepNumber]: result.isValid,
      }));
    }

    // Cache the result
    lastValidationRef.current = {
      selectedType,
      segments,
      phase,
      result,
    };

    return result;
  }, [
    selectedType,
    segments,
    phase,
    stepNumber,
    setValidationState,
    hasValidationInputsChanged,
  ]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setValidationResult({ isValid: false, errors: [] });
    lastValidationRef.current = null;
  }, []);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount) {
      validate();
    }
  }, [validateOnMount, validate]);

  // Debounced validation on dependency changes
  useEffect(() => {
    // Skip if nothing has changed
    if (!hasValidationInputsChanged()) return;

    // Clear any pending validation
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set up new debounced validation
    debounceTimerRef.current = setTimeout(() => {
      validate();
      debounceTimerRef.current = null;
    }, 300); // 300ms debounce

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedType, segments, phase, validate, hasValidationInputsChanged]);

  return {
    isValid: validationResult.isValid,
    errors: validationResult.errors,
    validate,
    clearErrors,
  };
};
