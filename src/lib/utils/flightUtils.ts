import type { Flight } from '@/types/store';
import { parseISO } from 'date-fns';

export const validateFlightTimes = (
  prevFlight: Flight,
  nextFlight: Flight
): boolean => {
  if (!prevFlight.arrivalTime || !nextFlight.departureTime) return false;

  const prevArrival = parseISO(`${prevFlight.date}T${prevFlight.arrivalTime}`);
  const nextDeparture = parseISO(
    `${nextFlight.date}T${nextFlight.departureTime}`
  );

  // Ensure next flight departs after previous flight arrives
  return nextDeparture > prevArrival;
};
