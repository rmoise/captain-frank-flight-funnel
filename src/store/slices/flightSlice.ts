import { BaseLocation } from "@/types/shared/location";
import { FlightLocation } from "@/types/shared/flight";
import { StateCreator } from "zustand";
import {
  Store,
  FlightState,
  FlightActions,
  Flight,
  SelectedFlight,
  FlightType,
  FlightStatus,
  FlightSegment,
} from "../types";
import { ValidationPhase } from "@/types/shared/validation";

// --- Add Helper for Placeholder Location ---
const createPlaceholderLocationInternal = (
  idSuffix: string
): FlightLocation => ({
  id: `placeholder-loc-${idSuffix}`,
  name: "",
  code: "",
  city: "",
  country: "",
  timezone: "",
  type: "airport",
});
// ----------------------------------------

// Add utility function for processing locations
export const processLocation = (
  location: BaseLocation | FlightLocation | string | null
): FlightLocation | null => {
  if (!location) return null;

  // If it's already a FlightLocation or BaseLocation (check for required fields)
  if (
    typeof location === "object" &&
    location !== null &&
    "id" in location &&
    "name" in location
  ) {
    // Ensure it conforms to FlightLocation, adding defaults if needed
    return {
      id: location.id,
      name: location.name,
      code: "code" in location ? location.code : "", // BaseLocation has code
      city: "city" in location ? location.city : "",
      country: "country" in location ? location.country : "",
      timezone: "timezone" in location ? location.timezone : "",
      type: "type" in location ? location.type : "airport",
      iata: "iata" in location ? location.iata : undefined, // FlightLocation specifics
      icao: "icao" in location ? location.icao : undefined,
      // Add other FlightLocation fields if necessary
    };
  }

  // If it's a string, create a minimal FlightLocation
  if (typeof location === "string") {
    const value = location.trim();
    // Create a basic structure. More info might be needed elsewhere.
    return {
      id: value, // Use string as ID placeholder
      name: value,
      code: value, // Use string as code placeholder
      city: "",
      country: "",
      timezone: "",
      type: "airport",
    };
  }

  return null;
};

const initialState: FlightState = {
  type: "direct",
  segments: [],
  selectedFlights: {},
  searchResults: [],
  currentSegmentIndex: 0,
  lastUpdate: Date.now(),
  currentFlight: null,
  flightHistory: [],
  // Add tracking for original flights
  originalFlights: {},
  // Add phase data container
  phaseData: {},
};

