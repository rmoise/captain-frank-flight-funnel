import { format, parseISO, isValid } from "date-fns";

export const formatDateToYYYYMMDD = (date: string | Date): string | null => {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return null;
  }
};

export const isValidYYYYMMDD = (dateStr: string): boolean => {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

export const formatSafeDate = (
  date: string | Date | null | undefined
): string => {
  if (!date) return "";
  try {
    // If it's already in dd.MM.yyyy format, return as is
    if (typeof date === "string" && date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return date;
    }

    // Handle ISO string with timezone (e.g. 2025-01-04T23:00:00.000Z)
    if (typeof date === "string" && date.includes("T") && date.includes("Z")) {
      // Create Date object which will handle timezone conversion to local time
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        // Format with local timezone consideration
        return dateObj
          .toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
          .replace(/\//g, "."); // Convert from DD/MM/YYYY to DD.MM.YYYY format
      }
    }

    // Regular parsing for other formats
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return d
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "."); // Convert from DD/MM/YYYY to DD.MM.YYYY format
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

export const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return "";

  try {
    // If it's already in dd.MM.yyyy format, return as is
    if (typeof date === "string" && date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return date;
    }

    // Handle ISO string with timezone (e.g. 2025-01-04T23:00:00.000Z)
    if (typeof date === "string" && date.includes("T") && date.includes("Z")) {
      // Create Date object which will handle timezone conversion
      const dateObj = new Date(date);
      if (isValid(dateObj)) {
        return format(dateObj, "dd.MM.yyyy");
      }
    }

    // If it's a string, try to parse it
    if (typeof date === "string") {
      // If it's an ISO string without timezone, parse it
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

export const safeParseDateString = (
  dateStr: string | Date | null
): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isValid(dateStr) ? dateStr : null;

  try {
    // Handle ISO date strings
    if (typeof dateStr === "string" && dateStr.includes("T")) {
      const parsed = parseISO(dateStr);
      return isValid(parsed) ? parsed : null;
    }

    // Handle dd.MM.yyyy format
    if (typeof dateStr === "string" && dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      const [day, month, year] = dateStr.split(".").map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return isValid(date) ? date : null;
    }

    // Handle YYYY-MM-DD format
    if (typeof dateStr === "string" && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split("-").map(Number);
      const date = new Date(year, month - 1, day, 12, 0, 0, 0);
      return isValid(date) ? date : null;
    }

    // Try standard date parsing as last resort
    const parsed = new Date(dateStr);
    return isValid(parsed) ? parsed : null;
  } catch (error) {
    console.error("Error parsing date:", error);
    return null;
  }
};

// Helper function to format time display
export const formatTimeDisplay = (
  timeStr: string | null | undefined
): string => {
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
export const calculateDuration = (
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
