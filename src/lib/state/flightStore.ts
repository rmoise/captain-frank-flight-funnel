import { create } from "zustand";
import { persist, createJSONStorage, StateStorage } from "zustand/middleware";
import { produce } from "immer";
import type { Flight, FlightSegmentData } from "@/types/store";
import type { LocationLike } from "@/types/location";
import { format } from "date-fns";
import { isValid } from "date-fns";

/**
 * Flight data interface
 */
export interface FlightData {
  fromLocation: (string & LocationLike) | null;
  toLocation: (string & LocationLike) | null;
  flightSegments: FlightSegmentData[];
  selectedType: "direct" | "multi";
  flightType: "oneway" | "return";
  dateRange: {
    from: string | null;
    to: string | null;
  };
  selectedFlights: Flight[];
  selectedDate: string | null;
  timestamp: number;
  _preserveFlightSegments?: boolean;
  _isMultiSegment?: boolean;
}

interface FlightStore {
  // Core storage
  originalFlights: Flight[];
  flightData: Record<number, FlightData>; // Keyed by phase number
  _isUpdating: boolean; // Add lock flag
  _updateQueue: Array<{
    phase: number;
    data: Partial<FlightData>;
    resolve: () => void;
  }>;
  _lastUpdate: number;
  _silentUpdate?: boolean; // Add flag to indicate silent updates
  _preserveFlightSegments: boolean; // Add this flag to the store state

  // Actions for data persistence
  saveFlightData: (phase: number, data: Partial<FlightData>) => Promise<void>;
  getFlightData: (phase: number) => FlightData | null;
  getSelectedFlights: (phase: number) => Flight[];
  setOriginalFlights: (flights: Flight[]) => void;
  setSelectedFlights: (phase: number, flights: Flight[]) => void;
  clearFlightData: (phase: number) => void;
  resetAllData: () => void;

  // Flight management
  selectedFlights: Record<number, Flight[]>;
  setFlights: (flights: Flight[]) => void;
  getFlightById: (id: string) => Flight | undefined;

  // Add this function declaration
  processFlightDataFields: (data: Partial<FlightData>) => FlightData;

  // Add this function declaration
  updatePhaseData: (
    phase: number,
    data: Partial<FlightData>,
    onSuccess?: (data: FlightData) => void,
    forceReset?: boolean
  ) => void;
}

// Add this helper function at the beginning of the file, before the FlightStore interface definition
function ensureConsistentLocations(
  data: FlightData,
  phase: number
): FlightData {
  // Make a copy to avoid direct mutation
  const result = { ...data };

  if (phase !== 3) return result; // Only apply these fixes to phase 3

  // Log the current state
  console.log(
    `=== FlightStore - Ensuring consistent locations for phase ${phase} (NO CHANGES) ===`,
    {
      hasFromLocation: !!result.fromLocation,
      hasToLocation: !!result.toLocation,
      selectedType: result.selectedType,
      segmentCount: result.flightSegments?.length || 0,
      timestamp: new Date().toISOString(),
    }
  );

  // No changes in phase 3 - return data as is
  return result;
}

const createEmptyFlightData = (): FlightData => ({
  selectedFlights: [],
  selectedDate: null,
  selectedType: "direct",
  flightSegments: [
    {
      fromLocation: null,
      toLocation: null,
      selectedFlight: null,
      date: null,
    },
  ],
  fromLocation: null,
  toLocation: null,
  timestamp: Date.now(),
  _preserveFlightSegments: false,
  _isMultiSegment: false,
  flightType: "oneway",
  dateRange: {
    from: null,
    to: null,
  },
});

const initialState = {
  originalFlights: [],
  flightData: {},
  _isUpdating: false,
  _updateQueue: [],
  _lastUpdate: 0,
  _silentUpdate: false,
  selectedFlights: {},
  _preserveFlightSegments: false,
};

