import type { Store } from "@/store/types";
import type { Flight } from "@/types/shared/flight";

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
  set: (fn: (state: Store) => Partial<Store>) => void
): FlightSearchActions => ({
  setDisplayedFlights: (flights) => {
    set((state) => ({
      ...state,
      displayedFlights: flights,
      loading: false,
    }));
  },
  setFlightSearchLoading: (loading) => {
    set((state) => ({
      ...state,
      loading,
    }));
  },
  setFlightSearchError: (error) => {
    set((state) => ({
      ...state,
      error,
      loading: false,
    }));
  },
  clearFlightSearch: () => {
    set((state) => ({
      ...state,
      displayedFlights: [],
      loading: false,
      error: null,
    }));
  },
});
