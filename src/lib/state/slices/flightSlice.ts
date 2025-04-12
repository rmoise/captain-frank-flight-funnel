import type { Flight } from "@/types/store";
import type { LocationLike } from "@/types/location";
import { validateFlightSelection } from "../validationHelpers";
import type {
  StoreState,
  FlightSegment,
  ValidationStep,
  FlightSlice as CoreFlightSlice,
} from "../types";
import type { ValidationStore } from "./validationSlice";

// Use the core FlightSlice type to ensure consistency
export type FlightSlice = CoreFlightSlice;

// Helper function to create a type-safe state update
const createStateUpdate = (
  state: ValidationStore & FlightSlice,
  updates: Partial<FlightSlice>
): Partial<StoreState> => {
  const fromLocationValue = asLocationLike(
    updates.fromLocation ?? state.fromLocation
  );
  const toLocationValue = asLocationLike(
    updates.toLocation ?? state.toLocation
  );

  // Process segments to ensure correct typing
  const processedSegments = (
    updates.flightSegments || state.flightSegments
  ).map((segment) => ({
    ...segment,
    fromLocation: asLocationLike(segment.fromLocation),
    toLocation: asLocationLike(segment.toLocation),
    date: segment.date instanceof Date ? segment.date : null,
    selectedFlight: segment.selectedFlight,
  }));

  const newState = {
    ...state,
    ...updates,
    flightSegments: processedSegments,
    fromLocation: fromLocationValue,
    toLocation: toLocationValue,
    selectedDate:
      updates.selectedDate instanceof Date
        ? updates.selectedDate
        : state.selectedDate,
    _lastUpdate: Date.now(),
    hasValidLocations: !!(fromLocationValue && toLocationValue),
    hasValidFlights: !!(
      (updates.selectedFlights && updates.selectedFlights.length > 0) ||
      state.selectedFlights.length > 0
    ),
  } as unknown as Partial<StoreState>;

  const isValid = validateFlightSelection(state);
  const validationUpdate = createValidationUpdate(
    state,
    isValid,
    state.currentPhase
  );

  return {
    ...newState,
    ...validationUpdate,
  };
};

// Helper function to create a type-safe validation state update
const createValidationUpdate = (
  state: ValidationStore & FlightSlice,
  isValid: boolean,
  currentPhase: ValidationStep
): Partial<StoreState> => {
  return {
    validationState: {
      ...state.validationState,
      isFlightValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        [currentPhase]: isValid,
      },
    },
    completedSteps: isValid
      ? (Array.from(new Set([...state.completedSteps, currentPhase])).sort(
          (a, b) => a - b
        ) as ValidationStep[])
      : (state.completedSteps.filter(
          (step) => step !== currentPhase
        ) as ValidationStep[]),
  } as Partial<StoreState>;
};

// Helper function to safely cast a location to the correct type
const asLocationLike = (location: unknown): (string & LocationLike) | null => {
  if (!location) return null;

  // If it's already a string & LocationLike object, return as is
  if (
    typeof location === "object" &&
    location !== null &&
    "value" in location &&
    typeof (location as LocationLike).value === "string"
  ) {
    const typedLocation = location as LocationLike;
    const value =
      typedLocation.value ||
      typedLocation.label ||
      typedLocation.description ||
      "";
    return {
      ...typedLocation,
      value,
      toString: () => value,
      valueOf: () => value,
    } as string & LocationLike;
  }

  // If it's a string, try to parse it as JSON first
  if (typeof location === "string") {
    try {
      const parsed = JSON.parse(location);
      if (typeof parsed === "object" && parsed !== null && "value" in parsed) {
        return asLocationLike(parsed); // Recursively handle parsed object
      }
      // If parsing succeeds but doesn't give us a location object,
      // treat the original string as a location value
    } catch (e) {
      // If parsing fails, treat the string as a location value
    }

    // Handle string as direct value
    return {
      value: location,
      label: location,
      description: location,
      city: location,
      toString: () => location,
      valueOf: () => location,
    } as string & LocationLike;
  }

  return null;
};

