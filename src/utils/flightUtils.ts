import { Flight } from '@/types/store';
import type { Translations } from '@/translations/types';
import { parseISO } from 'date-fns';

interface ConnectionTimeInfo {
  message: string;
  isValid: boolean;
}

export function getConnectionTimeInfo(
  prevFlight: Flight,
  nextFlight: Flight,
  t: Translations
): ConnectionTimeInfo {
  try {
    // Create dates using scheduled times
    const prevArrivalTime = parseISO(
      `${prevFlight.date}T${prevFlight.scheduledArrivalTime || prevFlight.arrivalTime}:00.000Z`
    );
    const nextDepartureTime = parseISO(
      `${nextFlight.date}T${nextFlight.scheduledDepartureTime || nextFlight.departureTime}:00.000Z`
    );

    // Calculate time difference in minutes
    const diffInMinutes = Math.floor(
      (nextDepartureTime.getTime() - prevArrivalTime.getTime()) / (1000 * 60)
    );

    // Format time difference
    const hours = Math.floor(Math.abs(diffInMinutes) / 60);
    const minutes = Math.abs(diffInMinutes) % 60;

    // Validate connection time
    if (diffInMinutes < 0) {
      return {
        isValid: false,
        message: t.flightSelector.errors.departBeforeArrival,
      };
    }

    if (diffInMinutes < 30) {
      return {
        isValid: false,
        message: t.flightSelector.errors.minConnectionTime,
      };
    }

    const maxConnectionMinutes = 48 * 60; // 48 hours in minutes
    if (diffInMinutes > maxConnectionMinutes) {
      return {
        isValid: false,
        message: t.flightSelector.errors.maxConnectionTime,
      };
    }

    // Return valid connection time message
    return {
      isValid: true,
      message: t.flightSelector.errors.connectionTime
        .replace('{hours}', hours.toString())
        .replace('{minutes}', minutes.toString()),
    };
  } catch (error) {
    console.error('Error calculating connection time:', error, {
      prevFlight: {
        date: prevFlight.date,
        scheduledArrivalTime: prevFlight.scheduledArrivalTime,
        arrivalTime: prevFlight.arrivalTime,
      },
      nextFlight: {
        date: nextFlight.date,
        scheduledDepartureTime: nextFlight.scheduledDepartureTime,
        departureTime: nextFlight.departureTime,
      },
    });
    return {
      isValid: false,
      message: t.flightSelector.errors.minConnectionTime,
    };
  }
}
