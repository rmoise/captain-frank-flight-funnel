import { StoreStateValues } from '../types';
import type { Flight } from '@/types/store';

export interface FlightSearchSlice {
  displayedFlights: Flight[];
  loading: boolean;
  error: string | null;
}

export interface FlightSearchActions {
  setDisplayedFlights: (flights: Flight[]) => void;
  setFlightSearchLoading: (loading: boolean) => void;
  setFlightSearchError: (error: string | null) => void;
  clearFlightSearch: () => void;
}

export const initialFlightSearchState: FlightSearchSlice = {
  displayedFlights: [],
  loading: false,
  error: null,
};

export const createFlightSearchSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): FlightSearchActions => ({
  setDisplayedFlights: (flights) => {
    set(() => ({
      displayedFlights: flights,
      loading: false,
    }));
  },
  setFlightSearchLoading: (loading) => {
    set(() => ({
      loading,
    }));
  },
  setFlightSearchError: (error) => {
    set(() => ({
      error,
      loading: false,
    }));
  },
  clearFlightSearch: () => {
    set(() => ({
      displayedFlights: [],
      loading: false,
      error: null,
    }));
  },
});
