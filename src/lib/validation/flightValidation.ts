import type { Flight, LocationData } from '@/types/store';

export interface FlightSegment {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: string | Date | null;
  selectedFlight: Flight | null;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConnectionValidation {
  isValid: boolean;
  error?: string;
  timeDifferenceMinutes?: number;
}

// Helper function to validate location data
const isValidLocation = (location: LocationData | null): boolean => {
  if (!location) return false;
  return (
    typeof location.value === 'string' && location.value.trim().length === 3
  );
};

// Helper function to normalize city names for comparison
const normalizeCity = (city: string): string => {
  if (!city) return '';
  return city
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // Remove anything in parentheses including the parentheses
    .trim();
};

// Helper function to validate flight duration
const isValidFlightDuration = (flight: Flight): boolean => {
  const departureTime = new Date(
    `${flight.date}T${flight.departureTime}:00.000Z`
  );
  const arrivalTime = new Date(`${flight.date}T${flight.arrivalTime}:00.000Z`);
  const durationMinutes =
    (arrivalTime.getTime() - departureTime.getTime()) / 60000;

  // Flights should be between 30 minutes and 18 hours
  return durationMinutes >= 30 && durationMinutes <= 18 * 60;
};

// Helper function to check for circular routes
const hasCircularRoute = (segments: FlightSegment[]): boolean => {
  const cities = new Set<string>();
  for (const segment of segments) {
    if (segment.fromLocation?.value) {
      cities.add(normalizeCity(segment.fromLocation.value));
    }
  }
  return cities.size !== segments.length;
};

// Validate connection between two flights
export const validateFlightConnection = (
  prevFlight: Flight,
  nextFlight: Flight,
  phase: number
): ConnectionValidation => {
  // Validate city connection with strict matching
  const prevArrivalCity = normalizeCity(prevFlight.arrivalCity);
  const nextDepartureCity = normalizeCity(nextFlight.departureCity);

  if (prevArrivalCity !== nextDepartureCity) {
    return {
      isValid: false,
      error: `Connection mismatch: Your flight from ${prevFlight.arrivalCity} needs to connect with a flight departing from the same city. Currently, the next flight departs from ${nextFlight.departureCity}.`,
    };
  }

  // For Phase 3+, validate connection times with improved messaging
  if (phase >= 3) {
    const prevArrivalTime = new Date(
      `${prevFlight.date}T${prevFlight.arrivalTime}:00.000Z`
    );
    const nextDepartureTime = new Date(
      `${nextFlight.date}T${nextFlight.departureTime}:00.000Z`
    );

    const timeDiff =
      (nextDepartureTime.getTime() - prevArrivalTime.getTime()) / 60000;

    if (timeDiff < 30) {
      return {
        isValid: false,
        error: `Connection time too short: You need at least 30 minutes to make this connection. Current connection time is ${Math.round(timeDiff)} minutes.`,
        timeDifferenceMinutes: timeDiff,
      };
    }

    if (timeDiff > 48 * 60) {
      return {
        isValid: false,
        error: `Connection time too long: Maximum layover time is 48 hours. Current layover is ${Math.round(timeDiff / 60)} hours.`,
        timeDifferenceMinutes: timeDiff,
      };
    }
  }

  return { isValid: true, timeDifferenceMinutes: 0 };
};

// Validate direct flight selection
export const validateDirectFlight = (
  segment: FlightSegment | undefined,
  phase: number
): ValidationResult => {
  const errors: string[] = [];

  // Early return if segment is undefined
  if (!segment) {
    errors.push('Flight segment is missing');
    return { isValid: false, errors };
  }

  // Phase 1: Validate locations only
  if (!isValidLocation(segment.fromLocation)) {
    errors.push('Invalid departure location');
  }
  if (!isValidLocation(segment.toLocation)) {
    errors.push('Invalid arrival location');
  }

  // Check for same city
  if (
    segment.fromLocation?.value &&
    segment.toLocation?.value &&
    normalizeCity(segment.fromLocation.value) ===
      normalizeCity(segment.toLocation.value)
  ) {
    errors.push('Departure and arrival cities cannot be the same');
  }

  // Phase 3+: Additional validations
  if (phase >= 3) {
    if (!segment.date) {
      errors.push('Flight date is required');
    }
    if (!segment.selectedFlight) {
      errors.push('Flight selection is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Validate multi-city flight selection
export const validateMultiCityFlights = (
  segments: FlightSegment[],
  phase: number
): ValidationResult => {
  const errors: string[] = [];

  // Basic validation
  if (segments.length < 2) {
    errors.push('Please add at least 2 flight segments for a multi-city trip');
    return { isValid: false, errors };
  }

  if (segments.length > 4) {
    errors.push('Your trip can have a maximum of 4 flight segments');
    return { isValid: false, errors };
  }

  // Check for circular routes
  if (hasCircularRoute(segments)) {
    errors.push(
      'Your itinerary contains a circular route. Each segment should progress to a new city.'
    );
  }

  // Validate each segment
  segments.forEach((segment, index) => {
    // Validate locations
    if (!isValidLocation(segment.fromLocation)) {
      errors.push(`Segment ${index + 1}: Please select a valid departure city`);
    }
    if (!isValidLocation(segment.toLocation)) {
      errors.push(`Segment ${index + 1}: Please select a valid arrival city`);
    }

    // Check for same city with improved message
    if (
      segment.fromLocation?.value &&
      segment.toLocation?.value &&
      normalizeCity(segment.fromLocation.value) ===
        normalizeCity(segment.toLocation.value)
    ) {
      errors.push(
        `Segment ${index + 1}: Departure and arrival cities are the same (${segment.fromLocation.value}). Please select different cities.`
      );
    }

    // Phase 3+: Additional validations
    if (phase === 3) {
      if (!segment.date) {
        errors.push(`Segment ${index + 1}: Please select a flight date`);
      }
      if (!segment.selectedFlight) {
        errors.push(`Segment ${index + 1}: Please select a flight`);
      }

      // Validate flight duration if flight is selected
      if (
        segment.selectedFlight &&
        !isValidFlightDuration(segment.selectedFlight)
      ) {
        errors.push(
          `Segment ${index + 1}: The selected flight duration appears to be invalid`
        );
      }

      // Validate date sequence with previous segment
      if (index > 0 && segment.date && segments[index - 1].date) {
        const prevDate = new Date(segments[index - 1].date!);
        const currentDate = new Date(segment.date);

        if (currentDate < prevDate) {
          errors.push(
            `Segment ${index + 1}: Flight date cannot be earlier than the previous flight`
          );
        }
      }

      // Validate connection with previous segment
      if (index > 0 && segment.selectedFlight) {
        const prevSegment = segments[index - 1];
        if (prevSegment.selectedFlight) {
          const connectionValidation = validateFlightConnection(
            prevSegment.selectedFlight,
            segment.selectedFlight,
            phase
          );
          if (!connectionValidation.isValid && connectionValidation.error) {
            errors.push(`Connection ${index}: ${connectionValidation.error}`);
          }
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Cache for validation results
let validationCache: {
  key: string;
  result: ValidationResult;
  timestamp: number;
} | null = null;

const CACHE_TTL = 1000; // 1 second cache TTL

// Helper function to generate cache key
const generateCacheKey = (
  selectedType: 'direct' | 'multi',
  segments: FlightSegment[],
  phase: number
): string => {
  return JSON.stringify({
    type: selectedType,
    phase,
    segments: segments.map((s) => ({
      from: s.fromLocation?.value,
      to: s.toLocation?.value,
      date: s.date,
      flightId: s.selectedFlight?.id,
    })),
  });
};

// Main validation function
export const validateFlightSelection = (
  selectedType: 'direct' | 'multi',
  segments: FlightSegment[],
  phase: number
): ValidationResult => {
  // Early validation for missing or empty segments
  if (!segments || segments.length === 0) {
    return {
      isValid: false,
      errors: ['No flight segments provided'],
    };
  }

  // Generate cache key
  const cacheKey = generateCacheKey(selectedType, segments, phase);

  // Check cache
  if (
    validationCache &&
    validationCache.key === cacheKey &&
    Date.now() - validationCache.timestamp < CACHE_TTL
  ) {
    return validationCache.result;
  }

  // Perform validation
  const result =
    selectedType === 'direct'
      ? validateDirectFlight(segments[0], phase)
      : validateMultiCityFlights(segments, phase);

  // Update cache
  validationCache = {
    key: cacheKey,
    result,
    timestamp: Date.now(),
  };

  return result;
};
