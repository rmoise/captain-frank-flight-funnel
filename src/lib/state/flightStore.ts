import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";
import { processLocation } from "./slices/flightSlice";
import type { Flight, FlightSegmentData } from "@/types/store";
import type { LocationLike } from "@/types/location";

interface FlightData {
  selectedFlights: Flight[];
  selectedDate: string | null;
  selectedType: "direct" | "multi";
  flightSegments: FlightSegmentData[];
  fromLocation: (string & LocationLike) | null;
  toLocation: (string & LocationLike) | null;
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
}

const createEmptyFlightData = (): FlightData => ({
  selectedFlights: [],
  selectedDate: null,
  selectedType: "direct",
  fromLocation: null,
  toLocation: null,
  timestamp: Date.now(),
  flightSegments: [],
  _preserveFlightSegments: false,
  _isMultiSegment: false,
});

const initialState = {
  originalFlights: [],
  flightData: {},
  _isUpdating: false,
  _updateQueue: [],
  _lastUpdate: 0,
  _silentUpdate: false,
  selectedFlights: {},
};

export const useFlightStore = create<FlightStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      saveFlightData: async (phase: number, data: Partial<FlightData>) => {
        return new Promise<void>((resolve) => {
          const state = get();

          // If already updating, queue the update
          if (state._isUpdating) {
            set(
              produce((state: FlightStore) => {
                state._updateQueue = [
                  ...state._updateQueue,
                  { phase, data, resolve },
                ];
              })
            );
            return;
          }

          try {
            set({ _isUpdating: true });

            // Get current state
            const currentPhaseData =
              state.flightData[phase] || createEmptyFlightData();

            // Add debug logging
            console.log("=== Flight Store - Saving Flight Data ===", {
              phase,
              currentSegments: currentPhaseData.flightSegments?.length || 0,
              newSegments: data.flightSegments?.length || 0,
              preserveFlag: data._preserveFlightSegments,
              currentType: currentPhaseData.selectedType,
              newType: data.selectedType,
              timestamp: new Date().toISOString(),
            });

            // Check if we need to preserve multi-segment data
            const isCurrentMulti = currentPhaseData.selectedType === "multi";
            const isNewMulti = data.selectedType === "multi";
            const shouldPreserveMultiSegments =
              isCurrentMulti &&
              isNewMulti &&
              currentPhaseData.flightSegments.length > 0 &&
              (!data.flightSegments || data.flightSegments.length === 0);

            // Create a deep copy of any object data to avoid immutability issues
            const safeData = JSON.parse(
              JSON.stringify({
                selectedFlights: data.selectedFlights,
                flightSegments: data.flightSegments,
                fromLocation: data.fromLocation,
                toLocation: data.toLocation,
              })
            );

            // Process locations using processLocation
            const processedData: FlightData = {
              selectedFlights: Array.isArray(safeData.selectedFlights)
                ? safeData.selectedFlights
                : JSON.parse(JSON.stringify(currentPhaseData.selectedFlights)),
              selectedDate:
                data.selectedDate !== undefined
                  ? data.selectedDate
                  : currentPhaseData.selectedDate,
              selectedType: data.selectedType || currentPhaseData.selectedType,
              // Preserve existing segments if _preserveFlightSegments flag is set
              // or if no new segments are provided but existing segments exist and type is multi
              flightSegments:
                data._preserveFlightSegments === true ||
                shouldPreserveMultiSegments
                  ? JSON.parse(JSON.stringify(currentPhaseData.flightSegments))
                  : Array.isArray(safeData.flightSegments)
                  ? safeData.flightSegments
                  : JSON.parse(JSON.stringify(currentPhaseData.flightSegments)),
              // Special handling for phase 1 to prevent nulling out locations
              fromLocation:
                phase === 1 &&
                !safeData.fromLocation &&
                currentPhaseData.fromLocation
                  ? processLocation(currentPhaseData.fromLocation) // Keep existing in phase 1
                  : processLocation(
                      safeData.fromLocation ||
                        JSON.parse(
                          JSON.stringify(currentPhaseData.fromLocation)
                        )
                    ),
              toLocation:
                phase === 1 &&
                !safeData.toLocation &&
                currentPhaseData.toLocation
                  ? processLocation(currentPhaseData.toLocation) // Keep existing in phase 1
                  : processLocation(
                      safeData.toLocation ||
                        JSON.parse(JSON.stringify(currentPhaseData.toLocation))
                    ),
              timestamp: data.timestamp || Date.now(),
              _isMultiSegment:
                data._isMultiSegment !== undefined
                  ? data._isMultiSegment
                  : data.selectedType === "multi",
              _preserveFlightSegments: data._preserveFlightSegments || false,
            };

            // For direct flights, ensure we only have a single segment
            if (
              processedData.selectedType === "direct" &&
              Array.isArray(processedData.flightSegments)
            ) {
              // If we have segments, ensure we only keep the first one
              if (processedData.flightSegments.length > 0) {
                const directSegment = { ...processedData.flightSegments[0] };

                // Create a new segment object instead of modifying the existing one
                const updatedSegment = {
                  ...directSegment,
                  fromLocation: processedData.fromLocation,
                  toLocation: processedData.toLocation,
                };

                // Replace the segments array with just the direct segment
                processedData.flightSegments = [updatedSegment];
                processedData._isMultiSegment = false;
              }
              // If we don't have segments, create one
              else {
                processedData.flightSegments = [
                  {
                    fromLocation: processedData.fromLocation,
                    toLocation: processedData.toLocation,
                    selectedFlight: null,
                    date: null,
                  },
                ];
              }

              console.log(
                "=== Flight Store - Direct Flight Data Processed ===",
                {
                  phase,
                  fromLocation: processedData.fromLocation,
                  toLocation: processedData.toLocation,
                  segmentCount: processedData.flightSegments.length,
                  timestamp: new Date().toISOString(),
                }
              );
            }

            // Save to localStorage
            localStorage.setItem(
              `flightData_phase${phase}`,
              JSON.stringify(processedData)
            );

            // Update the state
            set(
              produce((state: FlightStore) => {
                state.flightData[phase] = processedData;

                // If the flight type has changed, sync it to other phases
                // BUT ONLY FOR PHASES 1-3, NEVER FOR PHASE 4
                if (
                  data.selectedType &&
                  data.selectedType !== currentPhaseData.selectedType &&
                  phase !== 4
                ) {
                  console.log("=== Flight Store - Flight Type Changed ===", {
                    phase,
                    oldType: currentPhaseData.selectedType,
                    newType: data.selectedType,
                    timestamp: new Date().toISOString(),
                  });

                  // Sync flight type to phase 1 if we're in phase 3
                  if (phase === 3 && state.flightData[1]) {
                    const phase1Data = state.flightData[1];

                    // Create appropriate segments based on the flight type
                    let updatedSegments;
                    const fromLocation =
                      processedData.fromLocation || phase1Data.fromLocation;
                    const toLocation =
                      processedData.toLocation || phase1Data.toLocation;

                    if (data.selectedType === "direct") {
                      // For direct flights, create a single segment
                      updatedSegments = [
                        {
                          fromLocation: fromLocation,
                          toLocation: toLocation,
                          selectedFlight: null,
                          date: null,
                        },
                      ];
                    } else {
                      // For multi-segment flights, preserve existing segments if available
                      updatedSegments =
                        phase1Data.flightSegments.length > 0
                          ? phase1Data.flightSegments
                          : [
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

                    // Update phase 1 data
                    state.flightData[1] = {
                      ...phase1Data,
                      selectedType: data.selectedType,
                      flightSegments: updatedSegments,
                      _isMultiSegment: data.selectedType === "multi",
                      timestamp: Date.now(),
                    };

                    // Save to localStorage
                    localStorage.setItem(
                      `flightData_phase1`,
                      JSON.stringify(state.flightData[1])
                    );
                  }

                  // Sync flight type to phase 2 if we're in phase 3
                  if (phase === 3 && state.flightData[2]) {
                    const phase2Data = state.flightData[2];

                    // Create appropriate segments based on the flight type
                    let updatedSegments;
                    const fromLocation =
                      processedData.fromLocation || phase2Data.fromLocation;
                    const toLocation =
                      processedData.toLocation || phase2Data.toLocation;

                    if (data.selectedType === "direct") {
                      // For direct flights, create a single segment
                      updatedSegments = [
                        {
                          fromLocation: fromLocation,
                          toLocation: toLocation,
                          selectedFlight: null,
                          date: null,
                        },
                      ];
                    } else {
                      // For multi-segment flights, preserve existing segments if available
                      updatedSegments =
                        phase2Data.flightSegments.length > 0
                          ? phase2Data.flightSegments
                          : [
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

                    // Update phase 2 data
                    state.flightData[2] = {
                      ...phase2Data,
                      selectedType: data.selectedType,
                      flightSegments: updatedSegments,
                      _isMultiSegment: data.selectedType === "multi",
                      timestamp: Date.now(),
                    };

                    // Save to localStorage
                    localStorage.setItem(
                      `flightData_phase2`,
                      JSON.stringify(state.flightData[2])
                    );
                  }
                }

                // For phase 4, ensure complete isolation from phases 1-3
                if (phase === 4) {
                  console.log("=== FlightStore - Phase 4 Flights Updated ===", {
                    flightCount: processedData.selectedFlights.length,
                    flightIds: processedData.selectedFlights.map((f) => f.id),
                    isIsolated: true,
                    timestamp: new Date().toISOString(),
                  });
                }

                // Process the next update in the queue if any
                if (state._updateQueue.length > 0) {
                  const nextUpdate = state._updateQueue.shift();
                  if (nextUpdate) {
                    // Schedule the next update
                    setTimeout(() => {
                      get()
                        .saveFlightData(nextUpdate.phase, nextUpdate.data)
                        .then(nextUpdate.resolve);
                    }, 0);
                  }
                }

                state._isUpdating = false;
                state._lastUpdate = Date.now();
              })
            );

            resolve();
          } catch (error) {
            console.error("=== FlightStore - Error Saving Data ===", {
              phase,
              error,
              timestamp: new Date().toISOString(),
            });
            resolve();
          }
        });
      },

      getFlightData: (phase: number) => {
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
                // Update store with localStorage data
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

          // Clear any phase 1-3 data from localStorage
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("flightData_phase1");
              localStorage.removeItem("flightData_phase2");
              localStorage.removeItem("flightData_phase3");
              localStorage.removeItem("phase1State");
              localStorage.removeItem("phase2State");
              localStorage.removeItem("phase3State");
              localStorage.removeItem("phase1FlightData");
              localStorage.removeItem("phase2FlightData");
              localStorage.removeItem("phase3FlightData");
            } catch (e) {
              console.error("Error clearing localStorage:", e);
            }
          }

          return phase4Data || null;
        }

        // For phases 1-3, use the existing logic
        // Try to get from store first
        let data = state.flightData[phase];

        // If not in store, try localStorage
        if (!data && typeof window !== "undefined") {
          const phaseKey = `flightData_phase${phase}`;
          const stored = localStorage.getItem(phaseKey);
          if (stored) {
            try {
              data = JSON.parse(stored);
              // Update store with localStorage data
              if (!state._isUpdating) {
                set({
                  _isUpdating: true,
                  flightData: {
                    ...state.flightData,
                    [phase]: data,
                  },
                });
                set({ _isUpdating: false });
              }
            } catch (e) {
              console.error(
                `Error parsing stored flight data for phase ${phase}:`,
                e
              );
            }
          }
        }

        return data || null;
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
        return get().originalFlights.find((flight) => flight.id === id);
      },
    }),
    {
      name: "flight-store",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
