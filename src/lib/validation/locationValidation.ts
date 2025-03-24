import type { LocationLike } from '@/types/location';

// Validate a raw location string (e.g. airport code)
export const validateLocationString = (value: string | null): boolean => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length === 3; // Airport codes are 3 characters
};

// Validate a location object
export const validateLocation = (location: unknown): boolean => {
  if (!location) return false;

  // Handle string input
  if (typeof location === 'string') {
    // First check if it's a valid airport code
    if (/^[A-Z]{3}$/.test(location.trim())) {
      return true;
    }

    // Only try to parse as JSON if it looks like a JSON object
    if (location.trim().startsWith('{')) {
      try {
      const parsed = JSON.parse(location);
      return validateLocation(parsed);
    } catch (e) {
      // If parsing fails, validate as raw string
      return validateLocationString(location);
    }
    }

    // If not JSON-like, validate as raw string
    return validateLocationString(location);
  }

  // Handle location object
  if (typeof location === 'object' && location !== null) {
    const loc = location as LocationLike;
    if (!loc.value) return false;

    // Validate the value property as an airport code
    return validateLocationString(loc.value);
  }

  return false;
};

// Export for use in other validation functions
export const isValidLocation = validateLocation;
