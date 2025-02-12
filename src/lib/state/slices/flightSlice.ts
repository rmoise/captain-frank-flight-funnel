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

    // Get the flight type from localStorage if available
    let selectedType = updates.selectedType || state.selectedType;
    if (typeof window !== 'undefined') {
      const flightSelectionState = localStorage.getItem('flightSelectionState');
      if (flightSelectionState) {
        try {
          const { selectedType: storedType } = JSON.parse(flightSelectionState);
          if (storedType) {
            selectedType = storedType;
          }
        } catch (error) {
          console.error('Error parsing flight selection state:', error);
        }
      }
    }

    // Handle flight type and segments properly during rehydration
    let updatedSegments = updates.flightSegments || state.flightSegments;

    if (
      selectedType === 'multi' &&
      (!updatedSegments || updatedSegments.length < 2)
    ) {
      // Ensure we have at least 2 segments for multi-city
      const existingFlights = updates.selectedFlights || state.selectedFlights;
      if (existingFlights && existingFlights.length > 1) {
        // Create segments from existing flights
        updatedSegments = existingFlights.map((flight) => ({
          fromLocation: {
            value: flight.departureCity,
            label: flight.departureCity,
            description: flight.departureAirport,
            city: flight.departureCity,
            dropdownLabel: `${flight.departureAirport} (${flight.departureCity})`,
          },
          toLocation: {
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport,
            city: flight.arrivalCity,
            dropdownLabel: `${flight.arrivalAirport} (${flight.arrivalCity})`,
          },
          date: flight.date ? new Date(flight.date) : null,
          selectedFlight: flight,
        }));
      } else {
        // Initialize with empty segments
        updatedSegments = [
          {
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          },
          {
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          },
        ];
      }
    }

    const newState = {
      ...state,
      ...updates,
      selectedType,
      flightSegments: updatedSegments,
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

  setSelectedType: (type: 'direct' | 'multi') => {
    const state = get();
    if (state.selectedType === type) return;

    // Save flight type to localStorage
    if (typeof window !== 'undefined') {
      const flightSelectionState = localStorage.getItem('flightSelectionState');
      const currentState = flightSelectionState
        ? JSON.parse(flightSelectionState)
        : {};
      localStorage.setItem(
        'flightSelectionState',
        JSON.stringify({
          ...currentState,
          selectedType: type,
          timestamp: Date.now(),
        })
      );
    }

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
      // For multi-city mode
      const existingFlights = state.selectedFlights;
      if (existingFlights.length > 1) {
        // If we have multiple flights selected, use them to create segments
        newState.flightSegments = existingFlights.map((flight) => ({
          fromLocation: {
            value: flight.departureCity,
            label: flight.departureCity,
            description: flight.departureAirport,
            city: flight.departureCity,
            dropdownLabel: `${flight.departureAirport} (${flight.departureCity})`,
          },
          toLocation: {
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport,
            city: flight.arrivalCity,
            dropdownLabel: `${flight.arrivalAirport} (${flight.arrivalCity})`,
          },
          date: flight.date ? new Date(flight.date) : null,
          selectedFlight: flight,
        }));
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
      }
      newState.currentSegmentIndex = 0;
      newState.selectedFlight =
        existingFlights[0] || state.directFlight.selectedFlight;
      newState.selectedFlights =
        existingFlights.length > 0
          ? existingFlights
          : state.directFlight.selectedFlight
            ? [state.directFlight.selectedFlight]
            : [];
    }

    set(() => newState);
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

  setSelectedFlights: (flights: Flight[]) =>
    set((state) => {
      // Clean and validate flights
      const cleanedFlights = flights.filter((flight): flight is Flight => {
        if (!flight) return false;
        return (
          typeof flight.id === 'string' &&
          typeof flight.flightNumber === 'string' &&
          typeof flight.airline === 'string' &&
          typeof flight.departureCity === 'string' &&
          typeof flight.arrivalCity === 'string' &&
          typeof flight.departureTime === 'string' &&
          typeof flight.arrivalTime === 'string' &&
          typeof flight.departure === 'string' &&
          typeof flight.arrival === 'string' &&
          typeof flight.duration === 'string' &&
          typeof flight.date === 'string'
        );
      });

      // Update segments based on selected flights
      const updatedSegments = state.flightSegments.map((segment, index) => {
        const matchingFlight = cleanedFlights[index];
        if (!matchingFlight) return segment;

        // Convert the date string to a Date object, preserving the exact date
        const flightDate = new Date(matchingFlight.date);
        flightDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

        return {
          ...segment,
          selectedFlight: matchingFlight,
          fromLocation: {
            value: matchingFlight.departureCity,
            label: matchingFlight.departureCity,
            description:
              matchingFlight.departureAirport || matchingFlight.departureCity,
            city: matchingFlight.departureCity,
          },
          toLocation: {
            value: matchingFlight.arrivalCity,
            label: matchingFlight.arrivalCity,
            description:
              matchingFlight.arrivalAirport || matchingFlight.arrivalCity,
            city: matchingFlight.arrivalCity,
          },
          date: flightDate,
        };
      });

      const newState = {
        ...state,
        selectedFlights: cleanedFlights,
        flightSegments: updatedSegments,
        selectedFlight: cleanedFlights[state.currentSegmentIndex] || null,
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
    }),

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
