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
    // Log raw input data
    console.log('=== Connection Time Validation - Raw Input ===', {
      prevFlight: {
        date: prevFlight.date,
        arrivalTime: prevFlight.arrivalTime,
        flightNumber: prevFlight.flightNumber,
      },
      nextFlight: {
        date: nextFlight.date,
        departureTime: nextFlight.departureTime,
        flightNumber: nextFlight.flightNumber,
      },
    });

    // Parse arrival and departure times
    const [prevArrHours, prevArrMinutes] = prevFlight.arrivalTime
      .split(':')
      .map(Number);
    const [nextDepHours, nextDepMinutes] = nextFlight.departureTime
      .split(':')
      .map(Number);

    // Create dates preserving the exact dates from the flights
    const prevDate = parseISO(prevFlight.date);
    const nextDate = parseISO(nextFlight.date);

    // Create date objects in UTC to avoid timezone shifts
    const prevArrivalTime = new Date(
      Date.UTC(
        prevDate.getFullYear(),
        prevDate.getMonth(),
        prevDate.getDate(),
        prevArrHours,
        prevArrMinutes,
        0
      )
    );

    const nextDepartureTime = new Date(
      Date.UTC(
        nextDate.getFullYear(),
        nextDate.getMonth(),
        nextDate.getDate(),
        nextDepHours,
        nextDepMinutes,
        0
      )
    );

    console.log('=== Connection Time Validation - Final Times ===', {
      prevArrivalTime: prevArrivalTime.toISOString(),
      nextDepartureTime: nextDepartureTime.toISOString(),
      prevFlightNumber: prevFlight.flightNumber,
      nextFlightNumber: nextFlight.flightNumber,
      raw: {
        prev: {
          date: prevFlight.date,
          time: prevFlight.arrivalTime,
          components: {
            year: prevDate.getFullYear(),
            month: prevDate.getMonth() + 1,
            day: prevDate.getDate(),
            hours: prevArrHours,
            minutes: prevArrMinutes,
          },
        },
        next: {
          date: nextFlight.date,
          time: nextFlight.departureTime,
          components: {
            year: nextDate.getFullYear(),
            month: nextDate.getMonth() + 1,
            day: nextDate.getDate(),
            hours: nextDepHours,
            minutes: nextDepMinutes,
          },
        },
      },
    });

    // Calculate time difference in minutes
    const diffInMinutes = Math.floor(
      (nextDepartureTime.getTime() - prevArrivalTime.getTime()) / (1000 * 60)
    );

    // Format time difference
    const hours = Math.floor(Math.abs(diffInMinutes) / 60);
    const minutes = Math.abs(diffInMinutes) % 60;

    console.log('=== Connection Time Validation - Time Difference ===', {
      diffInMinutes,
      hours,
      minutes,
      maxAllowed: 48 * 60,
      isValid: diffInMinutes >= 30 && diffInMinutes <= 48 * 60,
    });

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