// Helper function to process location data consistently
export const processLocation = (
  location: unknown
): (string & LocationLike) | null => {
  if (!location) return null;

  // If it's already a string & LocationLike object, ensure all properties are preserved
  if (
    typeof location === "object" &&
    location !== null &&
    "value" in location &&
    typeof (location as LocationLike).value === "string"
  ) {
    const typedLocation = location as LocationLike;
    const value = typedLocation.value || "";

    // Extract all original properties we need to preserve
    const {
      label = value,
      description = value,
      city = value,
      dropdownLabel = value,
      // Extract any other LocationLike properties
      ...otherProps
    } = typedLocation;

    // Instead of using Object.assign on a String object, create a custom object
    // with all required properties that also behaves like a string
    const safeProps = Object.entries(otherProps)
      .filter(([key]) => !["toString", "valueOf"].includes(key))
      .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

    // Create a wrapper object that will convert to string when needed
    const result = Object.create(String.prototype, {
      ...Object.getOwnPropertyDescriptors({
        ...safeProps,
        value,
        label,
        description,
        city,
        dropdownLabel,
        length: { value: value.length, writable: false, configurable: true },
        toString: function () {
          return value;
        },
        valueOf: function () {
          return value;
        },
      }),
      // Define primitive value for the string behavior
      [Symbol.toPrimitive]: {
        value: function () {
          return value;
        },
        writable: true,
        configurable: true,
      },
    });

    // Log the processed location
    console.log("=== processLocation - Object Input ===", {
      input: location,
      result,
      timestamp: new Date().toISOString(),
    });

    return result as string & LocationLike;
  }

  // If it's a string, handle it appropriately
  if (typeof location === "string") {
    const value = location.trim();

    // If it's a simple airport code, create a LocationLike object with proper string behavior
    if (/^[A-Z]{3}$/.test(value)) {
      const result = Object.create(String.prototype, {
        ...Object.getOwnPropertyDescriptors({
          value,
          label: value,
          description: value,
          city: value,
          dropdownLabel: value,
          length: { value: value.length, writable: false, configurable: true },
          toString: {
            value: function () {
              return value;
            },
            writable: true,
            configurable: true,
          },
          valueOf: {
            value: function () {
              return value;
            },
            writable: true,
            configurable: true,
          },
        }),
        [Symbol.toPrimitive]: {
          value: function () {
            return value;
          },
          writable: true,
          configurable: true,
        },
      });

      // Log the processed location
      console.log("=== processLocation - Airport Code Input ===", {
        input: location,
        result,
        timestamp: new Date().toISOString(),
      });

      return result as string & LocationLike;
    }

    // Only try to parse if it looks like a JSON string
    if (value.startsWith("{")) {
      try {
        const parsed = JSON.parse(value);
        return processLocation(parsed); // Recursively process parsed object
      } catch (e) {
        console.error("Error parsing location string:", e);
      }
    }

    // If all else fails, create a basic location object from the string
    const result = Object.create(String.prototype, {
      ...Object.getOwnPropertyDescriptors({
        value,
        label: value,
        description: value,
        city: value,
        dropdownLabel: value,
        length: { value: value.length, writable: false, configurable: true },
        toString: {
          value: function () {
            return value;
          },
          writable: true,
          configurable: true,
        },
        valueOf: {
          value: function () {
            return value;
          },
          writable: true,
          configurable: true,
        },
      }),
      [Symbol.toPrimitive]: {
        value: function () {
          return value;
        },
        writable: true,
        configurable: true,
      },
    });

    // Log the processed location
    console.log("=== processLocation - String Input ===", {
      input: location,
      result,
      timestamp: new Date().toISOString(),
    });

    return result as string & LocationLike;
  }

  // Log unhandled input type
  console.warn("=== processLocation - Unhandled Input Type ===", {
    input: location,
    type: typeof location,
    timestamp: new Date().toISOString(),
  });

  return null;
};

