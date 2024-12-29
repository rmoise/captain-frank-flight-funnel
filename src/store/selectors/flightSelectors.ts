import type { RootState } from '@/store';
import { createSelector } from '@reduxjs/toolkit';

const selectBookingState = (state: RootState) => state.booking;

export const selectSelectedFlights = createSelector(
  [selectBookingState],
  (booking) =>
    Array.isArray(booking.selectedFlight)
      ? booking.selectedFlight
      : booking.selectedFlight
        ? [booking.selectedFlight]
        : []
);
