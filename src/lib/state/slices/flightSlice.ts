import type { Flight } from '@/types/store';
import type { LocationLike, Location } from '@/types/location';
import { validateFlightSelection } from '../validationHelpers';
import type { StoreState, FlightSegment } from '../types';
import type { ValidationStore } from './validationSlice';

const isLocation = (value: unknown): value is Location => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'value' in value &&
    typeof (value as Location).value === 'string'
  );
};

export interface FlightSlice {
  selectedType: 'direct' | 'multi';
  directFlight: FlightSegment;
  flightSegments: FlightSegment[];
  currentSegmentIndex: number;
  fromLocation: string | null;
  toLocation: string | null;
  selectedDate: string | null;
  selectedFlights: Flight[];
  selectedFlight: Flight | null;
  flightDetails: Flight | null;
  delayDuration: number | null;
  _lastUpdate?: number;
  currentPhase: number;
  isSearchModalOpen?: boolean;
  searchTerm?: string;
  displayedFlights: Flight[];
  loading: boolean;
  error: string | null;
  locationError: string | null;
  hasValidLocations: boolean;
  hasValidFlights: boolean;
}

export const initialFlightState: FlightSlice = {
  selectedType: 'direct',
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: null,
    selectedFlight: null,
  },
  flightSegments: [],
  currentSegmentIndex: 0,
  fromLocation: null,
  toLocation: null,
  selectedDate: null,
  selectedFlights: [],
  selectedFlight: null,
  flightDetails: null,
  delayDuration: null,
  currentPhase: 0,
  isSearchModalOpen: false,
  searchTerm: '',
  displayedFlights: [],
  loading: false,
  error: null,
  locationError: null,
  hasValidLocations: false,
  hasValidFlights: false,
};

