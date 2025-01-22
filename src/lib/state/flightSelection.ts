import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Location {
  value: string;
  label: string;
}

interface Flight {
  id: string;
  flightNumber: string;
}

interface FlightSegment {
  from: string;
  to: string;
}

interface DirectFlight {
  fromLocation: Location | null;
  toLocation: Location | null;
  date: string | null;
  selectedFlight: Flight | null;
}

interface FlightState {
  selectedType: 'direct' | 'multi';
  currentPhase: number;
  directFlight: DirectFlight;
  flightSegments: FlightSegment[];
  selectedFlights: Flight[];
  selectedDate: string | null;
  fromLocation: Location | null;
  toLocation: Location | null;
  validationState: {
    isFlightValid: boolean;
  };
  setSelectedType: (type: 'direct' | 'multi') => void;
  setCurrentPhase: (phase: number) => void;
  setFromLocation: (location: Location) => void;
  setToLocation: (location: Location) => void;
  setSelectedDate: (date: string) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setFlightSegments: (segments: FlightSegment[]) => void;
  setDirectFlight: (flight: DirectFlight) => void;
  validateFlightSelection: () => void;
  setFlightState: (state: Partial<FlightState>) => void;
}

export const initialFlightState = {
  selectedType: 'direct' as const,
  currentPhase: 1,
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: null,
    selectedFlight: null,
  },
  flightSegments: [],
  selectedFlights: [],
  selectedDate: null,
  fromLocation: null,
  toLocation: null,
  validationState: {
    isFlightValid: false,
  },
};

export const useStore = create<FlightState>()(
  persist(
    (set, get) => ({
      ...initialFlightState,

      setSelectedType: (type) => set({ selectedType: type }),
      setCurrentPhase: (phase) => set({ currentPhase: phase }),

      setFromLocation: (location) =>
        set((state) => ({
          ...state,
          fromLocation: location,
          directFlight: {
            ...state.directFlight,
            fromLocation: location,
          },
          validationState: {
            ...state.validationState,
            isFlightValid: !!location && !!state.directFlight.toLocation,
          },
        })),

      setToLocation: (location) =>
        set((state) => ({
          ...state,
          toLocation: location,
          directFlight: {
            ...state.directFlight,
            toLocation: location,
          },
          validationState: {
            ...state.validationState,
            isFlightValid: !!state.directFlight.fromLocation && !!location,
          },
        })),

      setSelectedDate: (date) =>
        set((state) => ({
          selectedDate: date,
          directFlight: {
            ...state.directFlight,
            date,
          },
        })),

      setSelectedFlights: (flights) => {
        const { selectedType } = get();
        const newFlights =
          selectedType === 'direct' ? flights.slice(0, 1) : flights.slice(0, 4);
        set({ selectedFlights: newFlights });
      },

      setFlightSegments: (segments) =>
        set({ flightSegments: segments.slice(0, 4) }),

      setDirectFlight: (flight) => set({ directFlight: flight }),

      validateFlightSelection: () => {
        const state = get();
        const {
          selectedType,
          currentPhase,
          directFlight,
          selectedFlights,
          selectedDate,
        } = state;

        let isValid = false;

        if (selectedType === 'direct') {
          if (currentPhase === 3) {
            isValid =
              !!directFlight.fromLocation &&
              !!directFlight.toLocation &&
              !!selectedDate &&
              selectedFlights.length === 1;
          } else {
            isValid = !!directFlight.fromLocation && !!directFlight.toLocation;
          }
        } else {
          if (currentPhase === 3) {
            isValid =
              selectedFlights.length >= 2 &&
              selectedFlights.length <= 4 &&
              !!selectedDate;
          } else {
            isValid = state.flightSegments.length >= 2;
          }
        }

        set({ validationState: { isFlightValid: isValid } });
      },

      setFlightState: (newState) => set(newState),
    }),
    {
      name: 'flight-storage',
    }
  )
);
