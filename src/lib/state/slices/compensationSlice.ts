import { StoreStateValues } from '../types';
import type { FlightSegment } from '../types';
import type { Flight } from '@/types/store';

export interface CompensationCache {
  amount: number | null;
  flightData: {
    selectedType: 'direct' | 'multi';
    directFlight: FlightSegment | null;
    flightSegments: FlightSegment[];
    selectedFlights: Flight[];
  } | null;
}

export interface CompensationSlice {
  compensationAmount: number | null;
  compensationLoading: boolean;
  compensationError: string | null;
  compensationCache: CompensationCache;
}

export interface CompensationActions {
  setCompensationAmount: (amount: number | null) => void;
  setCompensationLoading: (loading: boolean) => void;
  setCompensationError: (error: string | null) => void;
  setCompensationCache: (cache: CompensationCache) => void;
  shouldRecalculateCompensation: () => boolean;
}

export const initialCompensationState: CompensationSlice = {
  compensationAmount: null,
  compensationLoading: false,
  compensationError: null,
  compensationCache: {
    amount: null,
    flightData: null,
  },
};

export const createCompensationSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  get: () => StoreStateValues
): CompensationActions => ({
  setCompensationAmount: (amount) => {
    set(() => ({
      compensationAmount: amount,
    }));
  },
  setCompensationLoading: (loading) => {
    set(() => ({
      compensationLoading: loading,
    }));
  },
  setCompensationError: (error) => {
    set(() => ({
      compensationError: error,
    }));
  },
  setCompensationCache: (cache) => {
    set(() => ({
      compensationCache: cache,
    }));
  },
  shouldRecalculateCompensation: () => {
    const state = get();
    const {
      compensationCache,
      selectedType,
      directFlight,
      flightSegments,
      selectedFlights,
    } = state;

    // If no cache exists, we need to calculate
    if (!compensationCache.amount || !compensationCache.flightData) {
      return true;
    }

    const cachedData = compensationCache.flightData;

    // Check if flight selection type has changed
    if (selectedType !== cachedData.selectedType) {
      return true;
    }

    // For direct flights
    if (selectedType === 'direct') {
      return (
        JSON.stringify(directFlight) !==
          JSON.stringify(cachedData.directFlight) ||
        JSON.stringify(selectedFlights) !==
          JSON.stringify(cachedData.selectedFlights)
      );
    }

    // For multi-segment flights
    return (
      JSON.stringify(flightSegments) !==
        JSON.stringify(cachedData.flightSegments) ||
      JSON.stringify(selectedFlights) !==
        JSON.stringify(cachedData.selectedFlights)
    );
  },
});
