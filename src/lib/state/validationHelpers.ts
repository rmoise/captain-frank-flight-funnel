import type { LocationLike } from '@/types/location';
import type { ValidationStore } from './slices/validationSlice';
import type { FlightSlice, StoreStateValues } from '@/lib/state/types';
import type { Answer } from '@/types/store';
import { isValid, parseISO } from 'date-fns';

export const validateFlightSelection = (
  state: ValidationStore & FlightSlice
): boolean => {
  const { selectedType, flightSegments, currentPhase } = state;

  // Skip validation if no changes since last validation
  if (
    state._lastUpdate === state._lastValidation &&
    typeof state.isFlightValid !== 'undefined'
  ) {
    return state.isFlightValid;
  }

  const isLocationValid = (loc: LocationLike | null | string): boolean => {
    if (!loc) return false;
    if (typeof loc === 'string') {
      return loc.trim().length === 3;
    }
    return typeof loc.value === 'string' && loc.value.trim().length === 3;
  };

  // Base validation for all phases
  let isValid = false;

  if (selectedType === 'direct') {
    const fromLocationValid = isLocationValid(state.directFlight.fromLocation);
    const toLocationValid = isLocationValid(state.directFlight.toLocation);
    const distinctLocations =
      fromLocationValid && toLocationValid
        ? state.directFlight.fromLocation?.value !==
          state.directFlight.toLocation?.value
        : false;

    // Base validation (locations)
    isValid = fromLocationValid && toLocationValid && distinctLocations;

    // Additional validation for phase 3 and above
    if (currentPhase >= 3) {
      const hasDate = !!state.directFlight.date;
      const hasSelectedFlight = !!state.directFlight.selectedFlight;
      isValid = isValid && hasDate && hasSelectedFlight;
    }
  } else {
    // Multi-flight validation
    isValid =
      flightSegments.length >= 2 &&
      flightSegments.length <= 4 &&
      flightSegments.every((segment, index) => {
        const fromValid = isLocationValid(segment.fromLocation);
        const toValid = isLocationValid(segment.toLocation);
        const distinct =
          fromValid &&
          toValid &&
          segment.fromLocation?.value !== segment.toLocation?.value;

        // Check connection with previous segment
        if (index > 0) {
          const prevSegment = flightSegments[index - 1];
          if (!prevSegment.toLocation || !segment.fromLocation) return false;

          // Check city connections
          const prevCity = prevSegment.toLocation.value.toLowerCase();
          const currentCity = segment.fromLocation.value.toLowerCase();
          if (prevCity !== currentCity) return false;

          // Check dates and times if in phase 3 or above
          if (currentPhase >= 3) {
            if (!prevSegment.selectedFlight || !segment.selectedFlight)
              return false;

            const prevArrivalTime = new Date(
              `${prevSegment.selectedFlight.date}T${prevSegment.selectedFlight.arrivalTime}:00.000Z`
            );
            const currentDepartureTime = new Date(
              `${segment.selectedFlight.date}T${segment.selectedFlight.departureTime}:00.000Z`
            );

            // Check if there's at least 30 minutes between flights
            const timeDiff =
              (currentDepartureTime.getTime() - prevArrivalTime.getTime()) /
              60000;
            if (timeDiff < 30) return false;
          }
        }

        // Base validation (locations)
        let segmentValid = fromValid && toValid && distinct;

        // Additional validation for phase 3 and above
        if (currentPhase >= 3) {
          const hasDate = !!segment.date;
          const hasSelectedFlight = !!segment.selectedFlight;
          segmentValid = segmentValid && hasDate && hasSelectedFlight;
        }

        return segmentValid;
      });
  }

  // Update last validation timestamp and cache result
  state._lastValidation = state._lastUpdate;
  state.isFlightValid = isValid;
  return isValid;
};

export const validateQAWizard = (
  state: StoreStateValues,
  questionId?: string
): { isValid: boolean; answers: Answer[]; bookingNumber: string } => {
  const { wizardAnswers } = state;

  // Don't validate if not submitted
  if (!state.validationState.isWizardSubmitted) {
    console.log('Skipping QA validation - not yet submitted');
    return {
      isValid: false,
      answers: wizardAnswers || [],
      bookingNumber: state.bookingNumber || '',
    };
  }

  // If no questionId provided, validate all answers independently
  if (!questionId) {
    const allValid = (wizardAnswers || []).every((answer) => {
      // Each answer is considered valid if it has a non-empty value
      return (
        answer.value !== undefined &&
        answer.value !== null &&
        answer.value !== ''
      );
    });

    return {
      isValid: allValid,
      answers: wizardAnswers || [],
      bookingNumber: state.bookingNumber || '',
    };
  }

  // Validate specific question
  const answer = wizardAnswers?.find((a) => a.questionId === questionId);
  const isValid =
    answer?.value !== undefined && answer.value !== null && answer.value !== '';

  return {
    isValid,
    answers: wizardAnswers || [],
    bookingNumber: state.bookingNumber || '',
  };
};

export const validateInformedDate = (state: StoreStateValues): boolean => {
  // Get all informed date related answers
  const answers = state.wizardAnswers.filter((a: Answer) =>
    a.questionId.startsWith('informed_date')
  );

  // Check if we have the main informed date answer
  const hasInformedDate = answers.some(
    (a: Answer) => a.questionId === 'informed_date' && a.value
  );
  const informedDate = answers
    .find((a: Answer) => a.questionId === 'informed_date')
    ?.value?.toString();

  let informedDateValid = hasInformedDate;

  // Handle different date cases
  if (informedDate === 'on_departure') {
    // For on_departure, we just need to have a booked flight with a date
    informedDateValid =
      state.originalFlights.length > 0 &&
      state.originalFlights[0]?.date != null;
  } else if (informedDate === 'specific_date') {
    const specificDate = answers
      .find((a: Answer) => a.questionId === 'specific_informed_date')
      ?.value?.toString();

    // Check if we have a specific date value
    if (!specificDate) {
      return false;
    }

    // Validate the date format
    try {
      const date = parseISO(specificDate);
      informedDateValid = isValid(date);
    } catch (e) {
      informedDateValid = false;
    }
  }

  return informedDateValid;
};
