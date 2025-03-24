import type { ValidationStore } from './slices/validationSlice';
import type { FlightSlice, StoreStateValues } from '@/lib/state/types';
import type { Answer } from '@/types/store';
import { isValid, parseISO } from 'date-fns';
import { isValidLocation } from '../validation/locationValidation';

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

  console.log('=== Validating Flight Selection ===', {
    selectedType,
    currentPhase,
    segmentCount: flightSegments.length,
    fromLocation: state.fromLocation,
    toLocation: state.toLocation,
    directFlight: state.directFlight,
    timestamp: new Date().toISOString()
  });

  // Helper function to normalize city names for comparison
  const normalizeCity = (city: string): string => {
    if (!city) return '';
    return city
      .toLowerCase()
      .replace(/\s*\([^)]*\)/g, '') // Remove airport codes in parentheses
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Base validation for all phases
  let isValid = false;

  if (selectedType === 'multi') {
    // For multi-city flights
    isValid = !!(
      flightSegments.length >= 2 &&
      flightSegments.every(
        (segment) => isValidLocation(segment.fromLocation) && isValidLocation(segment.toLocation)
      ) &&
      // Validate city connections
      flightSegments.every((segment, index) => {
        if (index === 0) return true;
        const prevSegment = flightSegments[index - 1];
        if (!prevSegment.toLocation || !segment.fromLocation) return false;

        const prevCity =
          prevSegment.toLocation.city ||
          prevSegment.toLocation.description ||
          prevSegment.toLocation.label;
        const currentCity =
          segment.fromLocation.city ||
          segment.fromLocation.description ||
          segment.fromLocation.label;

        return normalizeCity(prevCity) === normalizeCity(currentCity);
      })
    );
  } else {
    // For direct flights
    const segment = flightSegments[0] || state.directFlight;
    const fromLoc = segment?.fromLocation || state.fromLocation;
    const toLoc = segment?.toLocation || state.toLocation;

    // For phase 1 and 2, only validate locations
    if (currentPhase <= 2) {
      isValid = !!(isValidLocation(fromLoc) && isValidLocation(toLoc));
    } else {
      // For phase 3 and above, validate locations and selected flight
      isValid = !!(
        isValidLocation(fromLoc) &&
        isValidLocation(toLoc) &&
        segment?.selectedFlight
      );
    }
  }

  console.log('=== Flight Selection Validation Result ===', {
    isValid,
    currentPhase,
    timestamp: new Date().toISOString()
  });

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