export interface FlightActions {
  setFlightState: (updates: Partial<FlightSlice>) => void;
  setSelectedType: (type: "direct" | "multi") => void;
  setFromLocation: (location: LocationLike | null) => void;
  setToLocation: (location: LocationLike | null) => void;
  setSelectedDate: (date: Date | null) => void;
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
  set: (
    fn: (state: ValidationStore & FlightSlice) => Partial<StoreState>
  ) => void,
  get: () => ValidationStore & FlightSlice
): FlightActions => ({
  setFlightState: (updates) => {
    const state = get();
    const fromLocationValue = asLocationLike(updates.fromLocation);
    const toLocationValue = asLocationLike(updates.toLocation);

    // Process segments to ensure correct typing
    const processedSegments = (
      updates.flightSegments || state.flightSegments
    ).map((segment) => ({
      ...segment,
      fromLocation: asLocationLike(segment.fromLocation),
      toLocation: asLocationLike(segment.toLocation),
      date: segment.date,
      selectedFlight: segment.selectedFlight,
    }));

    const newState = {
      ...updates,
      flightSegments: processedSegments,
      fromLocation: fromLocationValue,
      toLocation: toLocationValue,
      _lastUpdate: Date.now(),
      hasValidLocations: !!(fromLocationValue && toLocationValue),
      hasValidFlights: !!(
        updates.selectedFlights && updates.selectedFlights.length > 0
      ),
      validationState: state.validationState,
      completedSteps: state.completedSteps,
    } as Partial<StoreState>;

    const isValid = validateFlightSelection(state);
    const validationUpdate = createValidationUpdate(
      state,
      isValid,
      state.currentPhase
    );

    set(() => ({
      ...newState,
      ...validationUpdate,
    }));
  },

  setSelectedType: (type) => {
    const state = get();
    set(() => createStateUpdate(state, { selectedType: type }));
  },

  setFromLocation: (location: LocationLike | null) => {
    const state = get();
    const locationValue = asLocationLike(location);
    set(() => createStateUpdate(state, { fromLocation: locationValue }));
  },

  setToLocation: (location: LocationLike | null) => {
    const state = get();
    const locationValue = asLocationLike(location);
    set(() => createStateUpdate(state, { toLocation: locationValue }));
  },

  setSelectedDate: (date: Date | null) => {
    const state = get();
    set(() => createStateUpdate(state, { selectedDate: date }));
  },

  setSelectedFlight: (flight) => {
    const state = get();

    if (state.selectedType === "direct") {
      // Process the direct flight case
      const updatedDirectFlight = {
        ...state.directFlight,
        selectedFlight: flight,
      };

      // Only update fromLocation and toLocation if they don't exist or don't match the flight
      if (flight) {
        // Only update the location if needed
        if (
          !state.directFlight.fromLocation ||
          state.directFlight.fromLocation.value !== flight.departureCity
        ) {
          updatedDirectFlight.fromLocation = processLocation({
            value: flight.departureCity,
            label: flight.departureCity,
            description: flight.departureAirport || flight.departureCity,
            city: flight.departureCity,
          });
        }

        // Only update the location if needed
        if (
          !state.directFlight.toLocation ||
          state.directFlight.toLocation.value !== flight.arrivalCity
        ) {
          updatedDirectFlight.toLocation = processLocation({
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport || flight.arrivalCity,
            city: flight.arrivalCity,
          });
        }
      }

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

      // Create the updated segment
      const updatedSegment = {
        ...currentSegment,
        selectedFlight: flight,
      };

      // Only update the locations if a flight is selected and the locations don't match
      if (flight) {
        // Only update the fromLocation if needed
        if (
          !currentSegment.fromLocation ||
          currentSegment.fromLocation.value !== flight.departureCity
        ) {
          updatedSegment.fromLocation = processLocation({
            value: flight.departureCity,
            label: flight.departureCity,
            description: flight.departureAirport || flight.departureCity,
            city: flight.departureCity,
          });
        }

        // Only update the toLocation if needed
        if (
          !currentSegment.toLocation ||
          currentSegment.toLocation.value !== flight.arrivalCity
        ) {
          updatedSegment.toLocation = processLocation({
            value: flight.arrivalCity,
            label: flight.arrivalCity,
            description: flight.arrivalAirport || flight.arrivalCity,
            city: flight.arrivalCity,
          });
        }
      }

      updatedFlightSegments[state.currentSegmentIndex] = updatedSegment;

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
          ? (Array.from(
              new Set([...state.completedSteps, 3 as ValidationStep])
            ).sort((a, b) => a - b) as ValidationStep[])
          : (state.completedSteps.filter(
              (step) => step !== 3
            ) as ValidationStep[]),
      }));
    }
  },

  setSelectedFlights: (flights: Flight[]) =>
    set((state) => {
      // Clean and validate flights
      const cleanedFlights = flights.filter((flight): flight is Flight => {
        if (!flight) return false;
        return (
          typeof flight.id === "string" &&
          typeof flight.flightNumber === "string" &&
          typeof flight.airline === "string" &&
          typeof flight.departureCity === "string" &&
          typeof flight.arrivalCity === "string" &&
          typeof flight.departureTime === "string" &&
          typeof flight.arrivalTime === "string" &&
          typeof flight.departure === "string" &&
          typeof flight.arrival === "string" &&
          typeof flight.duration === "string" &&
          typeof flight.date === "string"
        );
      });

      // Update segments based on selected flights
      const updatedSegments = state.flightSegments.map((segment, index) => {
        const matchingFlight = cleanedFlights[index];
        if (!matchingFlight) return segment;

        // Convert the date string to a Date object, preserving the exact date
        const flightDate = new Date(matchingFlight.date);
        flightDate.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues

        // Process fromLocation and toLocation using existing utility to maintain consistency
        // Use existing segment locations if they match the flight's departure/arrival cities
        const fromLocation =
          segment.fromLocation &&
          segment.fromLocation.value === matchingFlight.departureCity
            ? segment.fromLocation // Keep existing location if matches
            : processLocation({
                value: matchingFlight.departureCity,
                label: matchingFlight.departureCity,
                description:
                  matchingFlight.departureAirport ||
                  matchingFlight.departureCity,
                city: matchingFlight.departureCity,
              });

        const toLocation =
          segment.toLocation &&
          segment.toLocation.value === matchingFlight.arrivalCity
            ? segment.toLocation // Keep existing location if matches
            : processLocation({
                value: matchingFlight.arrivalCity,
                label: matchingFlight.arrivalCity,
                description:
                  matchingFlight.arrivalAirport || matchingFlight.arrivalCity,
                city: matchingFlight.arrivalCity,
              });

        return {
          ...segment,
          selectedFlight: matchingFlight,
          fromLocation,
          toLocation,
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
    if (state.selectedType === "multi") {
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

  setDirectFlight: (flight: Partial<FlightSegment>) => {
    const state = get();

    // Only process locations if they've changed
    const fromLocationValue =
      flight.fromLocation !== undefined && flight.fromLocation !== null
        ? state.directFlight.fromLocation &&
          typeof flight.fromLocation === "object" &&
          "value" in flight.fromLocation &&
          flight.fromLocation.value !== null &&
          state.directFlight.fromLocation.value === flight.fromLocation.value
          ? state.directFlight.fromLocation // Keep existing if values match
          : asLocationLike(flight.fromLocation)
        : state.directFlight.fromLocation;

    const toLocationValue =
      flight.toLocation !== undefined && flight.toLocation !== null
        ? state.directFlight.toLocation &&
          typeof flight.toLocation === "object" &&
          "value" in flight.toLocation &&
          flight.toLocation.value !== null &&
          state.directFlight.toLocation.value === flight.toLocation.value
          ? state.directFlight.toLocation // Keep existing if values match
          : asLocationLike(flight.toLocation)
        : state.directFlight.toLocation;

    const updatedDirectFlight = {
      ...state.directFlight,
      ...flight,
      fromLocation: fromLocationValue,
      toLocation: toLocationValue,
    };

    set(() =>
      createStateUpdate(state, {
        directFlight: updatedDirectFlight,
        _lastUpdate: Date.now(),
      })
    );
  },
});

export const initialFlightState: FlightSlice = {
  selectedType: "direct",
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
  originalFlights: [],
  selectedFlight: null,
  flightDetails: null,
  delayDuration: null,
  _lastUpdate: undefined,
  isFlightValid: false,
  _lastValidation: undefined,
};
