import type { RootState } from '@/store';

export const selectSelectedFlights = (state: RootState) =>
  Array.isArray(state.booking.selectedFlight)
    ? state.booking.selectedFlight
    : state.booking.selectedFlight
    ? [state.booking.selectedFlight]
    : [];
