import { LocationData } from "@/types/store";

// Define the LocationLike interface here since it's not in the types file
export interface LocationLike {
  value: string;
  label: string;
  description?: string;
  city?: string;
  airport?: string;
  dropdownLabel?: string;
}

/**
 * Creates a consistent LocationData object from various location input formats.
 * Handles null values, string inputs (airport codes, JSON strings), and location objects.
 *
 * @param location - The location input to process
 * @returns A properly formatted LocationData object with string & LocationLike properties or null
 */
export const processLocation = (
  location: any
): (string & LocationLike) | null => {
  // Handle null, undefined or the string "null"
  if (!location || location === "null" || location === "undefined") {
    console.log("=== processLocation - Null or invalid input ===", {
      input: location,
      result: "null",
      timestamp: new Date().toISOString(),
    });
    return null;
  }

  // Handle string inputs
  if (typeof location === "string") {
    // If it's a simple airport code, create a LocationLike object
    if (/^[A-Z]{3}$/.test(location)) {
      console.log("=== processLocation - Airport Code Input ===", {
        input: location,
        result: "LocationObject",
        timestamp: new Date().toISOString(),
      });

      return Object.assign(String(location), {
        value: location,
        label: location,
        description: location,
        city: location,
        airport: location,
        dropdownLabel: location,
      });
    }

    // Try to parse JSON if it looks like a JSON string
    if (location.startsWith("{")) {
      try {
        const parsed = JSON.parse(location);
        console.log("=== processLocation - Parsed JSON String ===", {
          input: "JSON string",
          result: "Parsing and reprocessing",
          timestamp: new Date().toISOString(),
        });
        return processLocation(parsed);
      } catch (e) {
        console.error("Failed to parse location JSON", location, e);
      }
    }

    // Default for any other string
    console.log("=== processLocation - Generic String Input ===", {
      input: location,
      result: "LocationObject",
      timestamp: new Date().toISOString(),
    });

    return Object.assign(String(location), {
      value: location,
      label: location,
      description: location,
      city: location,
      airport: location,
      dropdownLabel: location,
    });
  }

  // Handle object with value property
  if (typeof location === "object" && location !== null) {
    const locValue = location.value || "";
    if (!locValue) {
      console.log("=== processLocation - Object without value property ===", {
        input: JSON.stringify(location),
        result: "null (missing value property)",
        timestamp: new Date().toISOString(),
      });
      return null;
    }

    console.log("=== processLocation - Object Input ===", {
      input: `Object with value: ${locValue}`,
      result: "LocationObject",
      timestamp: new Date().toISOString(),
    });

    return Object.assign(String(locValue), {
      value: locValue,
      label: location.label || locValue,
      description: location.description || locValue,
      city: location.city || locValue,
      airport: location.airport || locValue,
      dropdownLabel:
        location.dropdownLabel ||
        (location.city ? `${location.city} (${locValue})` : locValue),
    });
  }

  console.log("=== processLocation - Unhandled input type ===", {
    input: typeof location,
    result: "null",
    timestamp: new Date().toISOString(),
  });

  return null;
};

/**
 * Converts a location to a format safe for storage
 * This creates a deep clone and ensures no reference issues
 *
 * @param location - Any location input
 * @returns A safely formatted location object, properly detached from original references
 */
export const createSafeLocationCopy = (
  location: any
): (string & LocationLike) | null => {
  // First process to normalize the format
  const processed = processLocation(location);
  if (!processed) return null;

  // Then create a safe deep copy to avoid reference issues
  try {
    // Use JSON serialization for deep cloning
    const serialized = JSON.stringify(processed);
    const deserialized = JSON.parse(serialized);

    // Reprocess to ensure the right prototype
    return processLocation(deserialized);
  } catch (e) {
    console.error("Error creating safe location copy:", e);
    return processed; // Fall back to the processed object if cloning fails
  }
};

/**
 * Ensures locations in a flight segment are properly formatted
 *
 * @param segment - Flight segment data
 * @returns A new segment with properly formatted location data
 */
export const ensureSegmentLocations = (segment: any): any => {
  if (!segment) return null;

  return {
    ...segment,
    fromLocation: processLocation(segment.fromLocation),
    toLocation: processLocation(segment.toLocation),
  };
};

/**
 * Checks if a location is valid
 *
 * @param location - The location to check
 * @returns True if the location is valid, false otherwise
 */
export const isValidLocation = (location: any): boolean => {
  const processed = processLocation(location);
  return Boolean(processed && processed.value);
};
