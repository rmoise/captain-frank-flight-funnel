import { Flight } from "@/types/shared/flight";
import type { Translations } from "@/translations/types";
import { parseISO, format, isValid } from "date-fns";

interface ConnectionTimeInfo {
  message: string;
  isValid: boolean;
}

// New validation function for flight selection
export function canSelectFlight(
  selectedFlights: Flight[],
  newFlight: Flight,
  segmentIndex: number
): { canSelect: boolean; reason?: string } {
  // For the first flight, always allow selection
  if (segmentIndex === 0 || selectedFlights.length === 0) {
    return { canSelect: true };
  }

  // Get the previous flight
  const prevFlight = selectedFlights[segmentIndex - 1];
  if (!prevFlight) {
    return { canSelect: true };
  }

  // Use the existing connection time validation
  const connectionInfo = getConnectionTimeInfo(
    prevFlight,
    newFlight,
    {} as any
  );

  if (!connectionInfo.isValid) {
    return {
      canSelect: false,
      reason: connectionInfo.message || "Invalid connection time",
    };
  }

  return { canSelect: true };
}

export function getConnectionTimeInfo(
  prevFlight: Flight,
  nextFlight: Flight,
  t: Translations
): ConnectionTimeInfo {
  try {
    // Validate input parameters
    if (!prevFlight || !nextFlight) {
      console.error("Missing flight data:", { prevFlight, nextFlight });
      return {
        isValid: false,
        message: "Missing flight information",
      };
    }

    if (!prevFlight.arrivalTime || !nextFlight.departureTime) {
      console.error("Missing time data:", {
        prevFlightArrivalTime: prevFlight?.arrivalTime,
        nextFlightDepartureTime: nextFlight?.departureTime,
      });
      return {
        isValid: false,
        message: "Missing flight time information",
      };
    }

    // Log raw input data to help debug the root cause
    console.log("=== Connection Time Validation - Raw Input ===", {
      prevFlight: {
        arrivalTime: prevFlight.arrivalTime,
        flightNumber: prevFlight.flightNumber,
        date: (prevFlight as any).date,
        fullObject: prevFlight,
      },
      nextFlight: {
        departureTime: nextFlight.departureTime,
        flightNumber: nextFlight.flightNumber,
        date: (nextFlight as any).date,
        fullObject: nextFlight,
      },
    });

    // ENHANCED: Parse flight times with better format handling
    let prevArrivalTime: Date;
    let nextDepartureTime: Date;

    // Helper function to extract time from various formats
    const extractTimeFromString = (
      timeString: string
    ): { hours: number; minutes: number } => {
      // ENHANCED: Handle edge case where date string is passed as time
      if (!timeString) {
        throw new Error("Empty time string provided");
      }

      // If only a date is provided (like "2025-01-06"), we can't extract time
      if (
        timeString.match(/^\d{4}-\d{2}-\d{2}$/) ||
        timeString.match(/^\d{2}\.\d{2}\.\d{4}$/)
      ) {
        throw new Error(
          `Date string provided instead of time: ${timeString}. Expected time format like "07:40" or "2025-01-06 07:40:00"`
        );
      }

      let hours: number, minutes: number;

      // Handle full datetime format (e.g., "2025-01-07 07:40:00")
      if (timeString.includes(" ")) {
        const parts = timeString.split(" ");
        if (parts.length < 2) {
          throw new Error(`Invalid datetime format: ${timeString}`);
        }
        const timePart = parts[1];
        const timeParts = timePart.split(":");
        if (timeParts.length < 2) {
          throw new Error(`Invalid time part in datetime: ${timePart}`);
        }
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }
      // Handle ISO datetime format (e.g., "2025-01-07T07:40:00.000Z")
      else if (timeString.includes("T")) {
        const timePart = timeString.split("T")[1];
        if (!timePart) {
          throw new Error(`Invalid ISO datetime format: ${timeString}`);
        }
        const timeOnly = timePart.split(".")[0]; // Remove milliseconds/timezone
        const timeParts = timeOnly.split(":");
        if (timeParts.length < 2) {
          throw new Error(`Invalid time part in ISO datetime: ${timeOnly}`);
        }
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }
      // Handle simple time format (e.g., "07:40" or "07:40:00")
      else {
        const timeParts = timeString.split(":");
        if (timeParts.length < 2) {
          throw new Error(
            `Invalid time format: ${timeString}. Expected format like "07:40" or "07:40:00"`
          );
        }
        hours = parseInt(timeParts[0], 10);
        minutes = parseInt(timeParts[1], 10);
      }

      // Validate extracted values
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(
          `Could not parse hours/minutes from: ${timeString}. Extracted hours: ${hours}, minutes: ${minutes}`
        );
      }

      return { hours, minutes };
    };

    // Get the actual flight dates
    const prevFlightDate = (prevFlight as any).date;
    const nextFlightDate = (nextFlight as any).date;

    // Helper function to parse date from various formats
    const parseFlightDate = (dateValue: any): Date => {
      if (!dateValue) {
        // Fallback to today if no date available
        return new Date();
      }

      if (typeof dateValue === "string") {
        if (dateValue.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
          // DD.MM.YYYY format
          const [day, month, year] = dateValue.split(".").map(Number);
          return new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
        } else if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // YYYY-MM-DD format
          return parseISO(dateValue);
        } else {
          // Try parsing as ISO string
          return parseISO(dateValue);
        }
      } else if (dateValue instanceof Date) {
        return dateValue;
      } else {
        // Fallback to today
        return new Date();
      }
    };

    // Parse previous flight arrival time
    try {
      const prevDate = parseFlightDate(prevFlightDate);
      const { hours: arrHours, minutes: arrMinutes } = extractTimeFromString(
        prevFlight.arrivalTime
      );

      // Validate extracted time values
      if (
        isNaN(arrHours) ||
        isNaN(arrMinutes) ||
        arrHours < 0 ||
        arrHours > 23 ||
        arrMinutes < 0 ||
        arrMinutes > 59
      ) {
        throw new Error(`Invalid arrival time: ${prevFlight.arrivalTime}`);
      }

      prevArrivalTime = new Date(
        Date.UTC(
          prevDate.getUTCFullYear(),
          prevDate.getUTCMonth(),
          prevDate.getUTCDate(),
          arrHours,
          arrMinutes,
          0
        )
      );
    } catch (error) {
      console.error("Error parsing previous flight arrival time:", error, {
        arrivalTime: prevFlight.arrivalTime,
        date: prevFlightDate,
      });
      return {
        isValid: false,
        message: "Unable to parse previous flight arrival time",
      };
    }

    // Parse next flight departure time
    try {
      const nextDate = parseFlightDate(nextFlightDate);
      const { hours: depHours, minutes: depMinutes } = extractTimeFromString(
        nextFlight.departureTime
      );

      // Validate extracted time values
      if (
        isNaN(depHours) ||
        isNaN(depMinutes) ||
        depHours < 0 ||
        depHours > 23 ||
        depMinutes < 0 ||
        depMinutes > 59
      ) {
        throw new Error(`Invalid departure time: ${nextFlight.departureTime}`);
      }

      nextDepartureTime = new Date(
        Date.UTC(
          nextDate.getUTCFullYear(),
          nextDate.getUTCMonth(),
          nextDate.getUTCDate(),
          depHours,
          depMinutes,
          0
        )
      );
    } catch (error) {
      console.error("Error parsing next flight departure time:", error, {
        departureTime: nextFlight.departureTime,
        date: nextFlightDate,
      });
      return {
        isValid: false,
        message: "Unable to parse next flight departure time",
      };
    }

    // Final validation - if we still don't have valid dates, return early
    if (!isValid(prevArrivalTime) || !isValid(nextDepartureTime)) {
      console.error("Invalid time values after parsing:", {
        prevArrivalTime: prevFlight.arrivalTime,
        nextDepartureTime: nextFlight.departureTime,
        parsedPrevArrival: prevArrivalTime?.toString() || "undefined",
        parsedNextDeparture: nextDepartureTime?.toString() || "undefined",
        prevArrivalTimeValid: isValid(prevArrivalTime),
        nextDepartureTimeValid: isValid(nextDepartureTime),
      });
      return {
        isValid: false,
        message: "Unable to parse flight times",
      };
    }

    console.log(
      "=== Connection Time Validation - Parsed Times (ENHANCED) ===",
      {
        prevArrivalTime: prevArrivalTime.toISOString(),
        nextDepartureTime: nextDepartureTime.toISOString(),
        prevFlightNumber: prevFlight.flightNumber,
        nextFlightNumber: nextFlight.flightNumber,
        prevFlightDate,
        nextFlightDate,
        actualDatesUsed: {
          prevDate: prevFlightDate ? "actual" : "fallback",
          nextDate: nextFlightDate ? "actual" : "fallback",
        },
      }
    );

    // Calculate time difference in minutes
    const diffInMinutes = Math.floor(
      (nextDepartureTime.getTime() - prevArrivalTime.getTime()) / (1000 * 60)
    );

    // Format time difference
    const hours = Math.floor(Math.abs(diffInMinutes) / 60);
    const minutes = Math.abs(diffInMinutes) % 60;

    console.log(
      "=== Connection Time Validation - Time Difference (ENHANCED) ===",
      {
        diffInMinutes,
        hours,
        minutes,
        maxAllowed: 48 * 60,
        isValid: diffInMinutes >= 30 && diffInMinutes <= 48 * 60,
        prevArrivalLocalTime: prevArrivalTime.toLocaleString(),
        nextDepartureLocalTime: nextDepartureTime.toLocaleString(),
        reasonIfInvalid:
          diffInMinutes < 0
            ? "Next flight departs before previous arrives"
            : diffInMinutes < 30
            ? "Connection too short (< 30 min)"
            : diffInMinutes > 48 * 60
            ? "Connection too long (> 48 hours)"
            : "Valid",
      }
    );

    // Validate connection time
    if (diffInMinutes < 0) {
      return {
        isValid: false,
        message:
          t?.flightSelector?.errors?.departBeforeArrival ||
          `Next flight departs before previous arrives (${Math.abs(
            Math.round(diffInMinutes)
          )} minutes early)`,
      };
    }

    if (diffInMinutes < 30) {
      return {
        isValid: false,
        message:
          t?.flightSelector?.errors?.minConnectionTime ||
          `Connection time too short: ${diffInMinutes} minutes (minimum 30 minutes required)`,
      };
    }

    const maxConnectionMinutes = 48 * 60; // 48 hours in minutes
    if (diffInMinutes > maxConnectionMinutes) {
      return {
        isValid: false,
        message:
          t?.flightSelector?.errors?.maxConnectionTime ||
          `Connection time too long: ${Math.round(
            hours
          )} hours (maximum 48 hours)`,
      };
    }

    // Return valid connection time message
    const connectionMessage =
      t?.flightSelector?.errors?.connectionTime ||
      "Connection time: {hours}h {minutes}m";
    return {
      isValid: true,
      message: connectionMessage
        .replace("{hours}", hours.toString())
        .replace("{minutes}", minutes.toString()),
    };
  } catch (error) {
    console.error("Error calculating connection time:", error, {
      prevFlight: {
        arrivalTime: prevFlight.arrivalTime,
        flightNumber: prevFlight.flightNumber,
      },
      nextFlight: {
        departureTime: nextFlight.departureTime,
        flightNumber: nextFlight.flightNumber,
      },
    });
    return {
      isValid: false,
      message:
        t?.flightSelector?.errors?.minConnectionTime ||
        "Unable to validate connection time",
    };
  }
}
