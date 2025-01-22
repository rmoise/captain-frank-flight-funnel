import { Flight } from '@/types/store';
import type { StoreStateValues } from '@/lib/state/types';

export interface FlightSearchSlice {
  displayedFlights: Flight[];
  loading: boolean;
  error: string | null;
}

export interface FlightSearchActions {
  setDisplayedFlights: (flights: Flight[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearFlights: () => void;
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
      error: null,
    }));
  },
  setLoading: (loading) => {
    set(() => ({
      loading,
    }));
  },
  setError: (error) => {
    set(() => ({
      error,
      loading: false,
    }));
  },
  clearFlights: () => {
    set(() => ({
      displayedFlights: [],
      loading: false,
      error: null,
    }));
  },
});
