import { LocationData } from "@/types/shared/location";
import { BaseLocation } from "@/types/shared/location";

/**
 * Extended location interface with UI-specific fields
 */
interface ExtendedLocation {
  id: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  value: string;
  label: string;
  description?: string;
  dropdownLabel?: string;
}

/**
 * Type for a location that is both a string and a location object
 */
type LocationResult = (string & ExtendedLocation) | null;

/**
 * Process a location value into a location object that is also a string
 * @param location The location to process
 * @returns A properly formatted location object that is also a string, or null
 */
export const processLocation = (
  location: string | Partial<ExtendedLocation> | null
): LocationResult => {
  // Handle null, undefined or the string "null"
  if (!location || location === "null" || location === "undefined") {
    return null;
  }

  // If it's already a location object, convert it to a string & location object
  if (typeof location !== "string" && "value" in location) {
    const baseString = String(location.value);
    return Object.assign(baseString, {
      id: location.id || location.value || baseString,
      iata: location.iata || location.value || baseString,
      name: location.name || location.label || baseString,
      city: location.city || "",
      country: location.country || "",
      value: location.value || baseString,
      label: location.label || baseString,
      description: location.description || "",
      dropdownLabel: location.dropdownLabel || baseString,
    });
  }

  // If it's a string, create a string & location object
  const baseString = String(location);
  return Object.assign(baseString, {
    id: baseString,
    iata: baseString,
    name: baseString,
    city: "",
    country: "",
    value: baseString,
    label: baseString,
    description: "",
    dropdownLabel: baseString,
  });
};

/**
 * Convert an unknown value to a location object
 * @param location The location to convert
 * @returns A location object or null if conversion fails
 */
export const convertToLocationLike = (
  location: unknown
): ExtendedLocation | null => {
  if (!location || typeof location !== "object") return null;

  const loc = location as Partial<ExtendedLocation>;
  if (!loc.id || !loc.iata || !loc.name || !loc.city || !loc.country)
    return null;

  return {
    id: loc.id,
    iata: loc.iata,
    name: loc.name,
    city: loc.city,
    country: loc.country,
    value: loc.value || loc.iata,
    label: loc.label || loc.name,
    description: loc.description || "",
    dropdownLabel: loc.dropdownLabel || "",
  };
};

/**
 * Reconstruct a location object from individual fields
 */
export const reconstructLocation = (
  id: string,
  code: string,
  name: string,
  city: string,
  country: string
): ExtendedLocation => ({
  id,
  iata: code,
  name,
  city,
  country,
  value: code,
  label: name,
});

/**
 * Compare two location objects for equality
 */
export const areLocationsEqual = (
  a: Partial<ExtendedLocation> | null,
  b: Partial<ExtendedLocation> | null
): boolean => {
  if (!a || !b) return a === b;
  return (
    a.id === b.id &&
    a.iata === b.iata &&
    a.name === b.name &&
    a.city === b.city &&
    a.country === b.country &&
    a.value === b.value &&
    a.label === b.label
  );
};

/**
 * Converts a location to a format safe for storage
 * This creates a deep clone and ensures no reference issues
 *
 * @param location - Any location input
 * @returns A safely formatted location object, properly detached from original references
 */
export const createSafeLocationCopy = (
  location: unknown
): (string & ExtendedLocation) | null => {
  // First process to normalize the format
  const processed = processLocation(
    location as string | Partial<ExtendedLocation> | null
  );
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
export const isValidLocation = (location: unknown): boolean => {
  const processed = processLocation(
    location as string | Partial<ExtendedLocation> | null
  );
  return Boolean(processed && processed.value);
};

/**
 * Gets city name from an airport code synchronously
 * This is a simple implementation that just returns the code itself
 * since we don't have access to the full airport database in this context
 *
 * @param airportCode - Airport IATA code (e.g., "BER")
 * @param lang - Optional language code
 * @returns The city name or the airport code if not found
 */
export const getAirportCitySync = (
  airportCode: string,
  lang?: string
): string => {
  // Check for cached airport data in localStorage
  // The API should be storing airport names in localStorage when they're fetched
  try {
    if (typeof window !== "undefined") {
      const cacheKey = `airport_${airportCode}_${lang || "en"}`;
      const cachedData = localStorage.getItem(cacheKey);

      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          if (parsed && parsed.name) {
            return `${parsed.name} (${airportCode})`;
          }
        } catch (e) {
          console.error("Error parsing cached airport data:", e);
        }
      }

      // Also check for recently used locations that might have the full name
      const recentLocationsKey = "recent_locations";
      const recentLocations = localStorage.getItem(recentLocationsKey);
      if (recentLocations) {
        try {
          const locations = JSON.parse(recentLocations);
          const matchingLocation = locations.find(
            (loc: any) => loc.value === airportCode || loc.label === airportCode
          );

          if (matchingLocation && matchingLocation.dropdownLabel) {
            return matchingLocation.dropdownLabel;
          } else if (matchingLocation && matchingLocation.description) {
            return `${matchingLocation.description} (${airportCode})`;
          }
        } catch (e) {
          console.error("Error parsing recent locations:", e);
        }
      }
    }
  } catch (e) {
    console.error("Error accessing localStorage for airport data:", e);
  }

  // For simplicity just return the airport code directly when no cache is available
  // This is a fallback implementation
  console.log(
    "=== getAirportCitySync - Getting city for airport (no cache found) ===",
    {
      airportCode,
      lang: lang || "default",
      result: airportCode,
      timestamp: new Date().toISOString(),
    }
  );

  return airportCode;
};

/**
 * Formats airport information for consistent dropdown display across all components
 * @param location - The airport location data
 * @returns Formatted string for dropdown display: "Airport Name (IATA)"
 */
export const formatAirportDropdownLabel = (location: {
  name?: string;
  city?: string;
  country?: string;
  code?: string;
  iata?: string;
  iata_code?: string;
}): string => {
  const code = location.iata || location.code || location.iata_code || "";
  const name = location.name || "";

  // If we have both name and code, format as "Name (CODE)"
  if (name && code) {
    return `${name} (${code})`;
  }

  // If we only have code, return just the code
  if (code) {
    return code;
  }

  // If we only have name, return just the name
  if (name) {
    return name;
  }

  // Fallback to empty string
  return "";
};
