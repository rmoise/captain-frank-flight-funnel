import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight } from '@/types/store';

interface FlightStore {
  // Core flight data
  originalFlights: Flight[];
  selectedFlights: Flight[];
  selectedDate: string | null;

  // Actions
  setOriginalFlights: (flights: Flight[]) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setSelectedDate: (date: string | null) => void;
  resetFlights: () => void;
}

interface FlightState {
  originalFlights: Flight[];
  selectedFlights: Flight[];
  selectedDate: string | null;
}

const STORAGE_KEY = 'flight-store';

const initialState: FlightState = {
  originalFlights: [],
  selectedFlights: [],
  selectedDate: null,
};

export const useFlightStore = create<FlightStore>()(
  persist(
    (set) => ({
      ...initialState,

      setOriginalFlights: (flights: Flight[]) => {
        console.log('=== FlightStore - setOriginalFlights - ENTRY ===', {
          incomingFlights: flights?.map((f: Flight) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });

        set((state) => ({
          ...state,
          originalFlights: flights,
          selectedFlights:
            state.selectedFlights.length === 0
              ? flights
              : state.selectedFlights,
        }));
      },

      setSelectedFlights: (flights: Flight[]) => {
        console.log('=== FlightStore - setSelectedFlights - ENTRY ===', {
          incomingFlights: flights?.map((f: Flight) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });

        // Store complete flight data in localStorage
        if (typeof window !== 'undefined') {
          // Get the current date from the first flight if available
          const date = flights[0]?.date || null;

          // Determine flight type based on number of flights
          const flightType = flights.length > 1 ? 'multi' : 'direct';

          // Ensure all flights have dates
          const flightsWithDates = flights.map((flight) => ({
            ...flight,
            date: flight.date || date || '', // Ensure date is never null
          }));

          // Update localStorage with flight selection state
          localStorage.setItem(
            'flightSelectionState',
            JSON.stringify({
              selectedFlights: flightsWithDates,
              selectedDate: date,
              selectedType: flightType,
              timestamp: Date.now(),
              isExplicitSelection: true,
            })
          );

          // Also update phase-specific storage
          const currentPhase = localStorage.getItem('currentPhase');
          if (currentPhase) {
            const phaseKey = `phase${currentPhase}FlightData`;
            const existingData = localStorage.getItem(phaseKey);
            const phaseData = existingData ? JSON.parse(existingData) : {};

            localStorage.setItem(
              phaseKey,
              JSON.stringify({
                ...phaseData,
                selectedFlights: flightsWithDates,
                selectedDate: date,
                selectedType: flightType,
                timestamp: Date.now(),
              })
            );
          }

          // Update both the flights and date in the store
          set((state) => ({
            ...state,
            selectedFlights: flightsWithDates,
            selectedDate: date,
            _lastUpdate: Date.now(),
          }));
        } else {
          set((state) => ({
            ...state,
            selectedFlights: flights,
            _lastUpdate: Date.now(),
          }));
        }
      },

      setSelectedDate: (date: string | null) => {
        console.log('=== FlightStore - setSelectedDate ===', {
          date,
          timestamp: new Date().toISOString(),
        });

        if (typeof window !== 'undefined') {
          const currentState = JSON.parse(
            localStorage.getItem('flightSelectionState') || '{}'
          );
          localStorage.setItem(
            'flightSelectionState',
            JSON.stringify({
              ...currentState,
              selectedDate: date,
              timestamp: Date.now(),
            })
          );
        }

        set((state) => ({
          ...state,
          selectedDate: date,
        }));
      },

      resetFlights: () => {
        console.log('=== FlightStore - resetFlights ===', {
          timestamp: new Date().toISOString(),
        });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('flightSelectionState');
        }
        set(initialState);
      },

      onRehydrateStorage: () => (state: FlightStore | undefined) => {
        // Get stored flight selection state
        const flightSelectionState = JSON.parse(
          localStorage.getItem('flightSelectionState') || '{}'
        );

        console.log('=== FlightStore - Rehydrated ===', {
          originalFlights: state?.originalFlights?.length || 0,
          selectedFlights: state?.selectedFlights?.length || 0,
          selectedDate: state?.selectedDate,
          timestamp: new Date().toISOString(),
        });

        // Return updated state if needed
        if (state) {
          return {
            ...state,
            selectedFlights: flightSelectionState.selectedFlights || [],
            selectedDate: flightSelectionState.selectedDate || null,
          };
        }
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        originalFlights: state.originalFlights,
        selectedFlights: state.selectedFlights,
        selectedDate: state.selectedDate,
      }),
      version: 1,
    }
  )
);