export const createFlightSlice: StateCreator<Store, [], [], FlightActions> = (
  set
) => ({
  setFlightType: (type: FlightType) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        type,
        lastUpdate: Date.now(),
      },
    }));
  },

  addFlightSegment: (segment: FlightSegment) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        segments: [...state.flight.segments, segment],
        lastUpdate: Date.now(),
      },
    }));
  },

  updateFlightSegment: (index: number, segment: Partial<FlightSegment>) => {
    console.log(
      `🔧 [FlightSlice] updateFlightSegment called for index ${index}:`,
      {
        updateData: segment,
        updateKeys: Object.keys(segment),
        departureTimeInUpdate: segment.departureTime,
        departureTimeType: typeof segment.departureTime,
        isUndefined: segment.departureTime === undefined,
        // NEW: Debug origin/destination updates
        originUpdate: segment.origin
          ? {
              code: segment.origin.code,
              name: segment.origin.name,
              iata: segment.origin.iata,
            }
          : null,
        destinationUpdate: segment.destination
          ? {
              code: segment.destination.code,
              name: segment.destination.name,
              iata: segment.destination.iata,
            }
          : null,
      }
    );

    return set((state) => {
      const segments = [...state.flight.segments];
      console.log(`🔧 [FlightSlice] Current segment ${index} before update:`, {
        currentDepartureTime: segments[index]?.departureTime,
        currentDepartureTimeType: typeof segments[index]?.departureTime,
        wholeSegment: segments[index],
        // NEW: Debug current origin/destination
        currentOrigin: segments[index]?.origin
          ? {
              code: segments[index].origin.code,
              name: segments[index].origin.name,
              iata: segments[index].origin.iata,
            }
          : null,
        currentDestination: segments[index]?.destination
          ? {
              code: segments[index].destination.code,
              name: segments[index].destination.name,
              iata: segments[index].destination.iata,
            }
          : null,
      });

      // Ensure segments[index] exists before trying to spread it
      if (segments[index]) {
        // Create the updated segment by merging, but handle undefined values explicitly
        const updatedSegment = { ...segments[index] };

        // For each property in the segment update, handle undefined explicitly
        Object.keys(segment).forEach((key) => {
          const value = segment[key as keyof FlightSegment];
          console.log(`🔧 [FlightSlice] Processing key "${key}" with value:`, {
            key,
            value,
            valueType: typeof value,
            isUndefined: value === undefined,
          });

          if (value === undefined) {
            // Explicitly clear undefined values instead of ignoring them
            if (key === "departureTime") {
              console.log(
                `🔧 [FlightSlice] CLEARING departureTime - setting to empty string`
              );
              updatedSegment.departureTime = ""; // Clear with empty string instead of undefined
            } else if (key === "selectedFlight") {
              updatedSegment.selectedFlight = undefined;
              // Also clear flight-related fields when selectedFlight is cleared
              updatedSegment.flightNumber = "";
              updatedSegment.airline = { name: "", code: "" };
              updatedSegment.arrivalTime = "";
              updatedSegment.duration = "";
              updatedSegment.stops = 0;
              updatedSegment.price = undefined;
            } else {
              (updatedSegment as any)[key] = undefined;
            }
          } else {
            // Set non-undefined values normally
            console.log(
              `🔧 [FlightSlice] Setting non-undefined value for "${key}":`,
              value
            );
            (updatedSegment as any)[key] = value;
          }
        });

        console.log(`🔧 [FlightSlice] Final updated segment ${index}:`, {
          departureTime: updatedSegment.departureTime,
          departureTimeType: typeof updatedSegment.departureTime,
          wholeUpdatedSegment: updatedSegment,
        });

        segments[index] = updatedSegment;
      } else if (index === 0) {
        // Handle case where segments array is empty and we're updating index 0
        // Create a new segment object from the partial update
        segments[index] = {
          // Provide default values for a FlightSegment
          id: `new-seg-${Date.now()}`, // Example default ID
          origin: createPlaceholderLocationInternal("origin-default"),
          destination: createPlaceholderLocationInternal("destination-default"),
          departureTime: "",
          arrivalTime: "",
          flightNumber: "",
          airline: { name: "", code: "" }, // Default airline object
          duration: "",
          stops: 0,
          // Now spread the actual update
          ...segment,
        };
      } else {
        // Handle potential out-of-bounds index for non-zero index gracefully
        console.error(
          `Attempted to update non-existent segment at index ${index}`
        );
        // Optionally, you could choose to not update or throw an error
        // For now, we'll just return the state unchanged in this edge case
        return state;
      }

      const newState = {
        flight: {
          ...state.flight,
          segments,
          lastUpdate: Date.now(),
        },
      };

      console.log(`🔧 [FlightSlice] New state after update:`, {
        segmentIndex: index,
        newSegments: newState.flight.segments,
        targetSegmentDepartureTime:
          newState.flight.segments[index]?.departureTime,
        targetSegmentDepartureTimeType:
          typeof newState.flight.segments[index]?.departureTime,
      });

      return newState;
    });
  },

  removeFlightSegment: (index: number) => {
    console.log(
      `[FlightSlice] removeFlightSegment action called for index: ${index}`
    );
    return set((state) => {
      console.log(
        `[FlightSlice] Segments BEFORE filter: ${state.flight.segments.length}`
      );
      const segments = state.flight.segments.filter((_, i) => i !== index);
      console.log(`[FlightSlice] Segments AFTER filter: ${segments.length}`);
      return {
        flight: {
          ...state.flight,
          segments, // Assign the new array
          lastUpdate: Date.now(),
        },
      };
    });
  },

  setSelectedFlights: (flights: Flight[]) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        selectedFlights: {
          ...state.flight.selectedFlights,
          [state.flight.currentSegmentIndex]: flights,
        },
        lastUpdate: Date.now(),
      },
    }));
  },

  setCurrentSegmentIndex: (index: number) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        currentSegmentIndex: index,
        lastUpdate: Date.now(),
      },
    }));
  },

  setCurrentFlight: (flight: Flight) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        currentFlight: flight,
        lastUpdate: Date.now(),
      },
    }));
  },

  addToFlightHistory: (flight: Flight) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        flightHistory: [...state.flight.flightHistory, flight],
        lastUpdate: Date.now(),
      },
    }));
  },

  clearFlights: () => {
    return set((state) => ({
      flight: {
        ...state.flight,
        segments: [],
        selectedFlights: {},
        searchResults: [],
        currentSegmentIndex: 0,
        lastUpdate: Date.now(),
      },
    }));
  },

  setSegments: (newSegments: FlightSegment[]) => {
    console.log(
      `[FlightSlice] setSegments action called with ${newSegments.length} segments`
    );
    return set((state) => ({
      flight: {
        ...state.flight,
        segments: newSegments, // Directly replace the segments array
        lastUpdate: Date.now(),
      },
    }));
  },

  setOriginalFlights: (flights: Flight[]) => {
    console.log(
      "[FlightSlice] Setting original flights:",
      flights.map((f) => ({ id: f.id, flightNumber: f.flightNumber }))
    );
    // Store the flights under the key for the first segment (index 0)
    return set((state) => ({
      flight: {
        ...state.flight,
        // Assign as a record with key 0 - these are the flights from Phase 3
        originalFlights: {
          ...state.flight.originalFlights, // Preserve other segment flights if any
          0: flights,
        },
        lastUpdate: Date.now(),
      },
    }));
  },

  setPhaseData: (phase: ValidationPhase, data: any) => {
    return set((state) => ({
      flight: {
        ...state.flight,
        phaseData: {
          ...state.flight.phaseData,
          [phase]: data,
        },
        lastUpdate: Date.now(),
      },
    }));
  },
});
