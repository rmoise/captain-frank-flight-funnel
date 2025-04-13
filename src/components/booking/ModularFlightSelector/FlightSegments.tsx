import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  Fragment,
  ReactElement,
} from "react";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { CustomDateInput } from "@/components/shared/CustomDateInput";
import { useTranslation } from "@/hooks/useTranslation";
import { FlightPreviewCard } from "./FlightPreviewCard";
import type { FlightSegmentsProps } from "./types";
import type { LocationData, Flight } from "@/types/store";
import { TrashIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isValid } from "date-fns";
import "./FlightSegments.css";
import { FlightSearchBottomSheet } from "./FlightSearchBottomSheet";
import useStore from "@/lib/state/store";
import { usePhase4Store } from "@/lib/state/phase4Store";
import { useFlightStore } from "@/lib/state/flightStore";
import { useFlightValidation } from "@/hooks/useFlightValidation";
import type { LocationLike } from "@/types/location";
import { FlightSegmentData } from "@/types/store";
import { processLocation } from "@/lib/state/slices/flightSlice";
import { getAirportCitySync } from "@/utils/locationUtils";

interface Airport {
  iata_code: string;
  name: string;
  city?: string;
}

interface AirportResult extends LocationData {
  name: string;
}

interface RawFlight {
  id: number | undefined;
  flightnumber_iata: string;
  dep_iata: string;
  arr_iata: string;
  dep_time_sched: string;
  arr_time_sched: string;
  dep_time_fact: string | null;
  arr_time_fact: string | null;
  arr_delay_min: number | null;
  status: string;
  aircraft_type?: string;
  dep_city?: string;
  arr_city?: string;
}

// Helper function to safely format date for display
const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return "";

  try {
    // If it's already in dd.MM.yyyy format, return as is
    if (typeof date === "string" && date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return date;
    }

    // If it's a string, try to parse it
    if (typeof date === "string") {
      // If it's an ISO string, parse it
      const parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        return format(parsedDate, "dd.MM.yyyy");
      }
    }

    // If it's a Date object or needs to be converted to one
    const dateObj = date instanceof Date ? date : new Date(date);
    if (!isValid(dateObj)) return "";

    // Normalize to noon UTC to avoid timezone issues
    const normalizedDate = new Date(
      Date.UTC(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        12,
        0,
        0,
        0
      )
    );

    return format(normalizedDate, "dd.MM.yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

// Helper function to format time display
const formatTimeDisplay = (timeStr: string | null | undefined): string => {
  if (!timeStr) return "";
  try {
    let timePart = timeStr;

    if (timeStr.includes(" ")) {
      timePart = timeStr.split(" ")[1];
    }

    if (timePart.includes(":")) {
      const [hours, minutes] = timePart.split(":").slice(0, 2);
      if (hours && minutes) {
        const hour = parseInt(hours, 10);
        if (isNaN(hour)) return "";
        return `${hour.toString().padStart(2, "0")}:${minutes.padStart(
          2,
          "0"
        )}`;
      }
    }

    if (timePart.length === 4) {
      const hours = parseInt(timePart.substring(0, 2), 10);
      const minutes = timePart.substring(2, 4);
      if (isNaN(hours)) return "";
      return `${hours.toString().padStart(2, "0")}:${minutes}`;
    }

    return "";
  } catch (error) {
    return "";
  }
};

// Helper function to calculate duration between times
const calculateDuration = (
  depTime: string | null | undefined,
  arrTime: string | null | undefined
): string => {
  if (!depTime || !arrTime) return "";

  const depFormatted = formatTimeDisplay(depTime);
  const arrFormatted = formatTimeDisplay(arrTime);

  if (!depFormatted || !arrFormatted) return "";

  try {
    const [depHours, depMinutes] = depFormatted.split(":").map(Number);
    const [arrHours, arrMinutes] = arrFormatted.split(":").map(Number);

    let diffMinutes = arrHours * 60 + arrMinutes - (depHours * 60 + depMinutes);

    // Handle overnight flights
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60;
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;

    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return "";
  }
};

// Helper function to transform raw flight data into Flight object
const transformRawFlight = (
  rawFlight: RawFlight,
  formattedDate: string
): Flight | null => {
  if (!rawFlight.id) return null;

  console.log("=== transformRawFlight - Input ===", {
    rawFlight: {
      id: rawFlight.id,
      flightNumber: rawFlight.flightnumber_iata,
      depTime: rawFlight.dep_time_sched,
      arrTime: rawFlight.arr_time_sched,
    },
    formattedDate,
    isValidFormattedDate: isValid(parseISO(formattedDate)),
  });

  const duration = calculateDuration(
    rawFlight.dep_time_sched,
    rawFlight.arr_time_sched
  );

  // Extract airline code from flight number (first 2 characters)
  const airline = rawFlight.flightnumber_iata?.substring(0, 2) || "Unknown";

  // Get city information from the API response
  // If city is not provided, use the IATA code
  const departureCity = rawFlight.dep_city || rawFlight.dep_iata;
  const arrivalCity = rawFlight.arr_city || rawFlight.arr_iata;

  // Always use the search date (formattedDate) instead of any date from the API
  const flight = {
    id: rawFlight.id.toString(), // Convert number to string
    flightNumber: rawFlight.flightnumber_iata,
    airline,
    departureCity,
    arrivalCity,
    departureTime: formatTimeDisplay(rawFlight.dep_time_sched),
    arrivalTime: formatTimeDisplay(rawFlight.arr_time_sched),
    departure: rawFlight.dep_iata,
    arrival: rawFlight.arr_iata,
    duration: duration || "0h 0m",
    stops: 0,
    date: formattedDate, // Use the search date
    price: 0,
    aircraft: rawFlight.aircraft_type || "Unknown",
    class: "economy",
    status: rawFlight.status,
    departureAirport: rawFlight.dep_iata,
    arrivalAirport: rawFlight.arr_iata,
    scheduledDepartureTime: formatTimeDisplay(rawFlight.dep_time_sched),
    scheduledArrivalTime: formatTimeDisplay(rawFlight.arr_time_sched),
    actualDeparture: rawFlight.dep_time_fact
      ? formatTimeDisplay(rawFlight.dep_time_fact)
      : null,
    actualArrival: rawFlight.arr_time_fact
      ? formatTimeDisplay(rawFlight.arr_time_fact)
      : null,
    arrivalDelay: rawFlight.arr_delay_min,
  };

  console.log("=== transformRawFlight - Output ===", {
    flight: {
      id: flight.id,
      flightNumber: flight.flightNumber,
      date: flight.date,
      isValidDate: isValid(parseISO(flight.date)),
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
    },
  });

  return flight;
};

// Helper function to validate flight object
const isValidFlight = (flight: unknown): flight is Flight => {
  if (!flight || typeof flight !== "object") return false;
  const f = flight as Flight;
  return (
    typeof f.id === "string" &&
    typeof f.flightNumber === "string" &&
    typeof f.airline === "string" &&
    typeof f.departureCity === "string" &&
    typeof f.arrivalCity === "string" &&
    typeof f.departureTime === "string" &&
    typeof f.arrivalTime === "string" &&
    typeof f.departure === "string" &&
    typeof f.arrival === "string" &&
    typeof f.duration === "string" &&
    typeof f.date === "string"
  );
};

// Helper function to safely parse date string
const safeParseDateString = (dateStr: string | Date): Date | undefined => {
  try {
    console.log("=== safeParseDateString - Input ===", {
      dateStr,
      type: typeof dateStr,
      isDate: dateStr instanceof Date,
      timestamp: new Date().toISOString(),
    });

    // If it's already a Date object
    if (dateStr instanceof Date) {
      const result = isValid(dateStr) ? dateStr : undefined;
      console.log("=== safeParseDateString - Date object result ===", {
        isValid: isValid(dateStr),
        result,
        timestamp: new Date().toISOString(),
      });
      return result;
    }

    // If it's a string
    if (typeof dateStr === "string") {
      // If it's in dd.MM.yyyy format
      if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        const [day, month, year] = dateStr.split(".").map(Number);
        const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
        const result = isValid(date) ? date : undefined;
        console.log("=== safeParseDateString - dd.MM.yyyy format result ===", {
          day,
          month,
          year,
          date,
          isValid: isValid(date),
          result,
          timestamp: new Date().toISOString(),
        });
        return result;
      }

      // If it's an ISO string
      if (dateStr.includes("T") || dateStr.includes("-")) {
        const date = parseISO(dateStr);
        const result = isValid(date) ? date : undefined;
        console.log("=== safeParseDateString - ISO format result ===", {
          date,
          isValid: isValid(date),
          result,
          timestamp: new Date().toISOString(),
        });
        return result;
      }
    }

    // If parsing fails
    console.error("Unable to parse date:", dateStr);
    return undefined;
  } catch (error) {
    console.error("Error parsing date:", error);
    return undefined;
  }
};

// Helper function to convert LocationData to string & LocationLike
const convertToLocationLike = (
  location: LocationData | null
): (string & LocationLike) | null => {
  if (!location) return null;
  const stringValue = location.value || "";
  return Object.assign(String(stringValue), {
    value: location.value || "",
    label: location.label || "",
    description: location.description || "",
    city: location.city || "",
  }) as string & LocationLike;
};