export interface FlightActions {
  setFlightState: (updates: Partial<FlightSlice>) => void;
  setSelectedType: (type: 'direct' | 'multi') => void;
  setFromLocation: (location: LocationLike | null) => void;
  setToLocation: (location: LocationLike | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setFlightSegments: (segments: FlightSegment[]) => void;
  setDirectFlight: (flight: Partial<FlightSegment>) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSearchModalOpen: (open: boolean) => void;
  setSearchTerm: (term: string) => void;
  setDisplayedFlights: (flights: Flight[]) => void;
  setFlightSearchLoading: (loading: boolean) => void;
  setFlightSearchError: (error: string | null) => void;
  updateFlightDetails: (flight: Flight) => void;
  setLocationError: (error: string | null) => void;
  clearLocationError: () => void;
}

export const createFlightSlice = (
  set: (fn: (state: ValidationStore) => Partial<StoreState>) => void,
  get: () => ValidationStore
): FlightActions => ({
  setFlightState: (updates) => {
    const state = get();
    const fromLocationValue = isLocation(updates.fromLocation)
      ? updates.fromLocation.value
      : (updates.fromLocation as string | null);
    const toLocationValue = isLocation(updates.toLocation)
      ? updates.toLocation.value
      : (updates.toLocation as string | null);

    const newState = {
      ...state,
      ...updates,
      fromLocation: fromLocationValue,
      toLocation: toLocationValue,
      _lastUpdate: Date.now(),
      hasValidLocations: !!(fromLocationValue && toLocationValue),
      hasValidFlights: !!(
        updates.selectedFlights && updates.selectedFlights.length > 0
      ),
    };

    // If we're restoring state, preserve the validation state
    if ('_isRestoring' in state && state._isRestoring) {
      set(() => ({
        ...newState,
      }));
      return;
    }

    const isValid = validateFlightSelection(newState);

    set(() => ({
      ...newState,
      validationState: {
        ...state.validationState,
        isFlightValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          [state.currentPhase]: isValid,
        },
      },
      completedSteps: isValid
        ? Array.from(
            new Set([...state.completedSteps, state.currentPhase])
          ).sort((a, b) => a - b)
        : state.completedSteps.filter((step) => step !== state.currentPhase),
    }));
  },

  setSelectedType: (type) => {
    const state = get();
    if (state.selectedType === type) return;

    const newState = {
      ...state,
      selectedType: type,
      _lastUpdate: Date.now(),
    };

    if (type === 'direct') {
      const firstSegment = state.flightSegments[0];
      newState.directFlight = {
        fromLocation:
          firstSegment?.fromLocation || state.directFlight.fromLocation,
        toLocation: firstSegment?.toLocation || state.directFlight.toLocation,
        date: firstSegment?.date || state.directFlight.date,
        selectedFlight:
          firstSegment?.selectedFlight || state.directFlight.selectedFlight,
      };
      newState.selectedFlight = newState.directFlight.selectedFlight;
      newState.selectedFlights = newState.directFlight.selectedFlight
        ? [newState.directFlight.selectedFlight]
        : [];
    } else {
      // Initialize with 2 segments in multi mode
      newState.flightSegments = [
        {
          fromLocation: state.directFlight.fromLocation,
          toLocation: state.directFlight.toLocation,
          date: state.directFlight.date,
          selectedFlight: state.directFlight.selectedFlight,
        },
        {
          fromLocation: null,
          toLocation: null,
          date: null,
          selectedFlight: null,
        },
      ];
      newState.currentSegmentIndex = 0;
      newState.selectedFlight = state.directFlight.selectedFlight;
      newState.selectedFlights = state.directFlight.selectedFlight
        ? [state.directFlight.selectedFlight]
        : [];
    }

    if (state.currentPhase === 1) {
      const isValid = validateFlightSelection(newState);
      newState.validationState = {
        ...state.validationState,
        isFlightValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          1: isValid,
        },
      };

      newState.completedSteps = isValid
        ? Array.from(new Set([...state.completedSteps, 1])).sort(
            (a, b) => a - b
          )
        : state.completedSteps.filter((step) => step !== 1);
    }

    set((state) => {
      const updatedState = {
        ...newState,
      };
      const isValid = validateFlightSelection(updatedState);
      return {
        ...updatedState,
        validationState: {
          ...state.validationState,
          isFlightValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            [state.currentPhase]: isValid,
          },
          [state.currentPhase]: isValid,
        },
        completedSteps: isValid
          ? Array.from(
              new Set([...state.completedSteps, state.currentPhase])
            ).sort((a, b) => a - b)
          : state.completedSteps.filter((step) => step !== state.currentPhase),
      };
    });
  },

  setDirectFlight: (directFlight: Partial<FlightSegment>) => {
    set((state) => {
      const newDirectFlight = {
        ...state.directFlight,
        ...directFlight,
      };

      const fromLocationValue = isLocation(newDirectFlight.fromLocation)
        ? newDirectFlight.fromLocation.value
        : (newDirectFlight.fromLocation as string | null);
      const toLocationValue = isLocation(newDirectFlight.toLocation)
        ? newDirectFlight.toLocation.value
        : (newDirectFlight.toLocation as string | null);

      const newState = {
        ...state,
        directFlight: newDirectFlight,
        fromLocation: fromLocationValue,
        toLocation: toLocationValue,
        _lastUpdate: Date.now(),
      };

      const isValid = validateFlightSelection(newState);

      return {
        ...newState,
        validationState: {
          ...state.validationState,
          isFlightValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            [state.currentPhase]: isValid,
          },
          [state.currentPhase]: isValid,
        },
        completedSteps: isValid
          ? Array.from(
              new Set([...state.completedSteps, state.currentPhase])
            ).sort((a, b) => a - b)
          : state.completedSteps.filter((step) => step !== state.currentPhase),
      };
    });
  },

  setFromLocation: (location: LocationLike | null) => {
    const state = get();
    const value = isLocation(location)
      ? location.value
      : (location as string | null);

    set(() => ({
      fromLocation: value,
      directFlight: {
        ...state.directFlight,
        fromLocation: location,
      },
      hasValidLocations: !!(value && state.toLocation),
      hasValidFlights: !!(
        state.selectedFlights && state.selectedFlights.length > 0
      ),
      _lastUpdate: Date.now(),
    }));
  },

  setToLocation: (location: LocationLike | null) => {
    const state = get();
    const value = isLocation(location)
      ? location.value
      : (location as string | null);

    set(() => ({
      toLocation: value,
      directFlight: {
        ...state.directFlight,
        toLocation: location,
      },
      hasValidLocations: !!(state.fromLocation && value),
      hasValidFlights: !!(
        state.selectedFlights && state.selectedFlights.length > 0
      ),
      _lastUpdate: Date.now(),
    }));
  },

  setSelectedDate: (date) => set((state) => ({ ...state, selectedDate: date })),

  setSelectedFlight: (flight) => {
    const state = get();

    if (state.selectedType === 'direct') {
      const updatedDirectFlight = {
        ...state.directFlight,
        selectedFlight: flight,
      };

      set((state) => ({
        ...state,
        selectedFlight: flight,
        selectedFlights: flight ? [flight] : [],
        directFlight: updatedDirectFlight,
        _lastUpdate: Date.now(),
      }));
    } else {
      const updatedFlightSegments = [...state.flightSegments];
      const currentSegment = updatedFlightSegments[
        state.currentSegmentIndex
      ] || {
        fromLocation: null,
        toLocation: null,
        date: null,
        selectedFlight: null,
      };

      updatedFlightSegments[state.currentSegmentIndex] = {
        ...currentSegment,
        selectedFlight: flight,
      };

      const updatedSelectedFlights = updatedFlightSegments
        .map((segment) => segment.selectedFlight)
        .filter((f): f is Flight => f !== null);

      set((state) => ({
        ...state,
        selectedFlight: flight,
        selectedFlights: updatedSelectedFlights,
        flightSegments: updatedFlightSegments,
        _lastUpdate: Date.now(),
      }));
    }

    if (state.currentPhase === 3) {
      const updatedState = get();
      const isValid = validateFlightSelection(updatedState);
      set((state) => ({
        ...state,
        validationState: {
          ...state.validationState,
          isFlightValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            3: isValid,
          },
          3: isValid,
        },
        completedSteps: isValid
          ? Array.from(new Set([...state.completedSteps, 3])).sort(
              (a, b) => a - b
            )
          : state.completedSteps.filter((step) => step !== 3),
      }));
    }
  },

  setSelectedFlights: (flights) => {
    const state = get();
    if (JSON.stringify(state.selectedFlights) === JSON.stringify(flights))
      return;

    // Filter out null flights and ensure type safety
    const validFlights = flights.filter(
      (flight): flight is Flight =>
        flight !== null && typeof flight === 'object' && 'id' in flight
    );

    // Create a map to track unique flights by ID
    const flightMap = new Map<string, Flight>();
    validFlights.forEach((flight) => {
      if (!flightMap.has(flight.id)) {
        flightMap.set(flight.id, flight);
      }
    });

    const cleanedFlights = Array.from(flightMap.values());

    // Update segments based on selected flights
    let updatedSegments = state.flightSegments;
    if (state.selectedType === 'multi') {
      // In multi mode, create or update segments for each flight
      updatedSegments = cleanedFlights.map((flight) => ({
        fromLocation: {
          value: flight.departureCity,
          label: flight.departureCity,
        },
        toLocation: { value: flight.arrivalCity, label: flight.arrivalCity },
        date: flight.date ? new Date(flight.date) : null,
        selectedFlight: flight,
      }));

      // Ensure minimum 2 segments
      if (updatedSegments.length < 2) {
        updatedSegments = [
          ...updatedSegments,
          ...Array(2 - updatedSegments.length).fill({
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          }),
        ];
      }
    } else {
      // In direct mode, update the direct flight
      const newDirectFlight = {
        ...state.directFlight,
        selectedFlight: cleanedFlights[0] || null,
      };

      set(() => ({
        ...state,
        directFlight: newDirectFlight,
        selectedFlight: newDirectFlight.selectedFlight,
        selectedFlights: newDirectFlight.selectedFlight
          ? [newDirectFlight.selectedFlight]
          : [],
        _lastUpdate: Date.now(),
      }));

      return;
    }

    const newState = {
      ...state,
      selectedFlights: cleanedFlights,
      flightSegments: updatedSegments,
      selectedFlight: cleanedFlights[cleanedFlights.length - 1] || null,
      _lastUpdate: Date.now(),
    };

    const isValid = validateFlightSelection(newState);

    set((state) => ({
      ...newState,
      validationState: {
        ...state.validationState,
        isFlightValid: isValid,
        stepValidation: {
          ...state.validationState.stepValidation,
          [state.currentPhase]: isValid,
        },
        [state.currentPhase]: isValid,
      },
      completedSteps: isValid
        ? Array.from(
            new Set([...state.completedSteps, state.currentPhase])
          ).sort((a, b) => a - b)
        : state.completedSteps.filter((step) => step !== state.currentPhase),
    }));
  },

  setFlightSegments: (segments) => {
    const state = get();
    if (JSON.stringify(state.flightSegments) === JSON.stringify(segments))
      return;

    // Ensure we have at least 2 segments and no more than 4 segments in multi mode
    let updatedSegments = segments;
    if (state.selectedType === 'multi') {
      if (segments.length < 2) {
        updatedSegments = [
          ...segments,
          ...Array(2 - segments.length).fill({
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          }),
        ];
      } else if (segments.length > 4) {
        updatedSegments = segments.slice(0, 4);
      }
    }

    // Map and merge segments with existing data
    const processedSegments = updatedSegments.map((newSegment, index) => {
      const existingSegment = state.flightSegments[index];
      return {
        ...existingSegment,
        ...newSegment,
        fromLocation:
          newSegment.fromLocation || existingSegment?.fromLocation || null,
        toLocation:
          newSegment.toLocation || existingSegment?.toLocation || null,
        date: newSegment.date || existingSegment?.date || null,
        selectedFlight:
          newSegment.selectedFlight || existingSegment?.selectedFlight || null,
      };
    });

    const updatedSelectedFlights = processedSegments
      .map((segment) => segment.selectedFlight)
      .filter((f): f is Flight => f !== null);

    const newState = {
      ...state,
      flightSegments: processedSegments,
      selectedFlights: updatedSelectedFlights,
      selectedFlight: updatedSelectedFlights[state.currentSegmentIndex] || null,
      _lastUpdate: Date.now(),
    };

    // Update validation state
    const isValid = validateFlightSelection(newState);
    newState.validationState = {
      ...state.validationState,
      isFlightValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        [state.currentPhase]: isValid,
      },
      [state.currentPhase]: isValid,
    };

    newState.completedSteps = isValid
      ? Array.from(new Set([...state.completedSteps, state.currentPhase])).sort(
          (a, b) => a - b
        )
      : state.completedSteps.filter((step) => step !== state.currentPhase);

    set(() => ({
      ...newState,
    }));
  },

  setCurrentSegmentIndex: (index) =>
    set((state) => ({ ...state, currentSegmentIndex: index })),

  updateFlightDetails: (flight) => {
    set((state) => ({
      ...state,
      flightDetails: flight,
      _lastUpdate: Date.now(),
    }));
  },

  setSearchModalOpen: (open) =>
    set((state) => ({ ...state, isSearchModalOpen: open })),

  setSearchTerm: (term) => set((state) => ({ ...state, searchTerm: term })),

  setDisplayedFlights: (flights) =>
    set((state) => ({ ...state, displayedFlights: flights })),

  setFlightSearchLoading: (loading) => set((state) => ({ ...state, loading })),

  setFlightSearchError: (error) => set((state) => ({ ...state, error })),

  setLocationError: (error) => {
    set((state) => ({
      ...state,
      locationError: error,
      _lastUpdate: Date.now(),
    }));
  },

  clearLocationError: () => {
    set((state) => ({
      ...state,
      locationError: null,
      _lastUpdate: Date.now(),
    }));
  },
});