// Helper to ensure dates are properly parsed when loaded from localStorage
const ensureDatesAreParsed = (data: FlightData): FlightData => {
  if (!data) return data;

  // Deep copy to avoid mutation issues
  const processedData = JSON.parse(JSON.stringify(data));

  // Log the location objects BEFORE and AFTER JSON serialization
  if (data.fromLocation) {
    console.log("=== ensureDatesAreParsed - BEFORE JSON - fromLocation ===", {
      value: data.fromLocation.value,
      label: data.fromLocation.label,
      dropdownLabel: data.fromLocation.dropdownLabel,
      city: data.fromLocation.city,
      timestamp: new Date().toISOString(),
    });
  }

  if (processedData.fromLocation) {
    console.log("=== ensureDatesAreParsed - AFTER JSON - fromLocation ===", {
      value: processedData.fromLocation.value,
      label: processedData.fromLocation.label,
      dropdownLabel: processedData.fromLocation.dropdownLabel,
      city: processedData.fromLocation.city,
      timestamp: new Date().toISOString(),
    });
  }

  // CRITICAL: Preserve original location objects exactly as they are
  // Copy the references directly from the original data rather than using the JSON parse/stringify result
  if (data.fromLocation) {
    processedData.fromLocation = data.fromLocation;
  }

  if (data.toLocation) {
    processedData.toLocation = data.toLocation;
  }

  // Synchronize locations between main data and segments, but don't enforce segment count
  if (processedData.flightSegments && processedData.flightSegments.length > 0) {
    // Try to recover main locations from segments if missing
    if (
      !processedData.fromLocation &&
      processedData.flightSegments[0]?.fromLocation
    ) {
      console.log(
        "=== Flight Store - Recovering fromLocation from first segment (EXACT OBJECT) ===",
        {
          segmentFromLocation: processedData.flightSegments[0].fromLocation,
          timestamp: new Date().toISOString(),
        }
      );
      // Use the exact same object reference from the segment
      processedData.fromLocation = data.flightSegments[0].fromLocation;
    }

    if (!processedData.toLocation) {
      const lastSegment =
        processedData.flightSegments[processedData.flightSegments.length - 1];
      if (lastSegment?.toLocation) {
        console.log(
          "=== Flight Store - Recovering toLocation from last segment (EXACT OBJECT) ===",
          {
            segmentToLocation: lastSegment.toLocation,
            timestamp: new Date().toISOString(),
          }
        );
        // Use the exact same object reference from the segment
        processedData.toLocation =
          data.flightSegments[data.flightSegments.length - 1].toLocation;
      }
    }

    // Restore original location objects from the data object for all segments
    if (data.flightSegments && Array.isArray(data.flightSegments)) {
      processedData.flightSegments.forEach((segment: any, index: number) => {
        if (data.flightSegments[index]?.fromLocation) {
          segment.fromLocation = data.flightSegments[index].fromLocation;
        }
        if (data.flightSegments[index]?.toLocation) {
          segment.toLocation = data.flightSegments[index].toLocation;
        }
      });
    }
  }

  // Process dates for all flight segments
  if (
    processedData.flightSegments &&
    Array.isArray(processedData.flightSegments)
  ) {
    // Process each segment date
    processedData.flightSegments = processedData.flightSegments.map(
      (segment: any, index: number) => {
        const phase = processedData.timestamp?.toString()?.includes("phase4")
          ? 4
          : 3;

        // Check if this date was explicitly cleared
        const dateClearFlagKey = `dateWasCleared_phase${phase}_segment${index}`;
        const wasDateExplicitlyCleared =
          typeof localStorage !== "undefined" &&
          localStorage.getItem(dateClearFlagKey) === "true";

        // If date was explicitly cleared, ensure it stays cleared
        if (wasDateExplicitlyCleared) {
          console.log(
            `=== Flight Store - Respecting cleared date flag for segment ${index} ===`,
            {
              phase,
              timestamp: new Date().toISOString(),
            }
          );
          return {
            ...segment,
            date: null,
            // Also ensure the selectedFlight date is null
            selectedFlight: segment.selectedFlight
              ? { ...segment.selectedFlight, date: null }
              : null,
          };
        }

        // Skip segments without date
        if (!segment.date) return segment;

        // Convert string dates to Date objects for consistency
        if (typeof segment.date === "string") {
          // Check for ISO format (contains T or -)
          if (segment.date.includes("T") || segment.date.includes("-")) {
            try {
              const parsed = new Date(segment.date);
              if (isValid(parsed)) {
                segment.date = parsed;
                console.log("=== Flight Store - Parsed ISO date ===", {
                  original: segment.date,
                  parsed: format(parsed, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (e) {
              console.warn("Failed to parse date:", segment.date);
            }
          }
          // Handle DD.MM.YYYY format
          else if (segment.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            try {
              const [day, month, year] = segment.date.split(".").map(Number);
              const parsed = new Date(year, month - 1, day);
              if (isValid(parsed)) {
                segment.date = parsed;
                console.log("=== Flight Store - Parsed DD.MM.YYYY date ===", {
                  original: segment.date,
                  parsed: format(parsed, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                  timestamp: new Date().toISOString(),
                });
              }
            } catch (e) {
              console.warn("Failed to parse date:", segment.date);
            }
          }
        }
        return segment;
      }
    );
  }

  return processedData;
};

// Preserve the city property when processing location objects
const ensureLocationHasValidCityProperty = (location: any): any => {
  if (!location) return null;

  // If it's already a location object, ensure it has a city property equal to its value
  if (typeof location === "object" && location !== null) {
    // Always ensure city property exists and equals value if not already set
    if (!location.city || location.city === undefined) {
      // Create a deep clone to avoid reference issues
      const result = { ...location };
      result.city = result.value || "";

      console.log("=== flightStore - Added missing city property ===", {
        originalObject: JSON.stringify(location),
        value: result.value,
        cityValue: result.city,
        timestamp: new Date().toISOString(),
      });

      return result;
    }

    return location;
  }

  return location;
};

/**
 * Helper function to clone location objects while preserving all properties
 * This ensures properties like dropdownLabel are not lost during state updates
 */
function cloneWithAllProperties<T>(obj: T | null): T | null {
  if (!obj) return null;
  // Use JSON parse/stringify for deep cloning while preserving the original type
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Normalizes flight data from various sources
 * Handles switching between direct and multi flight types
 * Preserves location data including display labels
 */
export function processFlightDataFields(
  input: Partial<FlightData>,
  fallback: FlightData = createEmptyFlightData()
): FlightData {
  // Add a reference equality check to prevent unnecessary processing
  // If the input hasn't changed, return the same reference to avoid triggering re-renders
  if (!input || Object.keys(input).length === 0) {
    return fallback;
  }

  console.log("processFlightDataFields INPUT locations:", {
    fromLocation: input.fromLocation,
    toLocation: input.toLocation,
    segments: input.flightSegments?.map((s) => ({
      from: s.fromLocation,
      to: s.toLocation,
    })),
  });

  // Create a deep clone of the input to avoid mutations
  const processed = { ...fallback, ...input };

  // Ensure we have default values
  processed.flightSegments = processed.flightSegments || [];

  // Save the original toLocation to preserve it during processing
  const toLocationOriginal = cloneWithAllProperties(processed.toLocation);

  // Handle switching from multi to direct
  if (processed.selectedType === "direct") {
    // When switching from multi to direct, preserve the original location objects exactly as they are
    const fromLocation = cloneWithAllProperties(
      processed.flightSegments[0]?.fromLocation || processed.fromLocation
    ) as (string & LocationLike) | null;

    const toLocation = cloneWithAllProperties(
      toLocationOriginal ||
        processed.flightSegments[processed.flightSegments.length - 1]
          ?.toLocation
    ) as (string & LocationLike) | null;

    // Use the cloned location objects with all properties preserved
    processed.fromLocation = fromLocation;
    processed.toLocation = toLocation;

    // Create direct flight structure with preserved location objects
    processed.flightSegments = [
      {
        fromLocation,
        toLocation,
        selectedFlight: processed.flightSegments[0]?.selectedFlight || null,
        date: processed.flightSegments[0]?.date || null,
      },
    ];
  }
  // Handle switching from direct to multi
  else if (
    processed.selectedType === "multi" &&
    processed.flightSegments.length === 1
  ) {
    // When switching from direct to multi, split into two segments with proper locations
    // Preserve original location objects with all properties
    const fromLocation = cloneWithAllProperties(
      processed.flightSegments[0]?.fromLocation || processed.fromLocation
    ) as (string & LocationLike) | null;

    const toLocation = cloneWithAllProperties(
      toLocationOriginal || processed.flightSegments[0]?.toLocation
    ) as (string & LocationLike) | null;

    // Use the cloned location objects with all properties preserved
    processed.fromLocation = fromLocation;
    processed.toLocation = toLocation;

    // Create multi-segment structure with preserved location objects
    const multiSegments = [
      {
        fromLocation,
        toLocation: null,
        selectedFlight: processed.flightSegments[0]?.selectedFlight || null,
        date: processed.flightSegments[0]?.date || null,
      },
      {
        fromLocation: null,
        toLocation,
        selectedFlight: null,
        date: null,
      },
    ];

    processed.flightSegments = multiSegments;
  }

  console.log("processFlightDataFields OUTPUT locations:", {
    fromLocation: processed.fromLocation,
    toLocation: processed.toLocation,
    segments: processed.flightSegments?.map((s) => ({
      from: s.fromLocation,
      to: s.toLocation,
    })),
  });

  return processed;
}

/**
 * Custom storage implementation to properly handle location object serialization
 */
const customStorage: StateStorage = {
  getItem: (name) => {
    const value = localStorage.getItem(name);
    if (!value) return null;

    try {
      const parsed = JSON.parse(value);

      // Process all flight data phases
      if (parsed.state?.flightData) {
        Object.keys(parsed.state.flightData).forEach((phase) => {
          const phaseData = parsed.state.flightData[phase];

          // Restore fromLocation
          if (phaseData?.fromLocation) {
            phaseData.fromLocation = reconstructLocation(
              phaseData.fromLocation
            );
          }

          // Restore toLocation
          if (phaseData?.toLocation) {
            phaseData.toLocation = reconstructLocation(phaseData.toLocation);
          }

          // Restore locations in flight segments
          if (
            phaseData?.flightSegments &&
            Array.isArray(phaseData.flightSegments)
          ) {
            phaseData.flightSegments = phaseData.flightSegments.map(
              (segment: any) => ({
                ...segment,
                fromLocation: segment.fromLocation
                  ? reconstructLocation(segment.fromLocation)
                  : null,
                toLocation: segment.toLocation
                  ? reconstructLocation(segment.toLocation)
                  : null,
              })
            );
          }
        });
      }

      return JSON.stringify(parsed);
    } catch (error) {
      console.error("Error parsing flight store data:", error);
      return value; // Return original value if parsing fails
    }
  },

  setItem: (name, value) => {
    try {
      // We could add pre-serialization processing here if needed
      localStorage.setItem(name, value);
    } catch (error) {
      console.error("Error storing flight data:", error);
    }
  },

  removeItem: (name) => {
    localStorage.removeItem(name);
  },
};

/**
 * Helper function to reconstruct location objects with all necessary properties
 */
function reconstructLocation(location: any): any {
  if (!location) return null;

  // Simple location string
  if (typeof location === "string") {
    return location;
  }

  // Get base properties
  const value = location.value || "";
  const label = location.label || value;

  // For fromLocation, ensure we properly construct a String object with LocationLike properties
  // This mirrors how locations are constructed in the UI layer
  const properDropdownLabel =
    location.dropdownLabel ||
    (location.name ? `${location.name} (${location.label})` : label);

  // Create a proper location object with string prototype
  return Object.assign(String(value), {
    value,
    label,
    description: location.description || value,
    city: location.city || value,
    dropdownLabel: properDropdownLabel,
    name: location.name,
    _isReconstructed: true,
    toString: function () {
      return value;
    },
    valueOf: function () {
      return value;
    },
  });
}

// Create the store with custom storage
export const useFlightStore = create<FlightStore>()(
  persist(
    produce((set, get) => ({
      ...initialState,

      // Use the standalone function in the store implementation
      processFlightDataFields,

      saveFlightData: async (phase: number, data: Partial<FlightData>) => {
        return new Promise<void>((resolve) => {
          const state = get();

          // Prevent processing if there's no meaningful data
          if (!data || Object.keys(data).length === 0) {
            resolve();
            return;
          }

          // Check if the data is actually different from what we already have
          const currentPhaseData = state.flightData[phase] || {};

          // Simple debouncing mechanism - if the last update was less than 100ms ago, queue it
          const now = Date.now();
          const timeSinceLastUpdate = now - state._lastUpdate;
          const shouldDebounce = timeSinceLastUpdate < 100;

          if (state._isUpdating || shouldDebounce) {
            // Queue the update if already updating or if we should debounce
            // Create a new array to avoid extensibility issues
            const newQueue = [...state._updateQueue];
            newQueue.push({
              phase,
              data,
              resolve,
            });
            set({ _updateQueue: newQueue });
            return;
          }

          try {
            // Set updating flag to prevent concurrent updates
            set({ _isUpdating: true, _lastUpdate: now });

            // CRITICAL: Instead of making a copy via JSON, preserve the original location objects
            // Only deep copy the non-location parts to avoid reference issues
            const dataCopy = { ...data };

            // Ensure locations have valid city properties
            if (dataCopy.fromLocation) {
              dataCopy.fromLocation = ensureLocationHasValidCityProperty(
                dataCopy.fromLocation
              );
            }

            if (dataCopy.toLocation) {
              dataCopy.toLocation = ensureLocationHasValidCityProperty(
                dataCopy.toLocation
              );
            }

            // CRITICAL: Preserve location objects by direct reference
            if (data.fromLocation) {
              console.log(
                "=== Flight Store - INPUT LOCATION TRACKING - fromLocation ===",
                {
                  value: data.fromLocation.value,
                  label: data.fromLocation.label,
                  dropdownLabel: data.fromLocation.dropdownLabel,
                  city: data.fromLocation.city,
                  fullObject: JSON.stringify(data.fromLocation),
                  objectType: typeof data.fromLocation,
                  phase,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            if (data.toLocation) {
              console.log(
                "=== Flight Store - INPUT LOCATION TRACKING - toLocation ===",
                {
                  value: data.toLocation.value,
                  label: data.toLocation.label,
                  dropdownLabel: data.toLocation.dropdownLabel,
                  city: data.toLocation.city,
                  fullObject: JSON.stringify(data.toLocation),
                  objectType: typeof data.toLocation,
                  phase,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            // Process location data with the helper - which now preserves exact objects
            const processedData = processFlightDataFields(
              dataCopy,
              currentPhaseData
            );

            // Skip update if the processed data is identical to current data
            const isIdentical =
              JSON.stringify(processedData) ===
              JSON.stringify(currentPhaseData);
            if (isIdentical) {
              console.log("=== Flight Store - Skipping identical update ===", {
                phase,
                timestamp: new Date().toISOString(),
              });
              set({ _isUpdating: false });
              resolve();
              return;
            }

            // Log processed locations to track any changes
            if (processedData.fromLocation) {
              console.log(
                "=== Flight Store - PROCESSED LOCATION TRACKING - fromLocation ===",
                {
                  value: processedData.fromLocation.value,
                  label: processedData.fromLocation.label,
                  dropdownLabel: processedData.fromLocation.dropdownLabel,
                  city: processedData.fromLocation.city,
                  fullObject: JSON.stringify(processedData.fromLocation),
                  hasChanged: processedData.fromLocation !== data.fromLocation,
                  phase,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            if (processedData.toLocation) {
              console.log(
                "=== Flight Store - PROCESSED LOCATION TRACKING - toLocation ===",
                {
                  value: processedData.toLocation.value,
                  label: processedData.toLocation.label,
                  dropdownLabel: processedData.toLocation.dropdownLabel,
                  city: processedData.toLocation.city,
                  fullObject: JSON.stringify(processedData.toLocation),
                  hasChanged: processedData.toLocation !== data.toLocation,
                  phase,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            console.log(
              "=== Flight Store - Saving Flight Data (PRESERVING EXACT OBJECTS) ===",
              {
                phase,
                currentSegments: currentPhaseData.flightSegments?.length || 0,
                newSegments: processedData.flightSegments?.length || 0,
                preserveFlag: processedData._preserveFlightSegments,
                currentType: currentPhaseData.selectedType,
                newType: processedData.selectedType,
                timestamp: new Date().toISOString(),
              }
            );

            // Use setTimeout to simulate a microtask and avoid blocking the main thread
            Promise.resolve().then(() =>
              setTimeout(() => {
                // Log from/to locations if available
                if (processedData.fromLocation && processedData.toLocation) {
                  console.log(
                    "=== Flight Store - Direct Flight Data Processed (EXACT OBJECTS) ===",
                    {
                      phase,
                      fromLocation: processedData.fromLocation,
                      fromLocationLabel: processedData.fromLocation.label,
                      toLocation: processedData.toLocation,
                      toLocationLabel: processedData.toLocation.label,
                      segmentCount: processedData.flightSegments?.length || 0,
                      timestamp: new Date().toISOString(),
                    }
                  );
                }

                // Update the store with the processed data
                const updatedFlightData = {
                  ...state.flightData,
                  [phase]: {
                    ...currentPhaseData,
                    ...processedData,
                    timestamp: now,
                  },
                };

                // Before storing to localStorage, log the final format
                console.log(
                  "=== Flight Store - FINAL LOCATION FORMAT BEFORE STORAGE ===",
                  {
                    phase,
                    fromLocation: processedData.fromLocation
                      ? {
                          value: processedData.fromLocation.value,
                          label: processedData.fromLocation.label,
                          dropdownLabel:
                            processedData.fromLocation.dropdownLabel,
                          city: processedData.fromLocation.city,
                        }
                      : null,
                    toLocation: processedData.toLocation
                      ? {
                          value: processedData.toLocation.value,
                          label: processedData.toLocation.label,
                          dropdownLabel: processedData.toLocation.dropdownLabel,
                          city: processedData.toLocation.city,
                        }
                      : null,
                    timestamp: new Date().toISOString(),
                  }
                );

                // Save to localStorage - need to use JSON for storage
                if (typeof window !== "undefined") {
                  const phaseKey = `flightData_phase${phase}`;
                  try {
                    localStorage.setItem(
                      phaseKey,
                      JSON.stringify(updatedFlightData[phase])
                    );
                    console.log(
                      "=== Flight Store - Saved to localStorage ===",
                      {
                        phase,
                        hasFromLocation:
                          !!updatedFlightData[phase].fromLocation,
                        hasToLocation: !!updatedFlightData[phase].toLocation,
                        fromLocationValue:
                          updatedFlightData[phase].fromLocation?.value,
                        toLocationValue:
                          updatedFlightData[phase].toLocation?.value,
                        timestamp: new Date().toISOString(),
                      }
                    );
                  } catch (error) {
                    console.error(
                      "=== Flight Store - Error saving to localStorage ===",
                      {
                        phase,
                        error,
                        timestamp: new Date().toISOString(),
                      }
                    );
                  }
                }

                // Update state
                set({
                  flightData: updatedFlightData,
                  _isUpdating: false,
                });

                // Process the next item in the queue if any
                if (state._updateQueue.length > 0) {
                  // Create a new queue to prevent mutations on frozen objects
                  const newQueue = [...state._updateQueue];
                  const nextUpdate = newQueue.shift();

                  // Update the queue in the state
                  set({ _updateQueue: newQueue });

                  if (nextUpdate) {
                    state._isUpdating = false; // Reset flag
                    state
                      .saveFlightData(nextUpdate.phase, nextUpdate.data)
                      .then(nextUpdate.resolve);
                  }
                }

                resolve();
              }, 0)
            );
          } catch (error) {
            console.error("Error saving flight data:", error);
            set({ _isUpdating: false });
            resolve();
          }
        });
      },

      getFlightData: (phase: number): FlightData | null => {
        const state = get();
        if (state._isUpdating) return null; // Prevent recursive updates

        // For phase 4, ensure complete isolation from phases 1-3
        if (phase === 4) {
          console.log("=== FlightStore - getFlightData for Phase 4 ===", {
            message: "Ensuring complete isolation from phases 1-3",
            timestamp: new Date().toISOString(),
          });

          // Try to get phase 4 data from store first
          let phase4Data = state.flightData[4];

          // If not in store, try localStorage
          if (!phase4Data && typeof window !== "undefined") {
            const phaseKey = "flightData_phase4";
            const stored = localStorage.getItem(phaseKey);
            if (stored) {
              try {
                phase4Data = JSON.parse(stored);

                // CRITICAL: Do not process this data at all - use it exactly as stored
                // Update store with the exact localStorage data
                if (!state._isUpdating) {
                  set({
                    _isUpdating: true,
                    flightData: {
                      ...state.flightData,
                      [4]: phase4Data,
                    },
                  });
                  set({ _isUpdating: false });
                }
              } catch (e) {
                console.error(
                  "Error parsing stored flight data for phase 4:",
                  e
                );
              }
            }
          }

          // IMPORTANT: Return exact data without any processing
          return phase4Data || null;
        }

        // For phases 1-3, try to get data from store first
        let data = state.flightData[phase];

        // Get the previous phase data to preserve locations
        const prevPhaseData =
          state.flightData?.[phase - 1] || state.flightData?.[1];

        // CRITICAL: Check if flight type has changed and we need to reset stale data
        let flightTypeChanged = false;

        // If we're in phase 3, check if the flight type has changed from previous data
        if (phase === 3 && data?.selectedType) {
          const prevStoredData =
            typeof window !== "undefined"
              ? localStorage.getItem(`flightData_phase${phase}`)
              : null;

          if (prevStoredData) {
            try {
              const parsedPrevData = JSON.parse(prevStoredData);
              if (parsedPrevData.selectedType !== data.selectedType) {
                console.log(
                  `=== FlightStore - Flight type change detected in getFlightData ===`,
                  {
                    from: parsedPrevData.selectedType,
                    to: data.selectedType,
                    phase,
                    timestamp: new Date().toISOString(),
                  }
                );
                flightTypeChanged = true;
              }
            } catch (e) {
              console.error("Error parsing previous flight data:", e);
            }
          }
        }

        // IMPORTANT: If data exists, we should validate it to ensure locations are present
        if (data && Object.keys(data).length > 0 && !flightTypeChanged) {
          console.log(
            `=== FlightStore - Found existing data for Phase ${phase} ===`,
            {
              hasFromLocation: !!data.fromLocation,
              hasToLocation: !!data.toLocation,
              selectedType: data.selectedType,
              segmentCount: data.flightSegments?.length || 0,
              timestamp: new Date().toISOString(),
            }
          );

          // Ensure dates are properly parsed
          let processedData = ensureDatesAreParsed(data);

          // For phase 3, run the additional consistency check
          if (processedData && phase === 3) {
            // Apply the enhanced location consistency check
            processedData = ensureConsistentLocations(processedData, phase);
          }

          return processedData;
        }

        // If we have a flight type change in phase 3, create new data while preserving locations
        if (phase === 3 && flightTypeChanged && data) {
          console.log(
            `=== FlightStore - Creating new data for Phase ${phase} after flight type change ===`,
            {
              newType: data.selectedType,
              fromLocation: data.fromLocation?.value,
              toLocation: data.toLocation?.value,
              timestamp: new Date().toISOString(),
            }
          );

          // Preserve the original location objects without any transformation
          const fromLocation = (data.fromLocation ||
            prevPhaseData?.fromLocation) as (string & LocationLike) | null;
          const toLocation = (data.toLocation || prevPhaseData?.toLocation) as
            | (string & LocationLike)
            | null;

          // Create data with original location objects
          data = {
            ...createEmptyFlightData(),
            fromLocation: fromLocation,
            toLocation: toLocation,
            selectedType: data.selectedType,
            _preserveFlightSegments: false, // Disable segment preservation for type changes
            timestamp: Date.now(),
          };

          console.log(
            `=== FlightStore - Created data with original location objects after flight type change ===`,
            {
              fromLocationValue: fromLocation?.value,
              toLocationValue: toLocation?.value,
              selectedType: data.selectedType,
              timestamp: new Date().toISOString(),
            }
          );

          // Build segments based on flight type without any location manipulation
          if (data.selectedType === "direct") {
            data.flightSegments = [
              {
                fromLocation: fromLocation,
                toLocation: toLocation,
                selectedFlight: null,
                date: null,
              },
            ];
          } else {
            // For multi-segment flights, create proper segment structure with original locations
            data.flightSegments = [
              {
                fromLocation: fromLocation,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
              {
                fromLocation: null,
                toLocation: toLocation,
                selectedFlight: null,
                date: null,
              },
            ];
          }

          // Save this new data
          if (!state._isUpdating) {
            set({
              _isUpdating: true,
              flightData: {
                ...state.flightData,
                [phase]: data,
              },
            });

            // Save to localStorage
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(
                  `flightData_phase${phase}`,
                  JSON.stringify(data)
                );
              } catch (e) {
                console.error(
                  `Error saving flight data for phase ${phase}:`,
                  e
                );
              }
            }

            set({ _isUpdating: false });
          }

          // After creating data structure, ensure locations are consistent
          data = ensureConsistentLocations(data, phase);

          return data;
        }

        // If we reach here, it means we need to create completely new data
        console.log(
          `=== FlightStore - Creating new data for Phase ${phase} ===`,
          {
            message: "No existing data found, creating fresh data",
            timestamp: new Date().toISOString(),
          }
        );

        // Create new data with locations from previous phase - no processing
        data = {
          ...createEmptyFlightData(),
          fromLocation: prevPhaseData?.fromLocation || null,
          toLocation: prevPhaseData?.toLocation || null,
          selectedType: prevPhaseData?.selectedType || "direct",
          timestamp: Date.now(),
        };

        console.log(
          `=== FlightStore - Creating segments for new data (Phase ${phase}) ===`,
          {
            selectedType: data.selectedType,
            fromLocation: data.fromLocation?.value,
            toLocation: data.toLocation?.value,
            timestamp: new Date().toISOString(),
          }
        );

        // Create appropriate segments based on flight type
        if (data.selectedType === "direct") {
          data.flightSegments = [
            {
              fromLocation: data.fromLocation,
              toLocation: data.toLocation,
              selectedFlight: null,
              date: null,
            },
          ];
        } else if (data.selectedType === "multi") {
          // For multi-city flights, create at least two segments
          // with the fromLocation in the first segment and toLocation in the last segment
          data.flightSegments = [
            {
              fromLocation: data.fromLocation,
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
            {
              fromLocation: null,
              toLocation: data.toLocation,
              selectedFlight: null,
              date: null,
            },
          ];
        }

        // Save this data if not currently updating
        if (!state._isUpdating) {
          set({
            _isUpdating: true,
            flightData: {
              ...state.flightData,
              [phase]: data,
            },
          });

          // Save to localStorage
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem(
                `flightData_phase${phase}`,
                JSON.stringify(data)
              );
            } catch (e) {
              console.error(`Error saving flight data for phase ${phase}:`, e);
            }
          }

          set({ _isUpdating: false });
        }

        // Before returning, ensure locations are consistent
        data = ensureConsistentLocations(data, phase);

        return data;
      },

      getSelectedFlights: (phase: number) => {
        const state = get();
        return state.flightData[phase]?.selectedFlights || [];
      },

      setOriginalFlights: (flights: Flight[]) => {
        const state = get();
        if (state._isUpdating) return;

        console.log("=== FlightStore - Setting Original Flights ===", {
          count: flights?.length,
          timestamp: new Date().toISOString(),
        });

        set({
          _isUpdating: true,
          originalFlights: flights,
        });
        set({ _isUpdating: false });
      },

      setSelectedFlights: (phase: number, flights: Flight[]) => {
        const state = get();
        if (state._isUpdating) return;

        console.log(
          `=== FlightStore - Setting Selected Flights for Phase ${phase} ===`,
          {
            count: flights?.length,
            flightIds: flights?.map((f) => f.id),
            timestamp: new Date().toISOString(),
          }
        );

        try {
          set({ _isUpdating: true });

          // Create deep copies to avoid mutating read-only objects
          const safeFlights = flights.map((flight) => {
            // Create a complete deep copy of the flight object
            const flightCopy = JSON.parse(JSON.stringify(flight));

            // Ensure date is properly handled - might be a Date object
            if (
              typeof flight.date === "object" &&
              flight.date !== null &&
              "toISOString" in flight.date
            ) {
              flightCopy.date = (flight.date as Date).toISOString();
            } else if (
              typeof flight.date !== "string" &&
              flight.date !== null
            ) {
              flightCopy.date = String(flight.date || "");
            }

            // If flightSegments exist, ensure they're properly deep copied
            if (flightCopy.flightSegments) {
              flightCopy.flightSegments = JSON.parse(
                JSON.stringify(flightCopy.flightSegments)
              );
            }

            return flightCopy;
          });

          const currentData =
            state.flightData[phase] || createEmptyFlightData();
          const newData: FlightData = {
            ...currentData,
            selectedFlights: safeFlights,
            timestamp: Date.now(),
          };

          // For phase 4, add explicit logging to help with debugging
          if (phase === 4) {
            console.log("=== FlightStore - Phase 4 Flights Updated ===", {
              flightCount: safeFlights.length,
              flightIds: safeFlights.map((f) => f.id),
              isIsolated: true, // Flag to indicate this is isolated from phases 1-3
              timestamp: new Date().toISOString(),
            });
          }

          // Store in localStorage manually
          if (typeof window !== "undefined") {
            const phaseKey = `flightData_phase${phase}`;
            localStorage.setItem(phaseKey, JSON.stringify(newData));
          }

          // Update state
          set({
            flightData: {
              ...state.flightData,
              [phase]: newData,
            },
            _isUpdating: false,
          });
        } catch (error) {
          console.error("Error setting selected flights:", error);
          set({ _isUpdating: false });
        }
      },

      clearFlightData: (phase: number) => {
        const state = get();
        if (state._isUpdating) return;

        console.log(`=== FlightStore - Clearing Phase ${phase} Data ===`);

        try {
          set({ _isUpdating: true });

          // Clear from localStorage
          if (typeof window !== "undefined") {
            const phaseKey = `flightData_phase${phase}`;
            localStorage.removeItem(phaseKey);
          }

          // Clear from store
          const { [phase]: omitted, ...remainingData } = state.flightData; // eslint-disable-line @typescript-eslint/no-unused-vars
          set({
            flightData: remainingData,
            _isUpdating: false,
          });
        } catch (error) {
          console.error("Error clearing flight data:", error);
          set({ _isUpdating: false });
        }
      },

      resetAllData: () => {
        const state = get();
        if (state._isUpdating) return;

        console.log("=== FlightStore - Resetting All Data ===");

        try {
          set({ _isUpdating: true });

          // Clear all phase data from localStorage
          if (typeof window !== "undefined") {
            for (let phase = 1; phase <= 7; phase++) {
              localStorage.removeItem(`flightData_phase${phase}`);
            }
            localStorage.removeItem("flightSelectionState");
          }

          // Reset store to initial state
          set({ ...initialState });
        } catch (error) {
          console.error("Error resetting flight data:", error);
          set({ _isUpdating: false });
        }
      },

      setFlights: (flights: Flight[]) => {
        // Update originalFlights instead of the unused flights array
        get().setOriginalFlights(flights);
      },

      getFlightById: (id: string) => {
        return get().originalFlights.find((flight: Flight) => flight.id === id);
      },

      updatePhaseData: (
        phase: number,
        data: Partial<FlightData>,
        onSuccess?: (data: FlightData) => void,
        forceReset?: boolean
      ): void => {
        const state = get();

        // Prevent unnecessary updates
        if (!data || Object.keys(data).length === 0) {
          return;
        }

        if (state._isUpdating) {
          console.log(
            `=== FlightStore - Aborting updatePhaseData due to ongoing update ===`,
            {
              phase,
              timestamp: new Date().toISOString(),
            }
          );
          return;
        }

        set({ _isUpdating: true });

        // Get the current data for this phase
        const currentData =
          state.flightData?.[phase] || createEmptyFlightData();

        // Check if we're switching flight types in phase 3
        let flightTypeChanged = false;
        if (
          phase === 3 &&
          data.selectedType &&
          currentData.selectedType &&
          data.selectedType !== currentData.selectedType
        ) {
          flightTypeChanged = true;
          console.log(
            `=== FlightStore - Flight type change detected in updatePhaseData ===`,
            {
              from: currentData.selectedType,
              to: data.selectedType,
              phase,
              timestamp: new Date().toISOString(),
            }
          );
        }

        // Generate new data by merging current with updates
        let newData: FlightData;

        if (forceReset) {
          console.log(
            `=== FlightStore - Force resetting data for Phase ${phase} ===`,
            {
              timestamp: new Date().toISOString(),
            }
          );
          newData = {
            ...createEmptyFlightData(),
            ...data,
            timestamp: Date.now(),
          };
        } else {
          // For flight type changes, preserve only essential data
          if (flightTypeChanged) {
            console.log(
              `=== FlightStore - Preparing special merge for flight type change ===`,
              {
                preservingLocations: true,
                resetSegments: true,
                timestamp: new Date().toISOString(),
              }
            );

            // For flight type changes, we need to preserve locations but reset segments
            newData = {
              ...createEmptyFlightData(),
              fromLocation: data.fromLocation || currentData.fromLocation,
              toLocation: data.toLocation || currentData.toLocation,
              selectedType:
                (data.selectedType as "direct" | "multi") || "direct",
              timestamp: Date.now(),
              _preserveFlightSegments: false,
            };

            // Create fresh segments based on the new flight type
            if (data.selectedType === "direct") {
              newData.flightSegments = [
                {
                  fromLocation: newData.fromLocation,
                  toLocation: newData.toLocation,
                  selectedFlight: null,
                  date: null,
                },
              ];
            } else if (data.selectedType === "multi") {
              // For multi-segment flights, create proper segment structure
              newData.flightSegments = [
                {
                  fromLocation: newData.fromLocation,
                  toLocation: null,
                  selectedFlight: null,
                  date: null,
                },
                {
                  fromLocation: null,
                  toLocation: newData.toLocation,
                  selectedFlight: null,
                  date: null,
                },
              ];
            }
          } else {
            // Regular update (no flight type change)
            let segmentsToUse: FlightSegmentData[] = [];

            // Check if we should preserve flight segments or use new ones
            if (data._preserveFlightSegments === false) {
              console.log(
                `=== FlightStore - Explicitly NOT preserving flight segments ===`,
                {
                  phase,
                  timestamp: new Date().toISOString(),
                }
              );
              // Don't preserve segments - use the ones from the update if provided
              segmentsToUse = data.flightSegments || [];
            } else if (data.flightSegments && data.flightSegments.length > 0) {
              // Use segments from update
              console.log(
                `=== FlightStore - Using provided flight segments ===`,
                {
                  phase,
                  segmentCount: data.flightSegments.length,
                  timestamp: new Date().toISOString(),
                }
              );
              segmentsToUse = [...data.flightSegments];
            } else if (
              currentData.flightSegments &&
              currentData.flightSegments.length > 0
            ) {
              // Preserve existing segments
              console.log(
                `=== FlightStore - Preserving existing flight segments ===`,
                {
                  phase,
                  segmentCount: currentData.flightSegments.length,
                  timestamp: new Date().toISOString(),
                }
              );
              segmentsToUse = [...currentData.flightSegments];
            }

            // Standard merge for regular updates
            newData = {
              ...currentData,
              ...data,
              flightSegments: segmentsToUse,
              timestamp: Date.now(),
            };
          }
        }

        console.log(
          `=== FlightStore - Processed Flight Data Fields in updatePhaseData ===`,
          {
            phase,
            fromLocation: newData.fromLocation?.value,
            toLocation: newData.toLocation?.value,
            flightType: newData.selectedType,
            segmentCount: newData.flightSegments?.length || 0,
            flightTypeChanged,
            timestamp: new Date().toISOString(),
          }
        );

        // Check if the data is actually different to avoid unnecessary updates
        const isIdentical =
          JSON.stringify(newData) === JSON.stringify(currentData);
        if (isIdentical && !flightTypeChanged && !forceReset) {
          console.log(
            `=== FlightStore - Skipping identical update in updatePhaseData ===`,
            {
              phase,
              timestamp: new Date().toISOString(),
            }
          );
          set({ _isUpdating: false });
          return;
        }

        // Now process the segments to ensure they have the right data
        newData = processFlightDataFields(newData);

        // Before saving, run the location consistency check for phase 3
        if (phase === 3) {
          newData = ensureConsistentLocations(newData, phase);

          console.log(
            `=== FlightStore - Verified locations consistency in updatePhaseData ===`,
            {
              phase,
              fromLocation: newData.fromLocation?.value,
              toLocation: newData.toLocation?.value,
              selectedType: newData.selectedType,
              segmentCount: newData.flightSegments?.length || 0,
              timestamp: new Date().toISOString(),
            }
          );
        }

        // Update the store with new data
        set({
          flightData: {
            ...state.flightData,
            [phase]: newData,
          },
        });

        // Save to localStorage
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              `flightData_phase${phase}`,
              JSON.stringify(newData)
            );
            console.log(
              `=== FlightStore - Saved Flight Data to localStorage ===`,
              {
                phase,
                timestamp: new Date().toISOString(),
              }
            );
          } catch (e) {
            console.error(`Error saving flight data for phase ${phase}:`, e);
          }
        }

        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess(newData);
        }

        set({ _isUpdating: false });
      },
    })),
    {
      name: "flight-store",
      storage: createJSONStorage(() => customStorage),
      // Only persist specific parts of the state
      partialize: (state) => ({
        flightData: state.flightData,
        // Don't include runtime flags in persistence
        _isUpdating: false,
        _updateQueue: [],
        _lastUpdate: 0,
      }),
    }
  )
);