// Helper function to safely clear date flags in localStorage
const clearDateFlags = (phase: number, segmentIndex?: number) => {
  try {
    console.log(`=== FlightSegments - Clearing date flags ===`, {
      phase,
      segmentIndex: segmentIndex !== undefined ? segmentIndex : "all segments",
      timestamp: new Date().toISOString(),
    });

    // If segmentIndex is provided, only clear that segment's flag
    if (segmentIndex !== undefined) {
      const dateClearFlagKey = `dateWasCleared_phase${phase}_segment${segmentIndex}`;
      if (localStorage.getItem(dateClearFlagKey)) {
        localStorage.removeItem(dateClearFlagKey);
        console.log(`=== FlightSegments - Cleared date flag ===`, {
          flagKey: dateClearFlagKey,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    // Otherwise, clear all date flags for this phase
    for (let i = 0; i < 10; i++) {
      // Assuming max 10 segments
      const dateClearFlagKey = `dateWasCleared_phase${phase}_segment${i}`;
      if (localStorage.getItem(dateClearFlagKey)) {
        localStorage.removeItem(dateClearFlagKey);
        console.log(`=== FlightSegments - Cleared date flag ===`, {
          flagKey: dateClearFlagKey,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error("Error clearing date flags:", error);
  }
};

// Helper function to safely clear location flags in localStorage
const clearLocationFlags = (
  phase: number,
  segmentIndex?: number,
  field?: "fromLocation" | "toLocation"
) => {
  try {
    console.log(`=== FlightSegments - Clearing location flags ===`, {
      phase,
      segmentIndex: segmentIndex !== undefined ? segmentIndex : "all segments",
      field: field || "both locations",
      timestamp: new Date().toISOString(),
    });

    // If specific segment and field, only clear that flag
    if (segmentIndex !== undefined && field) {
      const locationClearFlagKey = `locationWasCleared_phase${phase}_segment${segmentIndex}_${field}`;
      if (localStorage.getItem(locationClearFlagKey)) {
        localStorage.removeItem(locationClearFlagKey);
        console.log(`=== FlightSegments - Cleared location flag ===`, {
          flagKey: locationClearFlagKey,
          timestamp: new Date().toISOString(),
        });
      }
      return;
    }

    // If just segment specified, clear both fields
    if (segmentIndex !== undefined) {
      const fields = ["fromLocation", "toLocation"];
      fields.forEach((field) => {
        const locationClearFlagKey = `locationWasCleared_phase${phase}_segment${segmentIndex}_${field}`;
        if (localStorage.getItem(locationClearFlagKey)) {
          localStorage.removeItem(locationClearFlagKey);
          console.log(`=== FlightSegments - Cleared location flag ===`, {
            flagKey: locationClearFlagKey,
            timestamp: new Date().toISOString(),
          });
        }
      });
      return;
    }

    // Otherwise, clear all location flags for this phase
    for (let i = 0; i < 10; i++) {
      // Assuming max 10 segments
      const fields = ["fromLocation", "toLocation"];
      fields.forEach((field) => {
        const locationClearFlagKey = `locationWasCleared_phase${phase}_segment${i}_${field}`;
        if (localStorage.getItem(locationClearFlagKey)) {
          localStorage.removeItem(locationClearFlagKey);
          console.log(`=== FlightSegments - Cleared location flag ===`, {
            flagKey: locationClearFlagKey,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }
  } catch (error) {
    console.error("Error clearing location flags:", error);
  }
};

// Helper function to completely clear all location data when switching flight types
const clearAllLocationData = (phase: number) => {
  try {
    console.log(
      `=== FlightSegments - Clearing all location data for flight type switch ===`,
      {
        phase,
        timestamp: new Date().toISOString(),
      }
    );

    // Clear all segment data in localStorage for this phase
    const storageKeys = Object.keys(localStorage);

    // Clear any keys related to flight segments for this phase
    storageKeys.forEach((key) => {
      if (
        key.includes(`flightSegment_phase${phase}`) ||
        key.includes(`flightData_phase${phase}`) ||
        key.includes(`locationWasCleared_phase${phase}`) ||
        key.includes(`dateWasCleared_phase${phase}`)
      ) {
        localStorage.removeItem(key);
        console.log(`=== FlightSegments - Removed storage key ===`, {
          key,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Also remove any cached locations in session storage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach((key) => {
      if (key.includes(`location_phase${phase}`)) {
        sessionStorage.removeItem(key);
        console.log(`=== FlightSegments - Removed session storage key ===`, {
          key,
          timestamp: new Date().toISOString(),
        });
      }
    });
  } catch (error) {
    console.error("Error clearing all location data:", error);
  }
};

// A utility function to clean up potentially orphaned location data on unmount
const cleanupLocationStorage = () => {
  try {
    console.log(`=== FlightSegments - Running location storage cleanup ===`, {
      timestamp: new Date().toISOString(),
    });

    // Clean up flags that might be left behind
    const allKeys = Object.keys(localStorage).filter(
      (key) =>
        key.includes("locationWasCleared_") ||
        key.includes("flight") ||
        key.includes("location_")
    );

    // Check each storage key that has a "was cleared" flag
    // to see if the corresponding data was actually removed
    allKeys.forEach((key) => {
      if (key.includes("locationWasCleared_")) {
        // Extract phase, segment and field info
        const parts = key.split("_");
        if (parts.length >= 3) {
          const phasePart = parts[1]; // e.g. "phase1"
          const segmentPart = parts[2]; // e.g. "segment0"
          const fieldPart = parts[3]; // e.g. "fromLocation"

          if (phasePart && segmentPart && fieldPart) {
            const phase = phasePart.replace("phase", "");
            const segment = segmentPart.replace("segment", "");
            const field = fieldPart;

            // Check phase state to ensure this location is really cleared
            try {
              const phaseStateKey = `phase${phase}State`;
              const phaseStateData = localStorage.getItem(phaseStateKey);

              if (phaseStateData) {
                const state = JSON.parse(phaseStateData);
                // Check if the segment exists and the field should be null
                if (
                  state.flightSegments &&
                  Array.isArray(state.flightSegments) &&
                  state.flightSegments[Number(segment)] &&
                  state.flightSegments[Number(segment)][field]
                ) {
                  // Location exists in state but has a clear flag - force clear it
                  state.flightSegments[Number(segment)][field] = null;

                  // If this is the first/last segment, also clear the root location
                  if (
                    (Number(segment) === 0 && field === "fromLocation") ||
                    (field === "toLocation" &&
                      Number(segment) === state.flightSegments.length - 1)
                  ) {
                    state[field] = null;
                  }

                  localStorage.setItem(phaseStateKey, JSON.stringify(state));
                  console.log(
                    `=== FlightSegments - Cleanup: Cleared orphaned location ===`,
                    {
                      phase,
                      segment,
                      field,
                      timestamp: new Date().toISOString(),
                    }
                  );
                }
              }
            } catch (error) {
              console.error(`Cleanup: Error checking phase state data:`, error);
            }

            // Also check flight data storage
            try {
              const flightDataKey = `flightData_phase${phase}`;
              const flightData = localStorage.getItem(flightDataKey);

              if (flightData) {
                const data = JSON.parse(flightData);
                if (
                  data.flightSegments &&
                  Array.isArray(data.flightSegments) &&
                  data.flightSegments[Number(segment)] &&
                  data.flightSegments[Number(segment)][field]
                ) {
                  // Force clear the location
                  data.flightSegments[Number(segment)][field] = null;

                  // If this is the first/last segment, also clear the root location
                  if (
                    (Number(segment) === 0 && field === "fromLocation") ||
                    (field === "toLocation" &&
                      Number(segment) === data.flightSegments.length - 1)
                  ) {
                    data[field] = null;
                  }

                  localStorage.setItem(flightDataKey, JSON.stringify(data));
                  console.log(
                    `=== FlightSegments - Cleanup: Cleared orphaned flight data location ===`,
                    {
                      phase,
                      segment,
                      field,
                      timestamp: new Date().toISOString(),
                    }
                  );
                }
              }
            } catch (error) {
              console.error(`Error checking flight data:`, error);
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error during location storage cleanup:", error);
  }
};

// Storage helpers to manage localStorage for flight segments
const storageHelpers = {
  // Save flight data to localStorage
  save: (phase: number, data: any) => {
    try {
      // Use consistent key format
      const key = `flightData_phase${phase}`;

      // Get existing data
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw ? JSON.parse(existingRaw) : {};

      // Process segments to respect the dateWasCleared flags
      if (data.flightSegments && Array.isArray(data.flightSegments)) {
        data.flightSegments = data.flightSegments.map(
          (segment: any, index: number) => {
            // Check if this date was explicitly cleared
            const dateClearFlagKey = `dateWasCleared_phase${phase}_segment${index}`;
            const wasDateExplicitlyCleared =
              localStorage.getItem(dateClearFlagKey) === "true";

            // If date was explicitly cleared, always ensure it's null
            if (wasDateExplicitlyCleared) {
              console.log(
                `=== FlightSegments Storage Helper - Enforcing cleared date for segment ${index} ===`,
                {
                  timestamp: new Date().toISOString(),
                }
              );

              return {
                ...segment,
                date: null,
                // Also clear selectedFlight date
                selectedFlight: segment.selectedFlight
                  ? { ...segment.selectedFlight, date: null }
                  : null,
              };
            }

            return segment;
          }
        );
      }

      // Save to localStorage with merged data
      localStorage.setItem(key, JSON.stringify({ ...existing, ...data }));

      console.log(`=== FlightSegments - Saved data to localStorage ===`, {
        phase,
        segmentCount: data.flightSegments?.length,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving to localStorage:", error);
    }
  },

  clear: (phase: number, segmentIndex?: number, skipSync = false) => {
    try {
      console.log(`=== FlightSegments - Clearing localStorage data ===`, {
        phase,
        segmentIndex,
        skipSync,
        timestamp: new Date().toISOString(),
      });

      let anyChange = false;

      // Keys to check
      const keysToCheck = [
        `phase${phase}SelectedFlights`,
        `phase${phase}State`,
        `phase${phase}FlightData`,
        `flightData_phase${phase}`,
      ];

      // Find all dynamic segment keys
      if (typeof localStorage !== "undefined") {
        const storageKeys = Object.keys(localStorage);
        storageKeys.forEach((key) => {
          if (key.includes(`flightSegment_phase${phase}`)) {
            keysToCheck.push(key);
          }
        });
      }

      // Process each key
      keysToCheck.forEach((key) => {
        try {
          const value = localStorage.getItem(key);
          if (!value) return;

          let data = JSON.parse(value);
          let modified = false;

          // Option 1: Clear specific segment
          if (segmentIndex !== undefined && data.flightSegments) {
            const segments = data.flightSegments;
            if (
              segments &&
              Array.isArray(segments) &&
              segmentIndex < segments.length &&
              segments[segmentIndex]?.selectedFlight
            ) {
              const flightId = segments[segmentIndex].selectedFlight.id;
              segments[segmentIndex] = {
                ...segments[segmentIndex],
                selectedFlight: null,
              };
              data.flightSegments = segments;
              modified = true;
              console.log(
                `=== FlightSegments - Cleared segment ${segmentIndex} flight in ${key} ===`,
                {
                  flightId,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
          // Option 2: Clear all flight data
          else if (segmentIndex === undefined) {
            // Clear flights completely
            if (data.selectedFlight) {
              const flightId = data.selectedFlight.id;
              data.selectedFlight = null;
              modified = true;
              console.log(
                `=== FlightSegments - Cleared selectedFlight in ${key} ===`,
                {
                  flightId,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            if (data.selectedFlights && Array.isArray(data.selectedFlights)) {
              if (data.selectedFlights.length > 0) {
                console.log(
                  `=== FlightSegments - Cleared all selectedFlights in ${key} ===`,
                  {
                    count: data.selectedFlights.length,
                    flightIds: data.selectedFlights
                      .map((f: any) => f?.id)
                      .filter(Boolean),
                    timestamp: new Date().toISOString(),
                  }
                );
              }
              data.selectedFlights = [];
              modified = true;
            }

            // Also clear all segments if present
            if (data.flightSegments && Array.isArray(data.flightSegments)) {
              let segmentsModified = false;
              data.flightSegments = data.flightSegments.map((segment: any) => {
                if (segment && segment.selectedFlight) {
                  segmentsModified = true;
                  return { ...segment, selectedFlight: null };
                }
                return segment;
              });

              if (segmentsModified) {
                modified = true;
                console.log(
                  `=== FlightSegments - Cleared all segment flights in ${key} ===`,
                  {
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          }

          // Save back if modified
          if (modified) {
            localStorage.setItem(key, JSON.stringify(data));
            anyChange = true;
            console.log(`=== FlightSegments - Cleared data from ${key} ===`, {
              segmentIndex,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error(`Error clearing data in ${key}:`, e);
        }
      });

      // Clear date and location clear flags where appropriate
      if (segmentIndex === undefined) {
        // If clearing all data, also clear all date and location clear flags
        if (typeof localStorage !== "undefined") {
          const allKeys = Object.keys(localStorage);
          const flagKeys = allKeys.filter(
            (key) =>
              key.includes(`dateWasCleared_phase${phase}`) ||
              key.includes(`locationWasCleared_phase${phase}`)
          );

          if (flagKeys.length > 0) {
            flagKeys.forEach((key) => {
              localStorage.removeItem(key);
              console.log(`=== FlightSegments - Removed flag ===`, {
                key,
                timestamp: new Date().toISOString(),
              });
            });
            anyChange = true;
          }
        }
      } else if (segmentIndex !== undefined) {
        // If clearing specific segment, clear its date and location flags
        const dateClearFlagKey = `dateWasCleared_phase${phase}_segment${segmentIndex}`;
        const fromLocationClearFlagKey = `locationWasCleared_phase${phase}_segment${segmentIndex}_fromLocation`;
        const toLocationClearFlagKey = `locationWasCleared_phase${phase}_segment${segmentIndex}_toLocation`;

        [
          dateClearFlagKey,
          fromLocationClearFlagKey,
          toLocationClearFlagKey,
        ].forEach((key) => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            console.log(`=== FlightSegments - Removed segment flag ===`, {
              key,
              timestamp: new Date().toISOString(),
            });
            anyChange = true;
          }
        });
      }

      // Sync with other phases if needed
      if (!skipSync && [1, 2, 3].includes(phase)) {
        // Find which other phases to sync to
        const syncPhases = [1, 2, 3].filter((p) => p !== phase);

        // Clear from these phases without causing infinite recursion
        syncPhases.forEach((syncPhase) => {
          storageHelpers.clear(syncPhase, segmentIndex, true);
        });
      }

      return anyChange;
    } catch (error) {
      console.error("Error clearing localStorage:", error);
      return false;
    }
  },
};

export const FlightSegments: React.FC<FlightSegmentsProps> = ({
  showFlightSearch = false,
  disabled = false,
  stepNumber,
  currentPhase,
  onInteract = () => {},
  setValidationState,
  setIsFlightNotListedOpen = () => {},
}) => {
  console.log("=== FlightSegments - Component Initialization ===", {
    showFlightSearch,
    disabled,
    stepNumber,
    currentPhase,
    timestamp: new Date().toISOString(),
    navigationFlag: localStorage.getItem("navigation_in_progress"),
    navigatingToPhase3: localStorage.getItem("navigating_to_phase3"),
  });

  const { t, lang } = useTranslation();
  const mainStore = useStore();
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const [searchResults, setSearchResults] = useState<Flight[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);

  // Add new state to track manually parsed dates for segments
  const [parsedDates, setParsedDates] = useState<(Date | null)[]>([]);

  // Get the appropriate store based on phase
  const store = currentPhase === 4 ? phase4Store : mainStore;

  // Use the global cleanupLocationStorage function defined at the top of the file
  // Add cleanup effect to run on component unmount
  useEffect(() => {
    return () => {
      // Clean up any orphaned location data when component unmounts
      cleanupLocationStorage();
    };
  }, []);

  const updateStores = useCallback(
    (updates: {
      flightSegments: typeof mainStore.flightSegments;
      selectedFlight?: typeof mainStore.selectedFlight;
      selectedFlights?: typeof mainStore.selectedFlights;
    }) => {
      // Create a deep copy of the updates to avoid modifying read-only properties
      const safeUpdates = {
        flightSegments: JSON.parse(JSON.stringify(updates.flightSegments)),
        selectedFlight: updates.selectedFlight
          ? JSON.parse(JSON.stringify(updates.selectedFlight))
          : null,
        selectedFlights: updates.selectedFlights
          ? JSON.parse(JSON.stringify(updates.selectedFlights))
          : undefined,
      };

      // Log segments before store update
      console.log("=== updateStores - Input Segments ===", {
        segments: safeUpdates.flightSegments.map((seg: any) => ({
          fromLocation: seg.fromLocation?.value,
          toLocation: seg.toLocation?.value,
          dateType: seg.date ? typeof seg.date : "null",
          dateValue: seg.date,
          dateStr:
            seg.date instanceof Date
              ? formatDateForDisplay(seg.date)
              : seg.date,
          hasSelectedFlight: !!seg.selectedFlight,
          flightDate: seg.selectedFlight?.date,
        })),
        phase: currentPhase,
        timestamp: new Date().toISOString(),
      });

      if (currentPhase === 4) {
        if (!phase4Store) return;

        phase4Store.batchUpdate({
          flightSegments: safeUpdates.flightSegments,
          selectedFlight: safeUpdates.selectedFlight || null,
          selectedFlights: safeUpdates.selectedFlights || [],
          fromLocation: safeUpdates.flightSegments[0]?.fromLocation
            ? JSON.parse(
                JSON.stringify(safeUpdates.flightSegments[0].fromLocation)
              )
            : null,
          toLocation: safeUpdates.flightSegments[
            safeUpdates.flightSegments.length - 1
          ]?.toLocation
            ? JSON.parse(
                JSON.stringify(
                  safeUpdates.flightSegments[
                    safeUpdates.flightSegments.length - 1
                  ].toLocation
                )
              )
            : null,
        });

        // Log segments after store update for phase 4
        console.log("=== updateStores - Phase 4 After Update ===", {
          segments: phase4Store.flightSegments.map((seg: any) => ({
            fromLocation: seg.fromLocation?.value,
            toLocation: seg.toLocation?.value,
            dateType: seg.date ? typeof seg.date : "null",
            dateValue: seg.date,
            dateStr:
              seg.date instanceof Date
                ? formatDateForDisplay(seg.date)
                : seg.date,
            hasSelectedFlight: !!seg.selectedFlight,
            flightDate: seg.selectedFlight?.date,
          })),
          timestamp: new Date().toISOString(),
        });
      } else {
        if (!mainStore) return;

        // Get remaining selected flights from segments if not provided
        const selectedFlights =
          safeUpdates.selectedFlights ??
          safeUpdates.flightSegments
            .map((segment: any) => segment.selectedFlight)
            .filter((flight: any): flight is Flight => flight !== null);

        // Update all relevant store states atomically
        mainStore.batchUpdateWizardState({
          flightSegments: safeUpdates.flightSegments,
          selectedFlight: safeUpdates.selectedFlight ?? null,
          selectedFlights,
          fromLocation: safeUpdates.flightSegments[0]?.fromLocation
            ? convertToLocationLike(safeUpdates.flightSegments[0].fromLocation)
            : null,
          toLocation: safeUpdates.flightSegments[
            safeUpdates.flightSegments.length - 1
          ]?.toLocation
            ? convertToLocationLike(
                safeUpdates.flightSegments[
                  safeUpdates.flightSegments.length - 1
                ].toLocation
              )
            : null,
        });

        // Log segments after store update for normal phases
        console.log("=== updateStores - After Update ===", {
          segments: mainStore.flightSegments.map((seg: any) => ({
            fromLocation: seg.fromLocation?.value,
            toLocation: seg.toLocation?.value,
            dateType: seg.date ? typeof seg.date : "null",
            dateValue: seg.date,
            dateStr:
              seg.date instanceof Date
                ? formatDateForDisplay(seg.date)
                : seg.date,
            hasSelectedFlight: !!seg.selectedFlight,
            flightDate: seg.selectedFlight?.date,
          })),
          phase: currentPhase,
          timestamp: new Date().toISOString(),
        });
      }
    },
    [currentPhase, phase4Store, mainStore]
  );

  // Effect to initialize parsed dates from localStorage on component mount
  useEffect(() => {
    if (!store?.flightSegments) return;

    // Try to get dates from localStorage
    try {
      // First, check if we have a list of deleted flights to respect
      const deletedFlightsKey = `phase${currentPhase}_deleted_flights`;
      let deletedFlightIds: string[] = [];
      try {
        const deletedFlightsStr = localStorage.getItem(deletedFlightsKey);
        if (deletedFlightsStr) {
          deletedFlightIds = JSON.parse(deletedFlightsStr);
          console.log("=== FlightSegments - Found deleted flights list ===", {
            deletedFlightIds,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Error parsing deleted flights:", e);
      }

      // Check multiple sources to find date data
      const sources = [
        `phase${currentPhase}State`,
        `flightData_phase${currentPhase}`,
        `phase${currentPhase}FlightData`,
        `dateCache_phase${currentPhase}`,
      ];

      let datesFound = false;
      let storedDates: (Date | null)[] = Array(
        store.flightSegments.length
      ).fill(null);

      // Try each source until we find valid dates
      for (const source of sources) {
        if (datesFound) break;

        const existingData = localStorage.getItem(source);
        if (!existingData) continue;

        try {
          const parsedData = JSON.parse(existingData);

          // Check if this source has flight segments with dates
          if (
            parsedData.flightSegments &&
            Array.isArray(parsedData.flightSegments)
          ) {
            // Look for valid date strings in each segment
            let hasValidDates = false;

            const extractedDates = parsedData.flightSegments.map(
              (segment: any, idx: number) => {
                if (!segment || !segment.date) return null;

                // Skip restoration for segments with deleted flights
                if (
                  segment.selectedFlight &&
                  deletedFlightIds.includes(segment.selectedFlight.id)
                ) {
                  console.log(
                    `=== FlightSegments - Skipping date restoration for deleted flight ===`,
                    {
                      flightId: segment.selectedFlight.id,
                      segmentIndex: idx,
                      source,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  return null;
                }

                // Check if the date was explicitly cleared by the user
                const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${idx}`;
                const wasDateExplicitlyCleared =
                  localStorage.getItem(dateClearFlagKey) === "true";

                if (wasDateExplicitlyCleared) {
                  console.log(
                    `=== FlightSegments - Date was explicitly cleared for segment ${idx}, not restoring ===`,
                    {
                      segmentIndex: idx,
                      source,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  return null;
                }

                // Handle date string in dd.MM.yyyy format
                if (
                  typeof segment.date === "string" &&
                  segment.date.match(/^\d{2}\.\d{2}\.\d{4}$/)
                ) {
                  const [day, month, year] = segment.date
                    .split(".")
                    .map(Number);
                  const parsedDate = new Date(
                    Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                  );

                  if (isValid(parsedDate)) {
                    hasValidDates = true;
                    console.log(
                      `=== FlightSegments - Parsed date from ${source} ===`,
                      {
                        originalString: segment.date,
                        parsedDate,
                        segmentIndex: idx,
                        source,
                        timestamp: new Date().toISOString(),
                      }
                    );
                    return parsedDate;
                  }
                }

                // Try ISO date string
                if (
                  typeof segment.date === "string" &&
                  (segment.date.includes("T") || segment.date.includes("-"))
                ) {
                  const parsedDate = parseISO(segment.date);
                  if (isValid(parsedDate)) {
                    hasValidDates = true;
                    console.log(
                      `=== FlightSegments - Parsed ISO date from ${source} ===`,
                      {
                        originalString: segment.date,
                        parsedDate,
                        segmentIndex: idx,
                        source,
                        timestamp: new Date().toISOString(),
                      }
                    );
                    return parsedDate;
                  }
                }

                return null;
              }
            );

            // If we found valid dates, use them
            if (hasValidDates) {
              storedDates = extractedDates;
              datesFound = true;
              console.log(
                `=== FlightSegments - Using dates from ${source} ===`,
                {
                  dates: storedDates.map((d) =>
                    d ? format(d, "dd.MM.yyyy") : null
                  ),
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } catch (error) {
          console.error(`Error parsing date data from ${source}:`, error);
        }
      }

      // Update parsed dates state
      if (datesFound) {
        setParsedDates(storedDates);

        // Also update the store with these dates
        const updatedSegments = [...store.flightSegments];
        let hasChanges = false;

        storedDates.forEach((date, idx) => {
          // Skip if the date was explicitly cleared by the user
          const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${idx}`;
          const wasDateExplicitlyCleared =
            localStorage.getItem(dateClearFlagKey) === "true";

          if (wasDateExplicitlyCleared) {
            console.log(
              `=== FlightSegments - Not updating store with date for segment ${idx} because it was explicitly cleared ===`,
              {
                segmentIndex: idx,
                timestamp: new Date().toISOString(),
              }
            );
            return;
          }

          if (
            date &&
            idx < updatedSegments.length &&
            !updatedSegments[idx].date
          ) {
            updatedSegments[idx] = {
              ...updatedSegments[idx],
              date,
            };
            hasChanges = true;
          }
        });

        if (hasChanges) {
          console.log(
            "=== FlightSegments - Updating store with restored dates ===",
            {
              segments: updatedSegments.map((seg, idx) => ({
                segmentIndex: idx,
                date: seg.date ? format(seg.date as Date, "dd.MM.yyyy") : null,
                parsedDate: storedDates[idx]
                  ? format(storedDates[idx] as Date, "dd.MM.yyyy")
                  : null,
              })),
              timestamp: new Date().toISOString(),
            }
          );

          updateStores({ flightSegments: updatedSegments });

          // Also save the restored dates to localStorage
          storageHelpers.save(currentPhase, {
            flightSegments: updatedSegments,
          });
        }
      }
    } catch (error) {
      console.error("Error retrieving dates from localStorage:", error);
    }
  }, [currentPhase, store?.flightSegments, updateStores]);

  // Effect to restore locations from localStorage
  useEffect(() => {
    if (!store?.flightSegments) return;

    console.log(
      "=== FlightSegments - Attempting to restore location data ===",
      {
        segments: store.flightSegments.map((seg, idx) => ({
          segmentIndex: idx,
          fromLocation:
            typeof seg.fromLocation === "object" &&
            "value" in (seg.fromLocation || {})
              ? seg.fromLocation?.value
              : seg.fromLocation,
          toLocation:
            typeof seg.toLocation === "object" &&
            "value" in (seg.toLocation || {})
              ? seg.toLocation?.value
              : seg.toLocation,
          hasFromLocation: !!seg.fromLocation,
          hasToLocation: !!seg.toLocation,
          fromType: typeof seg.fromLocation,
          toType: typeof seg.toLocation,
        })),
        selectedType: store.selectedType,
        timestamp: new Date().toISOString(),
      }
    );

    // CRITICAL FIX: For phase 3, check if we need to adjust segments based on selected type
    if (currentPhase === 3) {
      try {
        // Check if we need to adjust segments for direct flights
        if (
          store.selectedType === "direct" &&
          store.flightSegments.length > 1
        ) {
          console.log(
            "=== FlightSegments - Fixing direct flight mode (too many segments) ===",
            {
              currentSegments: store.flightSegments.length,
              selectedType: "direct",
              timestamp: new Date().toISOString(),
            }
          );

          // For direct flights, only keep the first segment
          const updatedSegments = [store.flightSegments[0]];

          // Update the store with the correct number of segments for direct flight
          updateStores({ flightSegments: updatedSegments });

          // Also update localStorage
          storageHelpers.save(currentPhase, {
            flightSegments: updatedSegments,
            selectedType: "direct",
          });

          // Save to flightStore with the preserve flag to prevent further modifications
          flightStore.saveFlightData(currentPhase, {
            flightSegments: updatedSegments,
            selectedType: "direct",
            _preserveFlightSegments: true,
            timestamp: Date.now(),
          });

          console.log(
            "=== FlightSegments - Adjusted segments for direct flight ===",
            {
              segmentCount: updatedSegments.length,
              timestamp: new Date().toISOString(),
            }
          );

          // Return early as we've handled this case
          return;
        }
      } catch (error) {
        console.error("Error adjusting segments for direct flight:", error);
      }
    }

    // CRITICAL FIX: For multi-segment in Phase 3, check if we need location data restoration
    if (
      currentPhase === 3 &&
      store.selectedType === "multi" &&
      store.flightSegments.length > 0
    ) {
      const p3LocationMappingNeeded = store.flightSegments.some((segment) => {
        // Check if the segment has missing or improper location format
        const fromLocationInvalid =
          !segment.fromLocation ||
          (typeof segment.fromLocation === "object" &&
            !("value" in (segment.fromLocation || {})));
        const toLocationInvalid =
          !segment.toLocation ||
          (typeof segment.toLocation === "object" &&
            !("value" in (segment.toLocation || {})));

        return fromLocationInvalid || toLocationInvalid;
      });

      // Log the location validation status
      console.log("=== FlightSegments - Location validation status ===", {
        missingLocationsDetected: p3LocationMappingNeeded,
        segmentCount: store.flightSegments.length,
        selectedType: store.selectedType,
        mainFromLocation: store.fromLocation,
        mainToLocation: store.toLocation,
        timestamp: new Date().toISOString(),
      });

      // If any segment has invalid locations, try to restore them
      if (p3LocationMappingNeeded) {
        try {
          // Try phase 1 data first as the primary source when restoring in multi-segment mode
          const phase1Data = localStorage.getItem("flightData_phase1");
          const phase1State = phase1Data ? JSON.parse(phase1Data) : null;

          // Then try phase 2 data
          const phase2Data = localStorage.getItem("flightData_phase2");
          const phase2State = phase2Data ? JSON.parse(phase2Data) : null;

          if (
            (phase1State?.flightSegments &&
              phase1State.flightSegments.length > 0) ||
            (phase2State?.flightSegments &&
              phase2State.flightSegments.length > 0)
          ) {
            // Prefer phase 1 data in multi-segment mode, fall back to phase 2 if needed
            const sourceState =
              phase1State?.flightSegments &&
              phase1State.flightSegments.length > 0
                ? phase1State
                : phase2State;

            const sourcePhase =
              phase1State?.flightSegments &&
              phase1State.flightSegments.length > 0
                ? "Phase 1"
                : "Phase 2";

            console.log(
              `=== FlightSegments - Restoring segment locations from ${sourcePhase} ===`,
              {
                segmentCount: sourceState.flightSegments.length,
                sourceLocations: sourceState.flightSegments.map(
                  (seg: any, idx: number) => ({
                    segmentIndex: idx,
                    from:
                      typeof seg.fromLocation === "object"
                        ? seg.fromLocation?.value
                        : seg.fromLocation,
                    to:
                      typeof seg.toLocation === "object"
                        ? seg.toLocation?.value
                        : seg.toLocation,
                  })
                ),
                timestamp: new Date().toISOString(),
              }
            );

            // Create updated segments by preserving locations from source phase
            const updatedSegments = [...store.flightSegments].map(
              (segment, idx) => {
                // If we have matching segment in source, use those locations
                if (idx < sourceState.flightSegments.length) {
                  const sourceSegment = sourceState.flightSegments[idx];

                  return {
                    ...segment,
                    // CRITICAL FIX: Directly use the exact source location objects without any processing
                    // to preserve all properties including German labels
                    fromLocation:
                      sourceSegment?.fromLocation || segment.fromLocation,
                    toLocation: sourceSegment?.toLocation || segment.toLocation,
                  };
                }

                return segment;
              }
            );

            // For multi-segment in phase 3, we need to get main locations from current store
            const mainFromLocation =
              typeof store.fromLocation === "object" &&
              "value" in (store.fromLocation || {})
                ? store.fromLocation // Use the complete object to preserve labels
                : store.fromLocation
                ? { value: store.fromLocation, label: store.fromLocation }
                : null;

            const mainToLocation =
              typeof store.toLocation === "object" &&
              "value" in (store.toLocation || {})
                ? store.toLocation // Use the complete object to preserve labels
                : store.toLocation
                ? { value: store.toLocation, label: store.toLocation }
                : null;

            // Check if first segment fromLocation is completely missing
            if (
              mainFromLocation &&
              updatedSegments.length > 0 &&
              !updatedSegments[0].fromLocation
            ) {
              updatedSegments[0] = {
                ...updatedSegments[0],
                fromLocation: mainFromLocation,
              };
            }

            // Check if last segment toLocation is completely missing
            if (
              mainToLocation &&
              updatedSegments.length > 0 &&
              !updatedSegments[updatedSegments.length - 1].toLocation
            ) {
              updatedSegments[updatedSegments.length - 1] = {
                ...updatedSegments[updatedSegments.length - 1],
                toLocation: mainToLocation,
              };
            }

            // Ensure intermediate segments have proper from/to locations
            for (let i = 0; i < updatedSegments.length; i++) {
              // Copy the toLocation from previous segment to fromLocation if missing
              if (
                i > 0 &&
                !updatedSegments[i].fromLocation &&
                updatedSegments[i - 1].toLocation
              ) {
                updatedSegments[i] = {
                  ...updatedSegments[i],
                  fromLocation: updatedSegments[i - 1].toLocation,
                };
              }

              // Copy the fromLocation from next segment to toLocation if missing
              if (
                i < updatedSegments.length - 1 &&
                !updatedSegments[i].toLocation &&
                updatedSegments[i + 1].fromLocation
              ) {
                updatedSegments[i] = {
                  ...updatedSegments[i],
                  toLocation: updatedSegments[i + 1].fromLocation,
                };
              }
            }

            console.log("=== FlightSegments - After Location Restoration ===", {
              segments: updatedSegments.map((s, idx) => ({
                segmentIndex: idx,
                from:
                  typeof s.fromLocation === "object"
                    ? s.fromLocation?.value
                    : s.fromLocation,
                to:
                  typeof s.toLocation === "object"
                    ? s.toLocation?.value
                    : s.toLocation,
                fromType: typeof s.fromLocation,
                toType: typeof s.toLocation,
              })),
              phase: currentPhase,
              timestamp: new Date().toISOString(),
            });

            // Save to flight store
            updateStores({ flightSegments: updatedSegments });

            // Also update localStorage directly for the current phase
            storageHelpers.save(currentPhase, {
              flightSegments: updatedSegments,
            });
            console.log("=== FlightSegments - Data saved to phase 3 ===", {
              updatedFields: ["flightSegments"],
              timestamp: new Date().toISOString(),
            });

            // Sync with other phases for consistency
            storageHelpers.save(1, {
              flightSegments: updatedSegments,
              fromLocation: store.fromLocation,
              toLocation: store.toLocation,
              selectedType: store.selectedType,
            });
            console.log("=== FlightSegments - Data synced to phase 1 ===", {
              updatedFields: [
                "flightSegments",
                "fromLocation",
                "toLocation",
                "selectedType",
              ],
              timestamp: new Date().toISOString(),
            });

            storageHelpers.save(2, {
              flightSegments: updatedSegments,
              fromLocation: store.fromLocation,
              toLocation: store.toLocation,
              selectedType: store.selectedType,
            });
            console.log("=== FlightSegments - Data synced to phase 2 ===", {
              updatedFields: [
                "flightSegments",
                "fromLocation",
                "toLocation",
                "selectedType",
              ],
              timestamp: new Date().toISOString(),
            });

            return; // Exit early after fixing the locations
          }
        } catch (error) {
          console.error("Error restoring locations:", error);
        }
      }
    }
  }, [currentPhase, store?.flightSegments, updateStores]);

  // NEW EFFECT: Fix for phase 3 selectedFlight synchronization issue
  useEffect(() => {
    // Only run this for phase 3 where the issue occurs
    if (currentPhase !== 3 || !mainStore?.flightSegments) return;

    // Check if we need to sync - only if segments exist but don't have selectedFlight
    const needsSync = mainStore.flightSegments.some(
      (segment) => !segment.selectedFlight
    );

    if (!needsSync) {
      console.log(
        "=== FlightSegments - No flight data sync needed, selectedFlights already present ===",
        {
          timestamp: new Date().toISOString(),
        }
      );
      return;
    }

    // Get flight data from flightStore for phase 3
    const flightData = flightStore.getFlightData(3);

    if (flightData && flightData.selectedFlights?.length > 0) {
      console.log(
        "=== FlightSegments - Syncing missing selectedFlight data from flightStore ===",
        {
          flightCount: flightData.selectedFlights.length,
          flightNumbers: flightData.selectedFlights.map((f) => f.flightNumber),
          segmentCount: mainStore.flightSegments.length,
          timestamp: new Date().toISOString(),
        }
      );

      try {
        // Create a deep copy of the segments to avoid modifying read-only objects
        const segmentsCopy = JSON.parse(
          JSON.stringify(mainStore.flightSegments)
        );

        // Create updated segments with the selectedFlight from flightStore
        const updatedSegments = segmentsCopy.map(
          (segment: any, idx: number) => {
            if (
              idx < flightData.selectedFlights.length &&
              !segment.selectedFlight
            ) {
              // Ensure the flight date has the right format for phase 3 (DD.MM.YYYY)
              let flight = { ...flightData.selectedFlights[idx] };

              // Convert date to string in DD.MM.YYYY format if it's not already
              if (flight.date && typeof flight.date !== "string") {
                try {
                  const flightDate = new Date(flight.date);
                  if (isValid(flightDate)) {
                    const day = String(flightDate.getDate()).padStart(2, "0");
                    const month = String(flightDate.getMonth() + 1).padStart(
                      2,
                      "0"
                    );
                    const year = flightDate.getFullYear();
                    flight = {
                      ...flight,
                      date: `${day}.${month}.${year}`,
                    };
                  }
                } catch (e) {
                  console.error("Error formatting flight date:", e);
                }
              }

              return {
                ...segment,
                selectedFlight: flight,
              };
            }
            return segment;
          }
        );

        console.log(
          "=== FlightSegments - Flights after sync with flightStore ===",
          {
            updatedSegments: updatedSegments.map((s: any, i: number) => ({
              index: i,
              hasSelectedFlight: !!s.selectedFlight,
              flightId: s.selectedFlight?.id,
              flightNumber: s.selectedFlight?.flightNumber,
            })),
            timestamp: new Date().toISOString(),
          }
        );

        // Update the store with the flights added
        updateStores({
          flightSegments: updatedSegments,
          selectedFlights: flightData.selectedFlights,
        });
      } catch (error) {
        console.error(
          "Error syncing flights from flightStore to FlightSegments:",
          error
        );
      }
    }
  }, [currentPhase, mainStore?.flightSegments, flightStore, updateStores]);

  // CRITICAL FIX: Create a unified segment update function to ensure centralized updates
  const updateSegmentsAndStores = useCallback(
    (
      updatedSegments: FlightSegmentData[],
      options: { preserveSegments?: boolean; updateLocalStorage?: boolean } = {}
    ) => {
      const { preserveSegments = true, updateLocalStorage = true } = options;

      console.log("=== FlightSegments - Unified segment update ===", {
        segmentCount: updatedSegments.length,
        preserveSegments,
        timestamp: new Date().toISOString(),
      });

      // Update the store with the correct segments
      updateStores({ flightSegments: updatedSegments });

      // Also update localStorage if needed
      if (updateLocalStorage) {
        storageHelpers.save(currentPhase, {
          flightSegments: updatedSegments,
          selectedType: store.selectedType,
        });
      }

      // Save to flightStore with the preserve flag to prevent further modifications
      if (preserveSegments) {
        flightStore.saveFlightData(currentPhase, {
          flightSegments: updatedSegments,
          selectedType: store.selectedType,
          _preserveFlightSegments: true,
          timestamp: Date.now(),
        });
      }
    },
    [currentPhase, updateStores, store.selectedType]
  );

  // Define the flight type enforcement function
  const enforceFlightTypeRules = useCallback(
    (
      selectedType: "direct" | "multi",
      segments: FlightSegmentData[]
    ): FlightSegmentData[] => {
      // Clear all location data when enforcing flight type rules to prevent data persistence issues
      clearAllLocationData(currentPhase);

      if (!segments || !Array.isArray(segments) || segments.length === 0) {
        console.log(
          "=== FlightSegments - Creating default segment structure ===",
          {
            selectedType,
            timestamp: new Date().toISOString(),
          }
        );

        // Create basic segments with from/to locations
        if (selectedType === "direct") {
          return [
            {
              fromLocation: processLocation(store.fromLocation),
              toLocation: processLocation(store.toLocation),
              selectedFlight: null,
              date: null,
            },
          ];
        } else {
          return [
            {
              fromLocation: processLocation(store.fromLocation),
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
            {
              fromLocation: null,
              toLocation: processLocation(store.toLocation),
              selectedFlight: null,
              date: null,
            },
          ];
        }
      }

      // If we already have segments, preserve them without changes
      console.log(
        "=== FlightSegments - Preserving existing segment structure ===",
        {
          selectedType,
          segmentCount: segments.length,
          timestamp: new Date().toISOString(),
        }
      );

      return segments;
    },
    [store.fromLocation, store.toLocation, currentPhase]
  );

  // CRITICAL FIX: Single useEffect to handle flight segment structure
  useEffect(() => {
    if (!store?.flightSegments) return;

    try {
      // Check if we need to create default segments (only if no segments exist)
      if (!store.flightSegments.length) {
        console.log("=== FlightSegments - Creating default segments ===", {
          selectedType: store.selectedType,
          timestamp: new Date().toISOString(),
        });

        // Create default segments based on selected type
        const newSegments = enforceFlightTypeRules(
          store.selectedType,
          [] // Empty array to force creation of default segments
        );

        // Use the updateStores helper to update all relevant stores
        updateStores({ flightSegments: newSegments });

        console.log("=== FlightSegments - Created default segments ===", {
          count: newSegments.length,
          timestamp: new Date().toISOString(),
        });
      } else {
        console.log("=== FlightSegments - Segment sync effect starting ===", {
          segmentCount: store.flightSegments.length,
          selectedType: store.selectedType,
          timestamp: new Date().toISOString(),
        });

        console.log("=== FlightSegments - No updates needed for segments ===");
      }
    } catch (error) {
      console.error("Error handling flight segments:", error);
    }
  }, [
    store?.selectedType,
    store?.flightSegments,
    enforceFlightTypeRules,
    updateStores,
  ]);

  const handleFlightNotListed = () => {
    setIsBottomSheetOpen(false);
    setIsFlightNotListedOpen(true);
  };

  // Effect to handle form closing
  useEffect(() => {
    const handleFormClose = (e: CustomEvent) => {
      if (e.detail?.fromSearchSheet) {
        setIsBottomSheetOpen(true);
      }
    };

    window.addEventListener("form-closed", handleFormClose as EventListener);
    return () => {
      window.removeEventListener(
        "form-closed",
        handleFormClose as EventListener
      );
    };
  }, []);

  // Get validation function
  const { validate } = useFlightValidation({
    selectedType:
      currentPhase === 4 ? phase4Store?.selectedType : mainStore?.selectedType,
    segments:
      currentPhase === 4
        ? phase4Store?.flightSegments
        : mainStore?.flightSegments,
    phase: currentPhase,
    stepNumber,
    setValidationState,
  });

  const searchAirports = useCallback(
    async (term: string) => {
      try {
        if (!term || term.length < 3) {
          return [
            {
              value: "",
              label: "",
              description: t.common.enterMinChars,
              dropdownLabel: t.common.enterMinChars,
            },
          ];
        }

        const params = new URLSearchParams();
        params.append("term", term.toUpperCase());
        // Use current language from the translation hook instead of hardcoding
        params.append("lang", lang || "en");

        const response = await fetch(
          `/.netlify/functions/searchAirports?${params.toString()}`
        );

        if (!response.ok) {
          if (response.status === 400 || response.status === 422) {
            return [
              {
                value: "",
                label: "",
                description: t.common.enterMinChars,
                dropdownLabel: t.common.enterMinChars,
              },
            ];
          }
          return [];
        }

        const data = await response.json();
        const airports = Array.isArray(data) ? data : data.data || [];

        // Filter out airports without IATA codes and map to the expected format
        const mappedAirports = airports
          .filter((airport: Airport) => airport.iata_code)
          .map((airport: Airport): AirportResult => {
            return {
              value: airport.iata_code,
              label: airport.iata_code,
              description: airport.name,
              dropdownLabel: `${airport.name} (${airport.iata_code})`,
              name: airport.name,
            };
          });

        // Sort results by relevance
        const sortedAirports = mappedAirports.sort(
          (a: AirportResult, b: AirportResult) => {
            // Exact IATA code matches first
            const aExactMatch = a.value.toUpperCase() === term.toUpperCase();
            const bExactMatch = b.value.toUpperCase() === term.toUpperCase();
            if (aExactMatch && !bExactMatch) return -1;
            if (!aExactMatch && bExactMatch) return 1;

            // Then IATA codes that start with the term
            const aStartsWithIata = a.value
              .toUpperCase()
              .startsWith(term.toUpperCase());
            const bStartsWithIata = b.value
              .toUpperCase()
              .startsWith(term.toUpperCase());
            if (aStartsWithIata && !bStartsWithIata) return -1;
            if (!aStartsWithIata && bStartsWithIata) return 1;

            // Then sort by whether the name starts with the search term
            const aStartsWithName = a.name
              .toUpperCase()
              .startsWith(term.toUpperCase());
            const bStartsWithName = b.name
              .toUpperCase()
              .startsWith(term.toUpperCase());
            if (aStartsWithName && !bStartsWithName) return -1;
            if (!aStartsWithName && bStartsWithName) return 1;

            // Finally sort alphabetically by IATA code
            return a.value.localeCompare(b.value);
          }
        );

        return sortedAirports;
      } catch (error) {
        console.error("Error searching airports:", error);
        return [];
      }
    },
    [t.common.enterMinChars, lang]
  );

  // Effect to set segment dates from selected flights
  useEffect(() => {
    if (!store?.flightSegments) return;

    // First check for deleted flights that should not be restored
    const deletedFlightsKey = `phase${currentPhase}_deleted_flights`;
    let deletedFlightIds: string[] = [];
    try {
      const deletedFlightsStr = localStorage.getItem(deletedFlightsKey);
      if (deletedFlightsStr) {
        deletedFlightIds = JSON.parse(deletedFlightsStr);
        console.log(
          "=== FlightSegments - Found deleted flights during segment sync ===",
          {
            deletedFlightIds,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (e) {
      console.error("Error parsing deleted flights:", e);
    }

    console.log("=== FlightSegments - Segment sync effect starting ===", {
      segments: store.flightSegments.map((seg, i) => ({
        index: i,
        fromLocation: seg.fromLocation,
        toLocation: seg.toLocation,
        hasDate: !!seg.date,
        hasSelectedFlight: !!seg.selectedFlight,
        flightDeparture: seg.selectedFlight?.departure,
        flightArrival: seg.selectedFlight?.arrival,
        timestamp: new Date().toISOString(),
      })),
    });

    // Additional logic to set segment dates from selected flights
    // Create a deep copy to avoid modifying read-only objects
    const updatedSegments = JSON.parse(JSON.stringify(store.flightSegments));
    let hasUpdates = false;

    updatedSegments.forEach((segment: any, index: number) => {
      // Skip updates for segments with deleted flights
      if (
        segment.selectedFlight &&
        deletedFlightIds.includes(segment.selectedFlight.id)
      ) {
        console.log(
          "=== FlightSegments - Skipping data sync for deleted flight ===",
          {
            segmentIndex: index,
            flightId: segment.selectedFlight.id,
            timestamp: new Date().toISOString(),
          }
        );

        // If this segment contains a deleted flight, consider removing it now
        if (segment.selectedFlight) {
          // Create a deep copy of the segment before modifying
          const updatedSegmentCopy = JSON.parse(
            JSON.stringify(updatedSegments[index])
          );

          // Remove the selected flight from the copy
          updatedSegmentCopy.selectedFlight = null;

          // Update the segment in the updatedSegments array with the copy
          updatedSegments[index] = updatedSegmentCopy;

          hasUpdates = true;
          console.log(
            "=== FlightSegments - Removed deleted flight during sync ===",
            {
              segmentIndex: index,
              flightId: segment.selectedFlight.id,
              timestamp: new Date().toISOString(),
            }
          );
        }
        return;
      }

      // Track if this segment needs updating
      let needsUpdate = false;

      // Create a deep copy of the segment
      const updatedSegment = JSON.parse(JSON.stringify(segment));

      // If segment has a selected flight with a date but no date itself, use that date
      if (!segment.date && segment.selectedFlight?.date) {
        console.log(
          "=== FlightSegments - Setting segment date from selected flight ===",
          {
            segmentIndex: index,
            flightDate: segment.selectedFlight.date,
            timestamp: new Date().toISOString(),
          }
        );

        let parsedDate = null;

        // Parse the flight date
        if (typeof segment.selectedFlight.date === "string") {
          if (segment.selectedFlight.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            // DD.MM.YYYY format
            const [day, month, year] = segment.selectedFlight.date
              .split(".")
              .map(Number);
            parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
          } else {
            // Try other formats
            parsedDate = safeParseDateString(segment.selectedFlight.date);
          }
        } else if (
          segment.selectedFlight.date &&
          typeof segment.selectedFlight.date === "object" &&
          isValid(segment.selectedFlight.date as Date)
        ) {
          parsedDate = segment.selectedFlight.date as Date;
        }

        if (parsedDate && isValid(parsedDate)) {
          updatedSegment.date = parsedDate;
          needsUpdate = true;

          // Also update parsed dates array
          const newParsedDates = [...parsedDates];
          newParsedDates[index] = parsedDate;
          setParsedDates(newParsedDates);
        }
      }

      // If segment has a selected flight but no fromLocation, use flight's departure info
      if (
        segment.selectedFlight &&
        (!segment.fromLocation || !segment.fromLocation.value)
      ) {
        console.log(
          "=== FlightSegments - Setting segment fromLocation from selected flight ===",
          {
            segmentIndex: index,
            flightDeparture: segment.selectedFlight.departure,
            flightDepartureCity: segment.selectedFlight.departureCity,
            flightDepartureAirport: segment.selectedFlight.departureAirport,
            existingFromLocation: segment.fromLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // Create a location object with the correct type
        const locationData = {
          value: segment.selectedFlight.departure,
          label: segment.selectedFlight.departure,
          description: segment.selectedFlight.departureAirport || "",
          city:
            segment.selectedFlight.departureCity ||
            segment.selectedFlight.departure,
          dropdownLabel: segment.selectedFlight.departureCity
            ? `${segment.selectedFlight.departureCity} (${segment.selectedFlight.departure})`
            : segment.selectedFlight.departure,
        };
        updatedSegment.fromLocation = locationData;
        needsUpdate = true;
      }

      // If segment has a selected flight but no toLocation, use flight's arrival info
      if (
        segment.selectedFlight &&
        (!segment.toLocation || !segment.toLocation.value)
      ) {
        console.log(
          "=== FlightSegments - Setting segment toLocation from selected flight ===",
          {
            segmentIndex: index,
            flightArrival: segment.selectedFlight.arrival,
            flightArrivalCity: segment.selectedFlight.arrivalCity,
            flightArrivalAirport: segment.selectedFlight.arrivalAirport,
            existingToLocation: segment.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // Create a location object with the correct type
        const locationData = {
          value: segment.selectedFlight.arrival,
          label: segment.selectedFlight.arrival,
          description: segment.selectedFlight.arrivalAirport || "",
          city:
            segment.selectedFlight.arrivalCity ||
            segment.selectedFlight.arrival,
          dropdownLabel: segment.selectedFlight.arrivalCity
            ? `${segment.selectedFlight.arrivalCity} (${segment.selectedFlight.arrival})`
            : segment.selectedFlight.arrival,
        };
        updatedSegment.toLocation = locationData;
        needsUpdate = true;
      }

      if (needsUpdate) {
        // Create a new deep copy of the segment at this index
        updatedSegments[index] = JSON.parse(JSON.stringify(updatedSegment));
        hasUpdates = true;
      }
    });

    // Update store if any changes were made
    if (hasUpdates) {
      console.log(
        "=== FlightSegments - Updating segments with data from selected flights ===",
        {
          updatedSegments,
          timestamp: new Date().toISOString(),
        }
      );
      updateStores({ flightSegments: updatedSegments });

      // Log the updated segments to confirm changes were applied
      console.log(
        "=== FlightSegments - After updating store, new segments state ===",
        {
          segments: updatedSegments.map((seg: any, i: number) => ({
            index: i,
            fromLocation: seg.fromLocation,
            toLocation: seg.toLocation,
            hasDate: !!seg.date,
            timestamp: new Date().toISOString(),
          })),
        }
      );
    } else {
      // Also log when no updates were needed
      console.log("=== FlightSegments - No updates needed for segments ===", {
        segments: store.flightSegments.map((seg: any, i: number) => ({
          index: i,
          fromLocation: seg.fromLocation?.value,
          toLocation: seg.toLocation?.value,
          hasDate: !!seg.date,
          hasSelectedFlight: !!seg.selectedFlight,
          timestamp: new Date().toISOString(),
        })),
      });
    }
  }, [currentPhase, store?.flightSegments, parsedDates, updateStores]);

  const handleLocationChange = useCallback(
    (
      location: LocationData | null,
      field: "fromLocation" | "toLocation",
      index: number
    ) => {
      if (!store?.flightSegments) return;
      const newSegments = [...store.flightSegments];

      console.log(`=== FlightSegments - Location change started ===`, {
        location,
        field,
        index,
        isClearing: !location,
        timestamp: new Date().toISOString(),
      });

      // For multi-city mode, validate that departure city matches previous arrival city
      if (
        store.selectedType === "multi" &&
        field === "fromLocation" &&
        index > 0 &&
        location
      ) {
        const previousSegment = newSegments[index - 1];
        if (previousSegment.selectedFlight) {
          const prevArrivalCity = previousSegment.selectedFlight.arrivalCity;
          const newDepartureCity =
            location.city ||
            (location.value && /^[A-Z]{3}$/.test(location.value)
              ? getAirportCitySync(location.value)
              : location.description || location.label);

          if (
            prevArrivalCity.toLowerCase() !== newDepartureCity.toLowerCase()
          ) {
            // Don't update if cities don't match - log this event for debugging
            console.log(
              `=== FlightSegments - City mismatch prevented location update ===`,
              {
                prevArrivalCity,
                newDepartureCity,
                index,
                field,
                timestamp: new Date().toISOString(),
              }
            );
            return;
          }
        }
      }

      // Preserve the existing date when updating location
      const existingDate = newSegments[index].date;

      // If clearing a location, set the locationWasCleared flag
      if (!location) {
        try {
          // ** ENHANCED CLEARING LOGIC **
          console.log(
            `=== FlightSegments - Performing complete location clear ===`,
            {
              phase: currentPhase,
              segment: index,
              field,
              timestamp: new Date().toISOString(),
            }
          );

          // 1. Set the clear flag
          const locationClearFlagKey = `locationWasCleared_phase${currentPhase}_segment${index}_${field}`;
          localStorage.setItem(locationClearFlagKey, "true");

          // 2. Clear all phase state data for this location
          const clearAllPhases = [1, 2, 3, 4];

          clearAllPhases.forEach((phase) => {
            // Clear in all phase data
            try {
              const phaseStateKey = `phase${phase}State`;
              const existingPhaseState = localStorage.getItem(phaseStateKey);

              if (existingPhaseState) {
                const phaseStateData = JSON.parse(existingPhaseState);

                // Clear at root level if it's the main location
                if (
                  (index === 0 && field === "fromLocation") ||
                  (field === "toLocation" && index === newSegments.length - 1)
                ) {
                  phaseStateData[field] = null;
                }

                // Clear in all segments
                if (
                  phaseStateData.flightSegments &&
                  Array.isArray(phaseStateData.flightSegments) &&
                  index < phaseStateData.flightSegments.length
                ) {
                  phaseStateData.flightSegments[index][field] = null;
                }

                localStorage.setItem(
                  phaseStateKey,
                  JSON.stringify(phaseStateData)
                );

                console.log(
                  `=== FlightSegments - Cleared location in phase${phase} state ===`,
                  {
                    field,
                    index,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } catch (error) {
              console.error(
                `Error clearing location in phase${phase} state:`,
                error
              );
            }

            // Clear in flight data
            try {
              const flightDataKey = `flightData_phase${phase}`;
              const existingFlightData = localStorage.getItem(flightDataKey);

              if (existingFlightData) {
                const flightData = JSON.parse(existingFlightData);

                // Clear at root level
                if (
                  (index === 0 && field === "fromLocation") ||
                  (field === "toLocation" && index === newSegments.length - 1)
                ) {
                  flightData[field] = null;
                }

                // Clear in segments
                if (
                  flightData.flightSegments &&
                  Array.isArray(flightData.flightSegments) &&
                  index < flightData.flightSegments.length
                ) {
                  flightData.flightSegments[index][field] = null;
                }

                localStorage.setItem(flightDataKey, JSON.stringify(flightData));

                console.log(
                  `=== FlightSegments - Cleared location in flight data for phase${phase} ===`,
                  {
                    field,
                    index,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } catch (error) {
              console.error(
                `Error clearing location in flight data for phase${phase}:`,
                error
              );
            }
          });

          // 3. Clear all segment cache keys
          const allKeys = Object.keys(localStorage);
          const segmentKeys = allKeys.filter(
            (key) =>
              key.includes(`flightSegment_`) && key.includes(`segment${index}`)
          );

          segmentKeys.forEach((key) => {
            try {
              const segmentData = JSON.parse(localStorage.getItem(key) || "{}");
              if (segmentData) {
                segmentData[field] = null;
                localStorage.setItem(key, JSON.stringify(segmentData));
                console.log(
                  `=== FlightSegments - Cleared location in segment cache ===`,
                  {
                    key,
                    field,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            } catch (error) {
              console.error(`Error updating segment cache ${key}:`, error);
            }
          });

          // 4. Clear from sessionStorage
          if (typeof sessionStorage !== "undefined") {
            const sessionKeys = Object.keys(sessionStorage);
            const locationKeys = sessionKeys.filter(
              (key) =>
                key.includes(`location_`) &&
                (key.includes(`segment${index}`) || key.includes(field))
            );

            locationKeys.forEach((key) => {
              sessionStorage.removeItem(key);
              console.log(
                `=== FlightSegments - Removed cached location from sessionStorage ===`,
                {
                  key,
                  timestamp: new Date().toISOString(),
                }
              );
            });
          }

          console.log(`=== FlightSegments - Set location clear flag ===`, {
            segmentIndex: index,
            field,
            locationClearFlagKey,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error(
            `Error setting location clear flag for ${field}:`,
            error
          );
        }
      } else {
        // If setting a location, remove any existing clear flag
        try {
          const locationClearFlagKey = `locationWasCleared_phase${currentPhase}_segment${index}_${field}`;
          if (localStorage.getItem(locationClearFlagKey)) {
            localStorage.removeItem(locationClearFlagKey);

            console.log(
              `=== FlightSegments - Cleared location clear flag ===`,
              {
                segmentIndex: index,
                field,
                locationClearFlagKey,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } catch (error) {
          console.error(
            `Error clearing location clear flag for ${field}:`,
            error
          );
        }
      }

      // Setting a new location or clearing it
      newSegments[index] = {
        ...newSegments[index],
        [field]: location,
        ...(currentPhase !== 4 && { selectedFlight: null }), // Only clear selected flight in non-phase-4
        date: existingDate, // Preserve the existing date
      };

      // If this is a direct flight, update both locations for consistency
      if (store.selectedType === "direct" && newSegments.length === 1) {
        if (field === "fromLocation") {
          // Update the store's global fromLocation
          updateStores({
            flightSegments: newSegments,
          });
          // Also update the main store's fromLocation directly when needed
          if (currentPhase !== 4 && mainStore.setFromLocation) {
            mainStore.setFromLocation(location);
          }
        } else if (field === "toLocation") {
          // Update the store's global toLocation
          updateStores({
            flightSegments: newSegments,
          });
          // Also update the main store's toLocation directly when needed
          if (currentPhase !== 4 && mainStore.setToLocation) {
            mainStore.setToLocation(location);
          }
        }
      } else {
        // For multi flights, update the store with segment changes
        updateStores({
          flightSegments: newSegments,
        });

        // Additional special handling for multi-city location propagation
        if (store.selectedType === "multi") {
          // If changing the destination of one segment, update the departure of the next segment
          if (field === "toLocation" && index < newSegments.length - 1) {
            // Update the next segment's fromLocation to match this segment's toLocation
            const nextSegmentIndex = index + 1;

            // First check if we need to update (don't override existing different value)
            const shouldUpdate =
              !newSegments[nextSegmentIndex].fromLocation ||
              newSegments[nextSegmentIndex].fromLocation?.value ===
                newSegments[index].toLocation?.value;

            if (location && shouldUpdate) {
              // Copy this segment's destination to the next segment's origin
              newSegments[nextSegmentIndex] = {
                ...newSegments[nextSegmentIndex],
                fromLocation: location,
              };

              // Update stores with this change as well
              updateStores({
                flightSegments: newSegments,
              });

              console.log(
                `=== FlightSegments - Propagated location to next segment ===`,
                {
                  sourceSegment: index,
                  targetSegment: nextSegmentIndex,
                  location: location.value || location.label,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        }
      }

      // Always trigger the validation after making changes
      requestAnimationFrame(() => {
        if (validate) {
          validate();
        }
      });

      // Tell parent that interaction happened
      onInteract();
    },
    [
      currentPhase,
      onInteract,
      store?.flightSegments,
      store?.selectedType,
      updateStores,
      validate,
      mainStore,
    ]
  );

  const handleDateChange = (date: Date | null, segmentIndex: number) => {
    console.log("=== handleDateChange - Entry ===", {
      date,
      segmentIndex,
      phase: currentPhase,
      timestamp: new Date().toISOString(),
    });

    // User interaction logic
    onInteract();

    // Exit if no segments or out of bounds index
    if (!store?.flightSegments || segmentIndex >= store.flightSegments.length) {
      console.error("Invalid segment index:", segmentIndex);
      return;
    }

    // Get current segments
    let segments;
    if (currentPhase === 4 && phase4Store) {
      segments = [...phase4Store.flightSegments];
    } else {
      segments = [...store.flightSegments];
    }

    // Update segment date
    segments[segmentIndex] = {
      ...segments[segmentIndex],
      date,
    };

    // Store ISO date string for localStorage serialization consistency
    const isoDate = date ? date.toISOString() : null;

    console.log("=== handleDateChange - Updated Segment ===", {
      updatedSegment: {
        fromLocation: segments[segmentIndex].fromLocation?.value,
        toLocation: segments[segmentIndex].toLocation?.value,
        date: isoDate,
      },
      segmentDateType: date ? typeof date : "null",
      phase: currentPhase,
      timestamp: new Date().toISOString(),
    });

    // Special handling for Phase 4
    if (currentPhase === 4 && phase4Store) {
      // Update phase4Store
      phase4Store.batchUpdate({
        flightSegments: segments,
        selectedDate: date, // Use the date object directly
        _lastUpdate: Date.now(),
      });

      // Only update flightStore with Phase 4 marker (for isolation)
      const travelStatus = phase4Store.travelStatusAnswers?.find?.(
        (a: any) => a.questionId === "travel_status"
      )?.value;
      if (
        travelStatus === "provided" ||
        travelStatus === "took_alternative_own"
      ) {
        // Create a record in flightStore isolated to phase 4 only
        flightStore.saveFlightData(4, {
          flightSegments: segments,
          selectedDate: date ? format(date, "yyyy-MM-dd") : null,
          timestamp: Date.now(),
        });

        console.log("=== handleDateChange - Updated Phase 4 Date ===", {
          date: date ? format(date, "yyyy-MM-dd") : null,
          travelStatus,
          isIsolated: true,
          timestamp: new Date().toISOString(),
        });
      }
    } else {
      // Normal handling for phases 1-3
      store.setFlightSegments(segments);

      // Update flightStore with phase marker and ensure we save the date object directly
      flightStore.saveFlightData(currentPhase, {
        flightSegments: segments,
        selectedDate: isoDate,
        timestamp: Date.now(),
      });
    }

    // Handle explicit date clearing vs. setting
    if (date === null) {
      // When date is explicitly cleared
      clearDateFlags(currentPhase, segmentIndex);

      // Actively remove date from all cache locations
      const dateKeysToRemove = [
        `dateCache_phase${currentPhase}_segment${segmentIndex}`,
        `exactDate_phase${currentPhase}_segment${segmentIndex}`,
      ];

      dateKeysToRemove.forEach((key) => {
        localStorage.removeItem(key);
        console.log(`=== handleDateChange - Removed date cache ===`, {
          key,
          segmentIndex,
          phase: currentPhase,
          timestamp: new Date().toISOString(),
        });
      });

      // Set the cleared flag
      const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${segmentIndex}`;
      localStorage.setItem(dateClearFlagKey, "true");
      console.log(`=== handleDateChange - Set date clear flag ===`, {
        key: dateClearFlagKey,
        segmentIndex,
        timestamp: new Date().toISOString(),
      });
    } else {
      // When date is explicitly set
      // Remove any clear flags since we now have a date
      const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${segmentIndex}`;
      if (localStorage.getItem(dateClearFlagKey)) {
        localStorage.removeItem(dateClearFlagKey);
        console.log(`=== handleDateChange - Removed clear date flag ===`, {
          key: dateClearFlagKey,
          timestamp: new Date().toISOString(),
        });
      }

      // Ensure we store the date in localStorage directly
      const segmentDateKey = `dateCache_phase${currentPhase}_segment${segmentIndex}`;
      const segmentDateExactKey = `exactDate_phase${currentPhase}_segment${segmentIndex}`;

      // Store in a consistent ISO format for better persistence
      localStorage.setItem(segmentDateKey, date.toISOString());
      localStorage.setItem(segmentDateExactKey, date.toISOString());

      console.log("=== handleDateChange - Saved date to localStorage ===", {
        segmentIndex,
        date: date.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    // Update date picker state
    if (date) {
      const newParsedDates = [...parsedDates];
      newParsedDates[segmentIndex] = date;
      setParsedDates(newParsedDates);
    } else if (parsedDates[segmentIndex]) {
      // Clear from parsed dates if previously had a value
      const newParsedDates = [...parsedDates];
      newParsedDates[segmentIndex] = null;
      setParsedDates(newParsedDates);
    }

    // Validate after change
    validate();

    return date;
  };

  const addFlightSegment = useCallback(() => {
    if (!store?.flightSegments || store.flightSegments.length >= 4) return;

    const newSegments = [...store.flightSegments];
    const lastSegment = newSegments[newSegments.length - 1];

    newSegments.push({
      fromLocation: lastSegment?.toLocation || null,
      toLocation: null,
      selectedFlight: null,
      date: null,
    });

    if (currentPhase === 4) {
      phase4Store.batchUpdate({
        flightSegments: newSegments,
        selectedFlight: null,
        selectedFlights: [],
        fromLocation: newSegments[0]?.fromLocation
          ? JSON.stringify(newSegments[0].fromLocation)
          : null,
        toLocation: newSegments[newSegments.length - 1]?.toLocation
          ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
          : null,
      });
    } else {
      updateStores({ flightSegments: newSegments });
    }
    onInteract();
  }, [store, phase4Store, currentPhase, onInteract, updateStores]);

  const handleSegmentDelete = useCallback(
    (index: number) => {
      if (!store?.flightSegments || index <= 1) return;

      const newSegments = store.flightSegments.filter((_, i) => i !== index);

      if (currentPhase === 4) {
        phase4Store.batchUpdate({
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: newSegments[0]?.fromLocation
            ? JSON.stringify(newSegments[0].fromLocation)
            : null,
          toLocation: newSegments[newSegments.length - 1]?.toLocation
            ? JSON.stringify(newSegments[newSegments.length - 1].toLocation)
            : null,
        });
      } else {
        updateStores({ flightSegments: newSegments });
      }
      onInteract();
    },
    [store, phase4Store, currentPhase, onInteract, updateStores]
  );

  const handleFlightSelect = useCallback(
    (flight: Flight, segmentIndex: number) => {
      if (!flight) return;

      console.log("=== handleFlightSelect - Input ===", {
        flight: {
          id: flight.id,
          flightNumber: flight.flightNumber,
          date: flight.date,
          dateType: typeof flight.date,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
        },
        segmentIndex,
        timestamp: new Date().toISOString(),
      });

      // IMPORTANT: Remove this flight ID from the deleted flights list if it exists
      // This ensures that newly selected flights aren't immediately filtered out
      if (flight.id) {
        try {
          const deletedFlightsKey = `phase${currentPhase}_deleted_flights`;
          const existingDeletedRaw = localStorage.getItem(deletedFlightsKey);

          if (existingDeletedRaw) {
            const deletedFlightIds = JSON.parse(existingDeletedRaw);

            if (deletedFlightIds.includes(flight.id)) {
              // Remove this flight ID from the deleted list
              const updatedDeletedFlights = deletedFlightIds.filter(
                (id: string) => id !== flight.id
              );

              // Save the updated list
              localStorage.setItem(
                deletedFlightsKey,
                JSON.stringify(updatedDeletedFlights)
              );

              console.log(
                `=== handleFlightSelect - Removed flight ${flight.id} from deleted flights list ===`,
                {
                  phase: currentPhase,
                  remainingDeletedFlights: updatedDeletedFlights.length,
                  timestamp: new Date().toISOString(),
                }
              );
            }
          }
        } catch (e) {
          console.error("Error updating deleted flights list:", e);
        }
      }

      // Clear any dateWasCleared flags for this segment
      // This ensures that dates can be restored for newly selected flights
      try {
        const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${segmentIndex}`;
        if (localStorage.getItem(dateClearFlagKey)) {
          localStorage.removeItem(dateClearFlagKey);
          console.log(`=== handleFlightSelect - Cleared date clear flag ===`, {
            segmentIndex,
            dateClearFlagKey,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error(
          "Error clearing date cleared flag during flight selection:",
          error
        );
      }

      // Clear any locationWasCleared flags for this segment
      // This ensures that locations can be properly set for newly selected flights
      try {
        const fields = ["fromLocation", "toLocation"];
        fields.forEach((field) => {
          const locationClearFlagKey = `locationWasCleared_phase${currentPhase}_segment${segmentIndex}_${field}`;
          if (localStorage.getItem(locationClearFlagKey)) {
            localStorage.removeItem(locationClearFlagKey);
            console.log(
              `=== handleFlightSelect - Cleared location clear flag ===`,
              {
                segmentIndex,
                field,
                locationClearFlagKey,
                timestamp: new Date().toISOString(),
              }
            );
          }
        });
      } catch (error) {
        console.error(
          "Error clearing location cleared flags during flight selection:",
          error
        );
      }

      // Get current store state
      const currentState = currentPhase === 4 ? phase4Store : mainStore;
      const selectedType = currentState.selectedType;

      // Format flight data
      const formattedFlight = {
        ...flight,
        id: flight.id,
        date: flight.date || "",
      };

      // Try to use the flight's date if available
      if (flight.date) {
        try {
          let parsedDate: Date | null = null;

          // Handle string dates in various formats
          if (typeof flight.date === "string") {
            // Try ISO format
            if (flight.date.includes("T") || flight.date.includes("-")) {
              parsedDate = parseISO(flight.date);
            }
            // Try dd.MM.yyyy format
            else if (flight.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
              const [day, month, year] = flight.date.split(".").map(Number);
              parsedDate = new Date(
                Date.UTC(year, month - 1, day, 12, 0, 0, 0)
              );
            }

            if (parsedDate && isValid(parsedDate)) {
              // Update parsed dates state
              const newParsedDates = [...parsedDates];
              newParsedDates[segmentIndex] = parsedDate;
              setParsedDates(newParsedDates);

              console.log(`=== handleFlightSelect - Using flight date ===`, {
                segmentIndex,
                parsedDate: format(parsedDate, "yyyy-MM-dd"),
                originalDate: flight.date,
                timestamp: new Date().toISOString(),
              });
            }
          }
        } catch (error) {
          console.error(`Error parsing flight date:`, error);
        }
      }

      // Update segments
      const updatedSegments = [...currentState.flightSegments];

      // Log current segment before update
      console.log("=== handleFlightSelect - Before Update ===", {
        originalSegment: {
          fromLocation: updatedSegments[segmentIndex].fromLocation?.value,
          toLocation: updatedSegments[segmentIndex].toLocation?.value,
          dateType: updatedSegments[segmentIndex].date
            ? typeof updatedSegments[segmentIndex].date
            : "null",
          dateValue: updatedSegments[segmentIndex].date,
          hasSelectedFlight: !!updatedSegments[segmentIndex].selectedFlight,
        },
        timestamp: new Date().toISOString(),
      });

      // Keep the existing date if there is one
      const existingDate = updatedSegments[segmentIndex].date;

      // Import processLocation function from flightSlice
      const { processLocation } = require("@/lib/state/slices/flightSlice");

      // Create updated segment with preserved locations
      const updatedSegment = {
        ...updatedSegments[segmentIndex],
        selectedFlight: formattedFlight,
        // Preserve the existing date if there is one, otherwise use the flight date if available
        date: existingDate || (flight.date ? new Date(flight.date) : null),
      };

      // Only update locations if needed - check if they match the flight's departure/arrival cities
      const flightDeparture = {
        value: flight.departureCity,
        label: flight.departureCity,
        description: flight.departureAirport,
        city: flight.departureCity,
      };

      const flightArrival = {
        value: flight.arrivalCity,
        label: flight.arrivalCity,
        description: flight.arrivalAirport,
        city: flight.arrivalCity,
      };

      // If there's no existing fromLocation or it has a different value, only then update it
      if (
        !updatedSegment.fromLocation ||
        updatedSegment.fromLocation.value !== flight.departureCity
      ) {
        updatedSegment.fromLocation = processLocation(flightDeparture);
      }

      // If there's no existing toLocation or it has a different value, only then update it
      if (
        !updatedSegment.toLocation ||
        updatedSegment.toLocation.value !== flight.arrivalCity
      ) {
        updatedSegment.toLocation = processLocation(flightArrival);
      }

      updatedSegments[segmentIndex] = updatedSegment;

      // Log updated segment
      console.log("=== handleFlightSelect - After Update ===", {
        updatedSegment: {
          fromLocation: updatedSegments[segmentIndex].fromLocation?.value,
          toLocation: updatedSegments[segmentIndex].toLocation?.value,
          dateType: updatedSegments[segmentIndex].date
            ? typeof updatedSegments[segmentIndex].date
            : "null",
          dateValue: updatedSegments[segmentIndex].date,
          hasSelectedFlight: !!updatedSegments[segmentIndex].selectedFlight,
          flightDate: updatedSegments[segmentIndex].selectedFlight?.date,
        },
        timestamp: new Date().toISOString(),
      });

      // For multi-city, update next segment's fromLocation
      if (
        selectedType === "multi" &&
        segmentIndex < updatedSegments.length - 1
      ) {
        const nextSegment = updatedSegments[segmentIndex + 1];
        // Only update if needed
        if (
          !nextSegment.fromLocation ||
          nextSegment.fromLocation.value !== flight.arrivalCity
        ) {
          // Create updated next segment with preserved properties
          updatedSegments[segmentIndex + 1] = {
            ...nextSegment,
            fromLocation: processLocation({
              value: flight.arrivalCity,
              label: flight.arrivalCity,
              description: flight.arrivalAirport,
              city: flight.arrivalCity,
            }),
          };
        }
      }

      // Get all selected flights
      const selectedFlights = updatedSegments
        .map((segment) => segment.selectedFlight)
        .filter((f): f is Flight => f !== null);

      // Update stores in a synchronized way
      if (currentPhase === 4) {
        // Update phase4Store
        phase4Store.batchUpdate({
          selectedFlight: formattedFlight,
          selectedFlights,
          flightSegments: updatedSegments,
          _lastUpdate: Date.now(),
        });

        // Update flightStore for phase 4 specific scenarios
        const travelStatus = phase4Store.travelStatusAnswers.find(
          (a) => a.questionId === "travel_status"
        )?.value;

        if (
          travelStatus === "provided" ||
          travelStatus === "took_alternative_own"
        ) {
          // Only update phase 4 data, don't affect other phases
          flightStore.setSelectedFlights(4, selectedFlights);

          console.log("=== handleFlightSelect - Phase 4 Flight Selected ===", {
            phase: 4,
            flightNumber: formattedFlight.flightNumber,
            isIsolated: true, // Indicate this is isolated from other phases
            timestamp: new Date().toISOString(),
          });
        }

        // Explicitly remove this flight data from phases 1-3 if it exists there
        // to prevent contamination
        if (typeof window !== "undefined") {
          try {
            // Check if this flight exists in other phases' data
            [1, 2, 3].forEach((phase) => {
              const phaseKey = `flightData_phase${phase}`;
              const existingData = localStorage.getItem(phaseKey);
              if (existingData) {
                console.log(
                  `=== handleFlightSelect - Ensuring phase ${phase} is not affected by phase 4 selection ===`
                );
              }
            });
          } catch (e) {
            console.error("Error checking other phases' data:", e);
          }
        }
      } else {
        // Update mainStore
        mainStore.batchUpdateWizardState({
          selectedFlight: formattedFlight,
          selectedFlights,
          flightSegments: updatedSegments,
          _lastUpdate: Date.now(),
        });

        // Update flightStore with explicit phase marker
        flightStore.setSelectedFlights(currentPhase, selectedFlights);

        console.log(
          `=== handleFlightSelect - Phase ${currentPhase} Flight Selected ===`,
          {
            phase: currentPhase,
            flightNumber: formattedFlight.flightNumber,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Update localStorage
      if (typeof window !== "undefined") {
        const phaseKey = `phase${currentPhase}FlightData`;
        const existingData = localStorage.getItem(phaseKey);
        const phaseData = existingData ? JSON.parse(existingData) : {};

        localStorage.setItem(
          phaseKey,
          JSON.stringify({
            ...phaseData,
            selectedFlight: formattedFlight,
            selectedFlights,
            flightSegments: updatedSegments,
            timestamp: Date.now(),
          })
        );
      }

      // Close the bottom sheet and clear search results
      setIsBottomSheetOpen(false);
      setSearchResults([]);

      // Validate and notify
      validate();
      onInteract();
    },
    [currentPhase, phase4Store, mainStore, flightStore, validate, onInteract]
  );

  const handleFlightDelete = useCallback(
    (index: number) => {
      if (!store?.flightSegments) return;

      // Get the flight ID being deleted
      const flightId = store.flightSegments[index]?.selectedFlight?.id;

      // Track deleted flight IDs in localStorage to prevent restoration
      if (flightId) {
        const deletedFlightsKey = `phase${currentPhase}_deleted_flights`;
        try {
          // Get existing deleted flights
          const existingDeletedRaw = localStorage.getItem(deletedFlightsKey);
          const deletedFlightIds = existingDeletedRaw
            ? JSON.parse(existingDeletedRaw)
            : [];

          // Add this flight ID if not already in the list
          if (!deletedFlightIds.includes(flightId)) {
            deletedFlightIds.push(flightId);
            localStorage.setItem(
              deletedFlightsKey,
              JSON.stringify(deletedFlightIds)
            );

            console.log(
              `=== FlightSegments - Added flight ${flightId} to deleted flights ===`,
              {
                phase: currentPhase,
                deletedFlightIds,
                timestamp: new Date().toISOString(),
              }
            );
          }
        } catch (e) {
          console.error("Error updating deleted flights list:", e);
        }
      }

      // Perform a more thorough cleaning of localStorage
      const keysToCheck = [
        `flightData_phase${currentPhase}`,
        `phase${currentPhase}State`,
        `phase${currentPhase}FlightData`,
        `dateCache_phase${currentPhase}`,
        `locationCache_phase${currentPhase}`,
        `currentUIState`,
      ];

      // Process each key individually for more control
      keysToCheck.forEach((key) => {
        try {
          const dataRaw = localStorage.getItem(key);
          if (!dataRaw) return;

          const data = JSON.parse(dataRaw);
          let modified = false;

          // If we have flight segments, clear the selected flight at the specified index
          if (
            data.flightSegments &&
            Array.isArray(data.flightSegments) &&
            index < data.flightSegments.length &&
            data.flightSegments[index]?.selectedFlight
          ) {
            // Create deep copy of flight segments to avoid modifying read-only properties
            const updatedSegments = JSON.parse(
              JSON.stringify(data.flightSegments)
            );
            updatedSegments[index].selectedFlight = null;
            data.flightSegments = updatedSegments;
            modified = true;
          }

          // Also filter this flight from selectedFlights array if present
          if (
            data.selectedFlights &&
            Array.isArray(data.selectedFlights) &&
            flightId
          ) {
            const originalLength = data.selectedFlights.length;
            data.selectedFlights = data.selectedFlights.filter(
              (flight: any) => flight?.id !== flightId
            );

            if (data.selectedFlights.length !== originalLength) {
              modified = true;
            }
          }

          // If this is the selected flight, clear it
          if (data.selectedFlight && data.selectedFlight.id === flightId) {
            data.selectedFlight = null;
            modified = true;
          }

          // If we made changes, save the updated data
          if (modified) {
            localStorage.setItem(
              key,
              JSON.stringify({
                ...data,
                _timestamp: Date.now(),
              })
            );

            console.log(`=== FlightSegments - Removed flight from ${key} ===`, {
              phase: currentPhase,
              flightId,
              key,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error(`Error cleaning up flight in ${key}:`, e);
        }
      });

      // Clear this flight from localStorage using our helper
      storageHelpers.clear(currentPhase, index);

      // Create a new array with the flight cleared but segment retained
      const updatedSegments = store.flightSegments.map((segment, i) =>
        i === index ? { ...segment, selectedFlight: null } : segment
      );

      // Get remaining selected flights, filtering out nulls
      const remainingFlights = updatedSegments
        .map((segment) => segment.selectedFlight)
        .filter((flight): flight is Flight => flight !== null);

      // Update stores with both segment and flight updates
      updateStores({
        flightSegments: updatedSegments,
        selectedFlight: null,
        selectedFlights: remainingFlights,
      });

      // Clear the flightStore as well
      flightStore.setSelectedFlights(currentPhase, remainingFlights);

      // Also update the flight data in flightStore to ensure it's completely removed
      const currentFlightData = flightStore.getFlightData(currentPhase);
      if (currentFlightData) {
        const updatedFlightData = {
          ...currentFlightData,
          flightSegments: updatedSegments,
          selectedFlight: null,
          selectedFlights: remainingFlights,
          _timestamp: Date.now(),
        };
        flightStore.saveFlightData(currentPhase, updatedFlightData);

        // Sync to other phases if needed
        if (currentPhase <= 3) {
          [1, 2, 3]
            .filter((p) => p !== currentPhase)
            .forEach((phase) => {
              flightStore.saveFlightData(phase, updatedFlightData);
            });
        }
      }

      // Update parsed dates to reflect deletion
      const newParsedDates = [...parsedDates];
      if (index < newParsedDates.length) {
        // Only clear the dates if we're deleting the flight but keeping the segment
        // Don't clear dates for multi-city with linked segments
        if (store.selectedType !== "multi") {
          newParsedDates[index] = null;
          setParsedDates(newParsedDates);
        }
      }

      // Save changes to localStorage
      storageHelpers.save(currentPhase, {
        flightSegments: updatedSegments,
        selectedFlights: remainingFlights,
        selectedFlight: null,
      });

      // Notify parent of interaction
      onInteract();
    },
    [store, updateStores, onInteract, currentPhase, flightStore, parsedDates]
  );

  const handleSearchFlights = useCallback(
    async (index: number) => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const segment = store.flightSegments[index];
        if (!segment.fromLocation || !segment.toLocation || !segment.date) {
          setSearchError("Please select origin, destination, and date");
          setSearchLoading(false);
          return;
        }

        // For multi-city segments after first, validate connection city
        if (index > 0) {
          const previousSegment = store.flightSegments[index - 1];
          if (previousSegment?.selectedFlight) {
            const prevArrivalCity =
              previousSegment.selectedFlight.arrivalCity || "";
            const currentDepartureCity = segment.fromLocation.value || "";
            console.log("City comparison:", {
              prevArrivalCity,
              currentDepartureCity,
              fromLocation: segment.fromLocation,
              prevFlight: previousSegment.selectedFlight,
              hasValidCities: Boolean(prevArrivalCity && currentDepartureCity),
            });

            // Only compare if we have both cities
            if (!prevArrivalCity || !currentDepartureCity) {
              const error = t.flightSelector.errors.noValidConnecting;
              console.log("Missing city information:", error);
              setSearchError(error);
              setSearchLoading(false);
              return;
            }

            // Compare IATA codes case-insensitive
            if (
              prevArrivalCity.toLowerCase() !==
              currentDepartureCity.toLowerCase()
            ) {
              const error = t.flightSelector.errors.departureMismatch
                .replace("{city1}", currentDepartureCity)
                .replace("{city2}", prevArrivalCity);
              console.log("City mismatch error:", error);
              setSearchError(error);
              setSearchLoading(false);
              return;
            }
          }
        }

        // Ensure we have a valid date
        let searchDate: Date | null = null;
        let formattedDate: string;
        try {
          // First check parsedDates as most reliable source
          if (parsedDates[index] && isValid(parsedDates[index])) {
            console.log("=== Search Flights - Using parsedDates ===", {
              date: format(parsedDates[index], "yyyy-MM-dd"),
              index,
              timestamp: new Date().toISOString(),
            });
            searchDate = parsedDates[index];
          }
          // Next try selectedFlight.date as reliable source
          else if (segment.selectedFlight?.date) {
            if (
              typeof segment.selectedFlight.date === "object" &&
              segment.selectedFlight.date !== null &&
              "getTime" in segment.selectedFlight.date &&
              isValid(segment.selectedFlight.date as Date)
            ) {
              const flightDate = segment.selectedFlight.date as Date;
              console.log(
                "=== Search Flights - Using selectedFlight.date (Date object) ===",
                {
                  date: format(flightDate, "yyyy-MM-dd"),
                  index,
                  timestamp: new Date().toISOString(),
                }
              );
              searchDate = flightDate;
            }
            // Handle string dates
            else if (typeof segment.selectedFlight.date === "string") {
              const dateStr = String(segment.selectedFlight.date);
              // Check for dd.MM.yyyy format
              if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                const [day, month, year] = dateStr.split(".").map(Number);
                const parsedDate = new Date(
                  Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                );
                if (isValid(parsedDate)) {
                  console.log(
                    "=== Search Flights - Parsed selectedFlight.date from DD.MM.YYYY ===",
                    {
                      original: dateStr,
                      parsed: format(parsedDate, "yyyy-MM-dd"),
                      index,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  searchDate = parsedDate;
                }
              }
              // Try parsing ISO format
              else if (dateStr.includes("T") || dateStr.includes("-")) {
                const parsedDate = parseISO(dateStr);
                if (isValid(parsedDate)) {
                  console.log(
                    "=== Search Flights - Parsed selectedFlight.date from ISO ===",
                    {
                      original: dateStr,
                      parsed: format(parsedDate, "yyyy-MM-dd"),
                      index,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  searchDate = parsedDate;
                }
              }
            }
          }
          // Fallback to segment.date
          else if (segment.date) {
            if (segment.date instanceof Date) {
              if (isValid(segment.date)) {
                console.log(
                  "=== Search Flights - Using segment.date (Date object) ===",
                  {
                    date: format(segment.date, "yyyy-MM-dd"),
                    index,
                    timestamp: new Date().toISOString(),
                  }
                );
                searchDate = segment.date;
              } else {
                throw new Error("Invalid Date object in segment.date");
              }
            } else if (typeof segment.date === "string") {
              const dateStr = String(segment.date);
              // Check for dd.MM.yyyy format
              if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                const [day, month, year] = dateStr.split(".").map(Number);
                const parsedDate = new Date(
                  Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                );
                if (isValid(parsedDate)) {
                  console.log(
                    "=== Search Flights - Parsed segment.date from DD.MM.YYYY ===",
                    {
                      original: dateStr,
                      parsed: format(parsedDate, "yyyy-MM-dd"),
                      index,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  searchDate = parsedDate;
                } else {
                  throw new Error("Invalid date parsed from DD.MM.YYYY format");
                }
              }
              // Try parsing ISO format
              else if (dateStr.includes("T") || dateStr.includes("-")) {
                const parsedDate = parseISO(dateStr);
                if (isValid(parsedDate)) {
                  console.log(
                    "=== Search Flights - Parsed segment.date from ISO ===",
                    {
                      original: dateStr,
                      parsed: format(parsedDate, "yyyy-MM-dd"),
                      index,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  searchDate = parsedDate;
                } else {
                  throw new Error("Invalid date parsed from ISO format");
                }
              } else {
                // Last resort: try direct parsing
                const parsedDate = new Date(dateStr);
                if (isValid(parsedDate)) {
                  console.log(
                    "=== Search Flights - Parsed segment.date using direct parsing ===",
                    {
                      original: dateStr,
                      parsed: format(parsedDate, "yyyy-MM-dd"),
                      index,
                      timestamp: new Date().toISOString(),
                    }
                  );
                  searchDate = parsedDate;
                } else {
                  throw new Error("Invalid date format");
                }
              }
            } else {
              throw new Error("Unsupported date format");
            }
          } else {
            throw new Error("No date available");
          }

          if (!isValid(searchDate)) {
            throw new Error("Invalid date");
          }

          // Format date as YYYY-MM-DD for API
          if (searchDate) {
            formattedDate = format(searchDate, "yyyy-MM-dd");
          } else {
            // If searchDate is null, use current date as fallback
            formattedDate = format(new Date(), "yyyy-MM-dd");
            console.log("Using current date as fallback for API search", {
              formattedDate,
            });
          }

          // Update our parsed dates array
          const newParsedDates = [...parsedDates];
          newParsedDates[index] = searchDate;
          setParsedDates(newParsedDates);

          console.log("=== Search Flights - Final date for search ===", {
            formattedDate,
            date: searchDate,
            index,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          console.error("Date parsing error:", error, { date: segment.date });
          setSearchError("Invalid date selected");
          setSearchLoading(false);
          return;
        }

        const params = new URLSearchParams({
          from_iata: segment.fromLocation.value,
          to_iata: segment.toLocation.value,
          date: formattedDate,
          lang: lang || "en",
        });

        // Lang parameter is now handled server-side

        const response = await fetch(
          `/.netlify/functions/searchFlights?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch flights");
        }

        const data = await response.json();
        const flights = data.data || [];

        // Transform and validate the flights
        let validFlights = flights
          .map((flight: RawFlight) => {
            try {
              const transformedFlight = transformRawFlight(
                flight,
                formattedDate
              );
              if (!transformedFlight) {
                console.error("Failed to transform flight:", flight);
                return null;
              }
              return transformedFlight;
            } catch (error) {
              console.error("Error transforming flight:", error);
              return null;
            }
          })
          .filter(
            (flight: unknown): flight is Flight =>
              flight !== null && isValidFlight(flight)
          );

        // For multi-segment flights after the first segment, filter based on previous segment's arrival time
        if (index > 0) {
          const previousSegment = store.flightSegments[index - 1];
          if (previousSegment?.selectedFlight) {
            // Filter flights that depart at least 30 minutes after previous flight arrives
            // and within 48 hours of the previous flight's arrival
            validFlights = validFlights.filter((flight: Flight) => {
              // Create UTC date objects for accurate time comparison
              const prevFlight = previousSegment.selectedFlight;
              if (!prevFlight) return false;

              // Use the search date for both flights
              const searchDate = parseISO(formattedDate);
              const [prevHours, prevMinutes] = prevFlight.arrivalTime
                .split(":")
                .map(Number);
              const previousArrivalTime = new Date(
                Date.UTC(
                  searchDate.getFullYear(),
                  searchDate.getMonth(),
                  searchDate.getDate(),
                  prevHours,
                  prevMinutes,
                  0
                )
              );

              const [depHours, depMinutes] = flight.departureTime
                .split(":")
                .map(Number);
              const departureTime = new Date(
                Date.UTC(
                  searchDate.getFullYear(),
                  searchDate.getMonth(),
                  searchDate.getDate(),
                  depHours,
                  depMinutes,
                  0
                )
              );

              // Handle overnight flights by adding 24 hours if departure is before arrival
              if (departureTime < previousArrivalTime) {
                departureTime.setUTCDate(departureTime.getUTCDate() + 1);
              }

              const timeDiff =
                departureTime.getTime() - previousArrivalTime.getTime();
              const timeDiffMinutes = timeDiff / 60000; // Convert to minutes

              console.log("=== Flight Time Comparison ===", {
                searchDate: formattedDate,
                prevFlight: {
                  date: prevFlight.date,
                  time: prevFlight.arrivalTime,
                  utc: previousArrivalTime.toISOString(),
                  raw: {
                    year: searchDate.getFullYear(),
                    month: searchDate.getMonth() + 1,
                    day: searchDate.getDate(),
                    hours: prevHours,
                    minutes: prevMinutes,
                  },
                },
                nextFlight: {
                  date: flight.date,
                  time: flight.departureTime,
                  utc: departureTime.toISOString(),
                  raw: {
                    year: searchDate.getFullYear(),
                    month: searchDate.getMonth() + 1,
                    day: searchDate.getDate(),
                    hours: depHours,
                    minutes: depMinutes,
                  },
                },
                timeDiffMinutes,
                isValid: timeDiffMinutes >= 30 && timeDiffMinutes <= 2880,
              });

              // Allow flights that depart:
              // 1. At least 30 minutes after previous arrival
              // 2. Within 48 hours (2880 minutes) of previous arrival
              return timeDiffMinutes >= 30 && timeDiffMinutes <= 2880;
            });
          }
        }

        if (validFlights.length === 0) {
          setSearchError(
            index > 0
              ? t.flightSelector.errors.noValidConnecting
              : t.flightSelector.errors.noFlightsRoute
          );
          setSearchLoading(false);
          return;
        }

        setSearchResults(validFlights);
        setActiveIndex(index);
      } catch (error) {
        console.error("Search flights error:", error);
        setSearchError("Failed to search flights. Please try again.");
      } finally {
        setSearchLoading(false);
      }
    },
    [store?.flightSegments, t.flightSelector.errors, parsedDates]
  );

  // Use the global cleanupLocationStorage function from the top of the file
  useEffect(() => {
    return () => {
      cleanupLocationStorage();
    };
  }, []);

  if (!store?.flightSegments) return null;

  return (
    <div className="space-y-8">
      {store.flightSegments.map((segment, index) => (
        <div key={`segment-${index}`} className="relative">
          <div className="relative">
            <div className="relative flex items-start">
              <div className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative">
                    <AutocompleteInput
                      value={segment.fromLocation}
                      onChange={(location) =>
                        handleLocationChange(location, "fromLocation", index)
                      }
                      onSearch={searchAirports}
                      label={t.flightSelector.labels.from}
                      leftIcon="departure"
                      disabled={disabled}
                    />
                  </div>
                  <div className="relative">
                    <AutocompleteInput
                      value={segment.toLocation}
                      onChange={(location) =>
                        handleLocationChange(location, "toLocation", index)
                      }
                      onSearch={searchAirports}
                      label={t.flightSelector.labels.to}
                      leftIcon="arrival"
                      disabled={disabled}
                    />
                  </div>
                </div>
              </div>
              {index > 1 && (
                <button
                  onClick={() => handleSegmentDelete(index)}
                  className="absolute -right-6 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {showFlightSearch && (currentPhase === 3 || currentPhase === 4) && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <div className="relative date-picker-input w-full">
                  {(() => {
                    // Calculate selected date value
                    let selectedDate: Date | null = null;

                    // PHASE 4 SPECIAL HANDLING - Reset date to null for alternative flights
                    if (currentPhase === 4) {
                      // If we are in Phase 4 and need a fresh date, return null to force date selection
                      const travelStatus =
                        phase4Store?.travelStatusAnswers?.find?.(
                          (a) => a.questionId === "travel_status"
                        )?.value;

                      const needsAlternativeFlight =
                        travelStatus === "provided" ||
                        travelStatus === "took_alternative_own";

                      if (needsAlternativeFlight && !parsedDates[index]) {
                        console.log(
                          "=== DatePicker - Phase 4 Alternative Flight - Forcing null date ===",
                          {
                            index,
                            timestamp: new Date().toISOString(),
                          }
                        );
                        selectedDate = null;
                      }
                    }

                    // For all other cases, proceed with normal date handling
                    if (!selectedDate && parsedDates[index]) {
                      selectedDate = parsedDates[index];
                    }

                    // First check segment.date
                    if (
                      !selectedDate &&
                      segment.date &&
                      typeof segment.date === "object" &&
                      isValid(segment.date as Date)
                    ) {
                      console.log("=== DatePicker - Using segment.date ===", {
                        date: segment.date,
                        index,
                        timestamp: new Date().toISOString(),
                      });
                      selectedDate = segment.date as Date;
                    }

                    // Try to parse segment.date as a string
                    if (!selectedDate && segment.date) {
                      const dateStr = String(segment.date);

                      // Check if it's in dd.MM.yyyy format
                      if (
                        typeof dateStr === "string" &&
                        dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)
                      ) {
                        const [day, month, year] = dateStr
                          .split(".")
                          .map(Number);
                        const parsedDate = new Date(
                          Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                        );

                        if (isValid(parsedDate)) {
                          console.log(
                            "=== DatePicker - Parsed dd.MM.yyyy string ===",
                            {
                              originalString: dateStr,
                              parsedDate,
                              index,
                              timestamp: new Date().toISOString(),
                            }
                          );
                          selectedDate = parsedDate;
                        }
                      }

                      // Check if it's an ISO date string
                      if (
                        !selectedDate &&
                        typeof dateStr === "string" &&
                        (dateStr.includes("T") || dateStr.includes("-"))
                      ) {
                        const parsedDate = parseISO(dateStr);

                        if (isValid(parsedDate)) {
                          console.log(
                            "=== DatePicker - Parsed ISO string ===",
                            {
                              originalString: dateStr,
                              parsedDate,
                              index,
                              timestamp: new Date().toISOString(),
                            }
                          );
                          selectedDate = parsedDate;
                        }
                      }

                      // As a fallback, try safeParseDateString
                      if (!selectedDate) {
                        const parsed = safeParseDateString(dateStr);
                        if (parsed) {
                          console.log(
                            "=== DatePicker - Used safeParseDateString ===",
                            {
                              originalValue: segment.date,
                              parsed,
                              index,
                              timestamp: new Date().toISOString(),
                            }
                          );
                          selectedDate = parsed;
                        }
                      }
                    }

                    // Finally, check if the flight has a date
                    if (!selectedDate && segment.selectedFlight?.date) {
                      const flightDate = segment.selectedFlight.date;
                      console.log(
                        "=== DatePicker - Using selectedFlight.date ===",
                        {
                          flightDate,
                          index,
                          timestamp: new Date().toISOString(),
                        }
                      );

                      if (typeof flightDate === "string") {
                        const parsed = safeParseDateString(flightDate);
                        if (parsed) selectedDate = parsed;
                      } else if (
                        flightDate &&
                        typeof flightDate === "object" &&
                        isValid(flightDate as Date)
                      ) {
                        selectedDate = flightDate as Date;
                      }
                    }

                    if (!selectedDate) {
                      console.log("=== DatePicker - No valid date found ===", {
                        index,
                        segmentDate: segment.date,
                        segmentDateType: segment.date
                          ? typeof segment.date
                          : "null",
                        timestamp: new Date().toISOString(),
                      });
                    }

                    // Calculate date input value
                    let dateInputValue = "";
                    if (parsedDates[index]) {
                      console.log(
                        "=== DatePicker - Using parsedDates state ===",
                        {
                          date: format(
                            parsedDates[index] as Date,
                            "dd.MM.yyyy"
                          ),
                          index,
                          timestamp: new Date().toISOString(),
                        }
                      );
                      dateInputValue = format(
                        parsedDates[index] as Date,
                        "dd.MM.yyyy"
                      );
                    }

                    // Calculate openToDate
                    const openToDate =
                      parsedDates[index] ||
                      (segment.date
                        ? typeof segment.date === "object" &&
                          isValid(segment.date as Date)
                          ? (segment.date as Date)
                          : safeParseDateString(segment.date)
                        : undefined);

                    // Handle onChange
                    const handleDatePickerChange = (date: Date | null) => {
                      console.log("=== DatePicker onChange ===", {
                        date,
                        segmentDate: segment.date,
                        segmentDateType: segment.date
                          ? typeof segment.date
                          : "null",
                        index,
                        timestamp: new Date().toISOString(),
                      });

                      // Update our parsed dates array
                      if (date) {
                        const newParsedDates = [...parsedDates];
                        newParsedDates[index] = date;
                        setParsedDates(newParsedDates);
                      }

                      handleDateChange(date, index);
                    };

                    // Handle clear
                    const handleClear = () => {
                      console.log(
                        "=== DatePicker - Date Cleared Explicitly ===",
                        {
                          index,
                          phase: currentPhase,
                          timestamp: new Date().toISOString(),
                        }
                      );

                      // 1. Update parsed dates array to reflect cleared state
                      const newParsedDates = [...parsedDates];
                      newParsedDates[index] = null;
                      setParsedDates(newParsedDates);

                      // 2. Set the cleared flag in localStorage
                      const dateClearFlagKey = `dateWasCleared_phase${currentPhase}_segment${index}`;
                      localStorage.setItem(dateClearFlagKey, "true");

                      // 3. Call handleDateChange with null to update all stores
                      handleDateChange(null, index);

                      // 4. Clear ALL date caches for this segment
                      const cacheKeysToRemove = [
                        `dateCache_phase${currentPhase}_segment${index}`,
                        `exactDate_phase${currentPhase}_segment${index}`,
                      ];

                      cacheKeysToRemove.forEach((key) => {
                        try {
                          localStorage.removeItem(key);
                          console.log(
                            `=== DatePicker - Removed date cache ===`,
                            {
                              key,
                              index,
                              phase: currentPhase,
                              timestamp: new Date().toISOString(),
                            }
                          );
                        } catch (error) {
                          console.error(
                            `Error removing date cache key ${key}:`,
                            error
                          );
                        }
                      });

                      // 5. Force validation
                      validate();
                    };

                    // Create the custom input element
                    const customInput = (
                      <CustomDateInput
                        value={dateInputValue}
                        label={t.flightSelector.labels.departureDate}
                        disabled={disabled}
                        onClear={handleClear}
                      />
                    );

                    return (
                      <DatePicker
                        selected={selectedDate}
                        onChange={handleDatePickerChange}
                        customInput={customInput}
                        dateFormat="dd.MM.yyyy"
                        showMonthDropdown
                        showYearDropdown
                        dropdownMode="select"
                        isClearable={false}
                        placeholderText="DD.MM.YY / DD.MM.YYYY"
                        shouldCloseOnSelect={true}
                        maxDate={new Date()}
                        minDate={
                          new Date(
                            new Date().setFullYear(new Date().getFullYear() - 3)
                          )
                        }
                        openToDate={openToDate}
                        disabledKeyboardNavigation
                        preventOpenOnFocus
                        popperProps={{
                          strategy: "fixed",
                          placement: "top-start",
                        }}
                        className="react-datepicker-popper"
                        calendarClassName="custom-calendar"
                        disabled={disabled}
                      />
                    );
                  })()}
                </div>
                <button
                  onClick={() => {
                    setIsBottomSheetOpen(true);
                    setActiveIndex(index);
                    handleSearchFlights(index);
                  }}
                  disabled={(() => {
                    // Add debug logging to see what's happening with the button state
                    const hasNoDate = !segment.date && !parsedDates[index];
                    const hasNoFromLocation = !segment.fromLocation;
                    const hasNoToLocation = !segment.toLocation;
                    const isDisabled =
                      hasNoDate ||
                      hasNoFromLocation ||
                      hasNoToLocation ||
                      disabled;

                    console.log("=== Search Button State ===", {
                      segmentIndex: index,
                      segmentDate: segment.date,
                      segmentDateType: segment.date
                        ? typeof segment.date
                        : "null",
                      parsedDate: parsedDates[index],
                      hasNoDate,
                      hasNoFromLocation,
                      hasNoToLocation,
                      componentDisabled: disabled,
                      buttonDisabled: isDisabled,
                      timestamp: new Date().toISOString(),
                    });

                    return isDisabled;
                  })()}
                  className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                >
                  {t.flightSelector.labels.searchFlights}
                </button>
              </div>

              <FlightSearchBottomSheet
                isOpen={isBottomSheetOpen}
                onClose={() => setIsBottomSheetOpen(false)}
                onSelect={(flight) => handleFlightSelect(flight, activeIndex)}
                searchResults={searchResults}
                isSearching={searchLoading}
                errorMessage={searchError}
                setIsFlightNotListedOpen={handleFlightNotListed}
                currentPhase={currentPhase}
              />
            </>
          )}
        </div>
      ))}

      {store.flightSegments.length < 4 && store.selectedType === "multi" && (
        <div className="flex flex-col gap-4">
          <button
            onClick={addFlightSegment}
            className="w-full min-h-[3rem] border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F54538] hover:text-[#F54538] transition-colors flex items-center justify-center px-4 py-2 text-sm sm:text-base"
          >
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="whitespace-normal text-center">
              {t.flightSelector.labels.addFlight}
            </span>
          </button>
        </div>
      )}

      {/* Flight Details Section */}
      {/* Debug logs to diagnose rendering issues */}
      {(() => {
        const shouldShowPreview =
          ((store.selectedType === "direct" &&
            !!store.flightSegments[0]?.selectedFlight) ||
            (store.selectedType === "multi" &&
              store.flightSegments.some(
                (segment) => !!segment.selectedFlight
              ))) &&
          (currentPhase === 3 || currentPhase === 4);

        console.log(
          "=== FlightSegments - Flight Preview Final Render Decision ===",
          {
            shouldShowPreview,
            conditionParts: {
              isDirectWithFlight:
                store.selectedType === "direct" &&
                !!store.flightSegments[0]?.selectedFlight,
              isMultiWithSomeFlight:
                store.selectedType === "multi" &&
                store.flightSegments.some(
                  (segment) => !!segment.selectedFlight
                ),
              isPhase3or4: currentPhase === 3 || currentPhase === 4,
            },
            flightSegmentInfo: store.flightSegments.map((segment, idx) => ({
              index: idx,
              hasSelectedFlight: !!segment.selectedFlight,
              flightDetails: segment.selectedFlight
                ? {
                    id: segment.selectedFlight.id,
                    flightNumber: segment.selectedFlight.flightNumber,
                    airline: segment.selectedFlight.airline,
                    date: segment.selectedFlight.date,
                    dateType: typeof segment.selectedFlight.date,
                  }
                : null,
            })),
            timestamp: new Date().toISOString(),
          }
        );
        return null;
      })()}
      {((store.selectedType === "direct" &&
        store.flightSegments[0]?.selectedFlight) ||
        (store.selectedType === "multi" &&
          store.flightSegments.some((segment) => segment.selectedFlight))) &&
        (currentPhase === 3 || currentPhase === 4) && (
          <div className="pt-8">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t.phases.initialAssessment.flightDetails}
              </h3>
              {store.selectedType === "direct" ? (
                store.flightSegments[0]?.selectedFlight && (
                  <FlightPreviewCard
                    key={`flight-preview-${store.flightSegments[0].selectedFlight.id}-0`}
                    flight={store.flightSegments[0].selectedFlight}
                    index={0}
                    onEdit={() => {}} // Will implement in next iteration
                    onDelete={() => handleFlightDelete(0)}
                    isMultiCity={false}
                    showConnectionInfo={false}
                    currentPhase={currentPhase}
                  />
                )
              ) : (
                <div className="space-y-4">
                  {store.flightSegments.map((segment, index) => (
                    <React.Fragment
                      key={`flight-preview-${segment.selectedFlight?.id}-${index}`}
                    >
                      {segment.selectedFlight && (
                        <>
                          <FlightPreviewCard
                            flight={segment.selectedFlight}
                            index={index}
                            onEdit={() => {}} // Will implement in next iteration
                            onDelete={() => handleFlightDelete(index)}
                            isMultiCity={true}
                            showConnectionInfo={index > 0}
                            currentPhase={currentPhase}
                          />
                          {index < store.flightSegments.length - 1 && (
                            <div className="h-4 border-l-2 border-dashed border-gray-300 ml-6" />
                          )}
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
