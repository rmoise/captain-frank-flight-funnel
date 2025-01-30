import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight } from '@/types/store';

interface FlightStore {
  // Core flight data
  originalFlights: Flight[];
  selectedFlights: Flight[];

  // Actions
  setOriginalFlights: (flights: Flight[]) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  resetFlights: () => void;
}

interface FlightState {
  originalFlights: Flight[];
  selectedFlights: Flight[];
}

const STORAGE_KEY = 'flight-store';

const initialState: FlightState = {
  originalFlights: [],
  selectedFlights: [],
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

        if (typeof window !== 'undefined') {
          localStorage.setItem(
            'flightSelectionState',
            JSON.stringify({
              selectedFlights: flights,
              timestamp: Date.now(),
              isExplicitSelection: true,
            })
          );
        }

        set((state) => ({
          ...state,
          selectedFlights: flights,
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
      }),
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          const selectionState = localStorage.getItem('flightSelectionState');
          if (selectionState) {
            try {
              const { selectedFlights, isExplicitSelection } =
                JSON.parse(selectionState);
              if (isExplicitSelection) {
                state.selectedFlights = selectedFlights;
              }
            } catch (error) {
              console.error('Error parsing flight selection state:', error);
            }
          }

          console.log('=== FlightStore - Rehydrated ===', {
            originalFlights: state.originalFlights?.length || 0,
            selectedFlights: state.selectedFlights?.length || 0,
            timestamp: new Date().toISOString(),
          });
        }
      },
    }
  )
);
