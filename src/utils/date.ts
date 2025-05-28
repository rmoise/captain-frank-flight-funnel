import { format, parseISO, differenceInMinutes } from "date-fns";

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  return format(dateObj, "dd.MM.yyyy");
};

export const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return "";
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    return format(dateObj, "dd.MM.yyyy");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "";
  }
};

export const formatTimeDisplay = (
  timeStr: string | null | undefined
): string => {
  if (!timeStr) return "";
  try {
    const date = parseISO(timeStr);
    return format(date, "HH:mm");
  } catch (error) {
    console.error("Error formatting time:", error);
    return "";
  }
};

export const calculateDuration = (
  depTime: string | null | undefined,
  arrTime: string | null | undefined
): string => {
  if (!depTime || !arrTime) return "";
  try {
    const departure = parseISO(depTime);
    const arrival = parseISO(arrTime);
    const durationInMinutes = differenceInMinutes(arrival, departure);
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = durationInMinutes % 60;
    return `${hours}h ${minutes}m`;
  } catch (error) {
    console.error("Error calculating duration:", error);
    return "";
  }
};

export const safeParseDateString = (
  dateStr: string | Date
): Date | undefined => {
  try {
    return typeof dateStr === "string" ? parseISO(dateStr) : dateStr;
  } catch (error) {
    console.error("Error parsing date:", error);
    return undefined;
  }
};
