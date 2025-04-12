"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { SpeechBubble } from "@/components/SpeechBubble";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { BackButton } from "@/components/shared/BackButton";
import { AccordionCard } from "@/components/shared/AccordionCard";
import { ModularFlightSelector } from "@/components/booking/ModularFlightSelector";
import useStore, { getLanguageAwareUrl } from "@/lib/state/store";
import { useTranslation } from "@/hooks/useTranslation";
import { useFlightStore } from "@/lib/state/flightStore";
import { usePhase4Store } from "@/lib/state/phase4Store";
import { ContinueButton } from "@/components/shared/ContinueButton";
import type { Flight, FlightSegmentData } from "@/types/store";
import type { Store } from "@/lib/state/store";
import type {
  FlightSegment,
  ValidationState,
  ValidationStep,
} from "@/lib/state/types";
import type { LocationLike } from "@/types/location";
import { useCallback } from "react";
import { accordionConfig } from "@/config/accordion";
import { formatDateForDisplay } from "@/utils/dateUtils";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo } from "react";
import { UserIcon } from "@heroicons/react/24/solid";

// Define FlightData interface here based on the structure used in the file
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

interface ExtendedStore extends Store {
  bookingNumber: string;
  setBookingNumber: (value: string) => void;
  directFlight: FlightSegment;
  initialAccordion: string | null;
  isFirstVisit: boolean;
}

interface EnhancedFlightData extends Partial<FlightData> {
  _parsedDates?: boolean;
  _lastParsed?: number;
  _copiedFromPhase2?: boolean;
}

// Helper function to ensure location is both string and LocationLike
const ensureStringAndLocationLike = (
  location: LocationLike | null
): (string & LocationLike) | null => {
  if (!location) return null;
  const stringLocation = location.value || "";
  return Object.assign(String(stringLocation), {
    value: location.value || "",
    label: location.label || "",
    description: location.description || "",
    city: location.city || "",
    dropdownLabel: location.dropdownLabel || "",
  }) as string & LocationLike;
};

// Helper function to parse dates in flight segments
const parseFlightSegmentDates = (segments: any[]): any[] => {
  if (!segments || !Array.isArray(segments)) return segments;

  return segments.map((segment) => {
    if (!segment) return segment;

    // Convert date strings to Date objects
    let parsedDate = null;
    let parsedSelectedFlight = segment.selectedFlight
      ? { ...segment.selectedFlight }
      : null;

    if (segment.date) {
      try {
        if (typeof segment.date === "string") {
          // Handle dd.MM.yyyy format
          if (segment.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = segment.date.split(".").map(Number);
            parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
          }
          // Handle ISO date format
          else if (segment.date.includes("T") || segment.date.includes("-")) {
            parsedDate = new Date(segment.date);
          }

          // Ensure date is valid
          if (parsedDate && !isNaN(parsedDate.getTime())) {
            console.log(
              `[Flight Details] Parsed date string "${segment.date}" to Date object:`,
              parsedDate
            );
          } else {
            console.error(
              `[Flight Details] Failed to parse date string: ${segment.date}`
            );
            parsedDate = null;
          }
        } else if (segment.date instanceof Date) {
          parsedDate = segment.date;
        }
      } catch (error) {
        console.error(
          "[Flight Details] Error parsing date:",
          error,
          segment.date
        );
      }
    }

    // Also parse selectedFlight date if present
    if (parsedSelectedFlight && parsedSelectedFlight.date) {
      try {
        if (typeof parsedSelectedFlight.date === "string") {
          let parsedFlightDate = null;
          // Handle dd.MM.yyyy format
          if (parsedSelectedFlight.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = parsedSelectedFlight.date
              .split(".")
              .map(Number);
            parsedFlightDate = new Date(
              Date.UTC(year, month - 1, day, 12, 0, 0, 0)
            );
          }
          // Handle ISO date format
          else if (
            parsedSelectedFlight.date.includes("T") ||
            parsedSelectedFlight.date.includes("-")
          ) {
            parsedFlightDate = new Date(parsedSelectedFlight.date);
          }

          // Update selectedFlight with parsed date
          if (parsedFlightDate && !isNaN(parsedFlightDate.getTime())) {
            console.log(
              `[Flight Details] Parsed selectedFlight date "${parsedSelectedFlight.date}" to Date object:`,
              parsedFlightDate
            );
            parsedSelectedFlight = {
              ...parsedSelectedFlight,
              date: parsedFlightDate,
            };
          }
        }
      } catch (error) {
        console.error(
          "[Flight Details] Error parsing selectedFlight date:",
          error,
          parsedSelectedFlight.date
        );
      }
    }

    // We explicitly don't set a fallback date per user request

    return {
      ...segment,
      date: parsedDate,
      selectedFlight: parsedSelectedFlight,
    };
  });
};

// New helper function to ensure all segments have required fields
const ensureSegmentFields = (segments: any[]): any[] => {
  if (!segments || !Array.isArray(segments)) return segments;

  return segments.map((segment) => {
    // Make sure we have a properly structured segment
    return {
      fromLocation: segment.fromLocation || null,
      toLocation: segment.toLocation || null,
      date: segment.date || null,
      selectedFlight: segment.selectedFlight || null,
    };
  });
};

export default function FlightDetailsPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [mounted, setMounted] = useState<boolean>(false);
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const [isBookingInputFocused, setIsBookingInputFocused] =
    useState<boolean>(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [openSteps, setOpenSteps] = useState<number[]>(() => {
    // Always open step 1 by default in phase 3
    return [1];
  });
  const processedSharedDataRef = useRef(false);

  const storeBase = useStore();
  const store = {
    ...storeBase,
    initialAccordion: null,
  } as ExtendedStore;
  const flightStore = useFlightStore();
  const phase4Store = usePhase4Store();

  // Get all required store values
  const {
    selectedFlights,
    setCurrentPhase,
    setBookingNumber,
    bookingNumber,
    completePhase,
    validationState,
    updateValidationState,
    flightSegments,
    directFlight,
    selectedType,
    isFirstVisit,
  } = store;

  // Initialize component
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializePhase = async () => {
      // Skip initialization if already initialized
      if (dataLoaded) return;

      // Try to get phase 3 state from localStorage
      let storedPhase3State = null;
      let storedFlightStoreData = null;
      let phase3FlightData = null;

      console.log("=== Flight Details - Starting Initialization ===", {
        timestamp: new Date().toISOString(),
      });

      // Check for shared flight data in URL directly (highest priority)
      let sharedFlightData = null;
      try {
        if (typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const sharedFlightParam = urlParams.get("shared_flight");

          if (sharedFlightParam) {
            console.log(
              "=== Flight Details - Found shared_flight param in URL ===",
              {
                timestamp: new Date().toISOString(),
              }
            );

            const decodedData = decodeURIComponent(sharedFlightParam);
            sharedFlightData = JSON.parse(decodedData);

            if (sharedFlightData._sharedClaim) {
              console.log(
                "=== Flight Details - Processing shared flight data ===",
                {
                  fromLocation:
                    sharedFlightData.fromLocation?.value ||
                    sharedFlightData.fromLocation,
                  toLocation:
                    sharedFlightData.toLocation?.value ||
                    sharedFlightData.toLocation,
                  segmentCount: sharedFlightData.flightSegments?.length || 0,
                  timestamp: new Date().toISOString(),
                }
              );

              // Process flight segments with proper date handling
              if (sharedFlightData.flightSegments?.length > 0) {
                const processedSegments = sharedFlightData.flightSegments.map(
                  (segment: any) => {
                    // Parse segment date
                    let parsedDate = null;
                    if (segment.date) {
                      try {
                        if (typeof segment.date === "string") {
                          // Handle DD.MM.YYYY format
                          if (segment.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                            const [day, month, year] = segment.date
                              .split(".")
                              .map(Number);
                            parsedDate = new Date(
                              Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                            );
                            console.log(
                              `Parsed DD.MM.YYYY date: ${segment.date} to:`,
                              parsedDate
                            );
                          }
                          // Handle ISO format
                          else if (
                            segment.date.includes("T") ||
                            segment.date.includes("-")
                          ) {
                            parsedDate = new Date(segment.date);
                            console.log(
                              `Parsed ISO date: ${segment.date} to:`,
                              parsedDate
                            );
                          }
                        } else if (segment.date instanceof Date) {
                          parsedDate = segment.date;
                        }
                      } catch (error) {
                        console.error("Error parsing segment date:", error);
                      }
                    }

                    // Parse selected flight date if present
                    let selectedFlight = segment.selectedFlight
                      ? { ...segment.selectedFlight }
                      : null;
                    if (selectedFlight && selectedFlight.date) {
                      try {
                        if (typeof selectedFlight.date === "string") {
                          // Handle DD.MM.YYYY format
                          if (
                            selectedFlight.date.match(/^\d{2}\.\d{2}\.\d{4}$/)
                          ) {
                            const [day, month, year] = selectedFlight.date
                              .split(".")
                              .map(Number);
                            const flightDate = new Date(
                              Date.UTC(year, month - 1, day, 12, 0, 0, 0)
                            );
                            selectedFlight.date = flightDate;
                            console.log(
                              `Parsed selected flight DD.MM.YYYY date: ${selectedFlight.date} to:`,
                              flightDate
                            );
                          }
                          // Handle ISO format
                          else if (
                            selectedFlight.date.includes("T") ||
                            selectedFlight.date.includes("-")
                          ) {
                            const flightDate = new Date(selectedFlight.date);
                            selectedFlight.date = flightDate;
                            console.log(
                              `Parsed selected flight ISO date: ${selectedFlight.date} to:`,
                              flightDate
                            );
                          }
                        }
                      } catch (error) {
                        console.error("Error parsing flight date:", error);
                      }
                    }

                    // If the segment has no date but the flight does, use the flight's date
                    if (!parsedDate && selectedFlight?.date instanceof Date) {
                      parsedDate = selectedFlight.date;
                      console.log("Using flight date for segment:", parsedDate);
                    }

                    // Handle locations if they're strings
                    const fromLocation =
                      typeof segment.fromLocation === "string"
                        ? {
                            value: segment.fromLocation,
                            label: segment.fromLocation,
                            city: segment.fromLocation,
                            description: segment.fromLocation,
                            dropdownLabel: segment.fromLocation,
                          }
                        : segment.fromLocation;

                    const toLocation =
                      typeof segment.toLocation === "string"
                        ? {
                            value: segment.toLocation,
                            label: segment.toLocation,
                            city: segment.toLocation,
                            description: segment.toLocation,
                            dropdownLabel: segment.toLocation,
                          }
                        : segment.toLocation;

                    return {
                      ...segment,
                      fromLocation,
                      toLocation,
                      date: parsedDate,
                      selectedFlight,
                    };
                  }
                );

                sharedFlightData.flightSegments = processedSegments;
              }

              // Set this as our source of truth
              store.batchUpdateWizardState({
                fromLocation: sharedFlightData.fromLocation,
                toLocation: sharedFlightData.toLocation,
                selectedType: sharedFlightData.selectedType || "direct",
                flightSegments: sharedFlightData.flightSegments || [],
                _lastUpdate: Date.now(),
              });

              // Save to flightStore for phase 3
              flightStore.saveFlightData(3, {
                fromLocation: sharedFlightData.fromLocation,
                toLocation: sharedFlightData.toLocation,
                selectedType: sharedFlightData.selectedType || "direct",
                flightSegments: sharedFlightData.flightSegments || [],
                selectedFlights:
                  sharedFlightData.flightSegments
                    ?.filter((seg: any) => seg.selectedFlight)
                    .map((seg: any) => seg.selectedFlight) || [],
                timestamp: Date.now(),
              });

              // Also save to localStorage for redundancy
              localStorage.setItem(
                "phase3State",
                JSON.stringify({
                  fromLocation: sharedFlightData.fromLocation,
                  toLocation: sharedFlightData.toLocation,
                  selectedType: sharedFlightData.selectedType || "direct",
                  flightSegments: sharedFlightData.flightSegments,
                  _sharedClaimData: true,
                  _processedInFlightDetails: true,
                  timestamp: Date.now(),
                })
              );

              // Mark as data loaded since we have everything we need
              console.log(
                "=== Flight Details - Used shared flight data from URL ===",
                {
                  segmentCount: sharedFlightData.flightSegments?.length || 0,
                  timestamp: new Date().toISOString(),
                }
              );

              // Set mounted and dataLoaded to true
              setMounted(true);
              setDataLoaded(true);
              return; // Skip the rest of initialization since we have all the data we need
            }
          }
        }
      } catch (error) {
        console.error("Error processing shared flight data from URL:", error);
      }

      // Try to recover data from localStorage and flightStore
      try {
        // First check for phase3State in localStorage
        const phase3StateStr = localStorage.getItem("phase3State");
        if (phase3StateStr) {
          try {
            storedPhase3State = JSON.parse(phase3StateStr);
            console.log("=== Flight Details - Found Phase 3 State ===", {
              hasFlightSegments: !!storedPhase3State?.flightSegments,
              hasSelectedFlights: !!storedPhase3State?.selectedFlights,
              timestamp: new Date().toISOString(),
            });

            // Parse dates in the phase3State flight segments
            if (storedPhase3State?.flightSegments?.length > 0) {
              const parsedSegments = parseFlightSegmentDates(
                storedPhase3State.flightSegments
              );

              // Create a new object with the parsed segments instead of modifying directly
              storedPhase3State = {
                ...storedPhase3State,
                flightSegments: parsedSegments,
              };

              console.log(
                "=== Flight Details - Parsed dates in phase3State ===",
                {
                  segmentCount: parsedSegments.length,
                  firstSegmentDate: parsedSegments[0]?.date,
                  timestamp: new Date().toISOString(),
                }
              );

              // Also persist back to localStorage with parsed dates to help in future reloads
              localStorage.setItem(
                "phase3State",
                JSON.stringify({
                  ...storedPhase3State,
                  flightSegments: parsedSegments,
                  _parsedDates: true,
                  _lastParsed: Date.now(),
                })
              );
            }
          } catch (error) {
            console.error("Error parsing phase3State:", error);
          }
        }

        // Second, check flight store data for phase 3
        try {
          storedFlightStoreData = flightStore.getFlightData(3);
          if (
            storedFlightStoreData &&
            storedFlightStoreData.flightSegments?.length > 0
          ) {
            console.log("=== Flight Details - Found Flight Store Data ===", {
              hasSegments: !!storedFlightStoreData.flightSegments,
              hasSelectedFlights:
                !!storedFlightStoreData.selectedFlights &&
                storedFlightStoreData.selectedFlights.length > 0,
              timestamp: new Date().toISOString(),
            });

            // Parse dates in flightStore segments too
            const parsedSegments = parseFlightSegmentDates(
              storedFlightStoreData.flightSegments
            );

            // Create a new object with the parsed segments instead of modifying directly
            storedFlightStoreData = {
              ...storedFlightStoreData,
              flightSegments: parsedSegments,
            };

            console.log(
              "=== Flight Details - Parsed dates in flightStore data ===",
              {
                segmentCount: parsedSegments.length,
                firstSegmentDate: parsedSegments[0]?.date,
                timestamp: new Date().toISOString(),
              }
            );

            // Save the parsed segments back to the flightStore
            flightStore.saveFlightData(3, {
              ...(storedFlightStoreData || {}),
              flightSegments: parsedSegments,
              timestamp: Date.now(),
            } as EnhancedFlightData);
          }
        } catch (error) {
          console.error("Error processing flightStore data:", error);
        }

        // Third, check for phase3FlightData in localStorage
        try {
          const phase3FlightDataStr = localStorage.getItem("phase3FlightData");
          if (phase3FlightDataStr) {
            phase3FlightData = JSON.parse(phase3FlightDataStr);

            if (phase3FlightData?.flightSegments?.length > 0) {
              console.log(
                "=== Flight Details - Found Phase 3 Flight Data ===",
                {
                  segmentCount: phase3FlightData.flightSegments.length,
                  hasSelectedFlights:
                    !!phase3FlightData.selectedFlights &&
                    phase3FlightData.selectedFlights.length > 0,
                  timestamp: new Date().toISOString(),
                }
              );

              // Parse dates in phase3FlightData segments
              const parsedSegments = parseFlightSegmentDates(
                phase3FlightData.flightSegments
              );

              // Create a new object with the parsed segments instead of modifying directly
              phase3FlightData = {
                ...phase3FlightData,
                flightSegments: parsedSegments,
              };

              // Save back to localStorage with parsed dates
              localStorage.setItem(
                "phase3FlightData",
                JSON.stringify({
                  ...phase3FlightData,
                  flightSegments: parsedSegments,
                  _parsedDates: true,
                  _lastParsed: Date.now(),
                })
              );
            }
          }
        } catch (error) {
          console.error("Error processing phase3FlightData:", error);
        }

        // Fourth, check for flightData_phase3 in localStorage
        try {
          const flightDataPhase3Str = localStorage.getItem("flightData_phase3");
          if (flightDataPhase3Str) {
            const flightDataPhase3 = JSON.parse(flightDataPhase3Str);

            if (flightDataPhase3?.flightSegments?.length > 0) {
              console.log("=== Flight Details - Found flightData_phase3 ===", {
                segmentCount: flightDataPhase3.flightSegments.length,
                timestamp: new Date().toISOString(),
              });

              // Parse dates in flightData_phase3 segments
              const parsedSegments = parseFlightSegmentDates(
                flightDataPhase3.flightSegments
              );

              // Save back to localStorage with parsed dates
              localStorage.setItem(
                "flightData_phase3",
                JSON.stringify({
                  ...flightDataPhase3,
                  flightSegments: parsedSegments,
                  _parsedDates: true,
                  _lastParsed: Date.now(),
                })
              );
            }
          }
        } catch (error) {
          console.error("Error processing flightData_phase3:", error);
        }

        // Try to extract data from phase2State as a last resort
        try {
          const phase2StateStr = localStorage.getItem("phase2State");
          if (phase2StateStr) {
            const phase2State = JSON.parse(phase2StateStr);

            if (phase2State?.flightSegments?.length > 0) {
              console.log("=== Flight Details - Found Phase 2 State ===", {
                segmentCount: phase2State.flightSegments.length,
                timestamp: new Date().toISOString(),
              });

              // Copy phase2State data to phase3State if we have no phase3 data yet
              if (!storedPhase3State?.flightSegments) {
                const parsedSegments = parseFlightSegmentDates(
                  phase2State.flightSegments
                );

                const newPhase3State = {
                  ...phase2State,
                  flightSegments: parsedSegments,
                  _copiedFromPhase2: true,
                  _parsedDates: true,
                  timestamp: Date.now(),
                };

                // Save to localStorage
                localStorage.setItem(
                  "phase3State",
                  JSON.stringify(newPhase3State)
                );

                // Also update our local variable
                storedPhase3State = newPhase3State;
              }
            }
          }
        } catch (error) {
          console.error("Error processing phase2State:", error);
        }
      } catch (error) {
        console.error("Error during data recovery:", error);
      }

      // Now prioritize which data source to use based on completeness
      // We prefer flightStore data if it has selected flights
      if (
        storedFlightStoreData?.selectedFlights &&
        storedFlightStoreData.selectedFlights.length > 0
      ) {
        console.log(
          "=== Flight Details - Using Flight Store Data (has selected flights) ===",
          {
            segmentCount: storedFlightStoreData.flightSegments?.length || 0,
            selectedFlights: storedFlightStoreData.selectedFlights?.length || 0,
            hasFromLocation: !!storedFlightStoreData.fromLocation,
            hasToLocation: !!storedFlightStoreData.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // Update store with flightStoreData
        await store.batchUpdateWizardState({
          selectedType: storedFlightStoreData.selectedType || "direct",
          flightSegments: storedFlightStoreData.flightSegments || [],
          fromLocation: storedFlightStoreData.fromLocation || null,
          toLocation: storedFlightStoreData.toLocation || null,
          _lastUpdate: Date.now(),
        });
      }
      // Next preference: phase3State data if it has flightSegments
      else if (storedPhase3State?.flightSegments?.length > 0) {
        console.log("=== Flight Details - Using Phase 3 State ===", {
          segmentCount: storedPhase3State.flightSegments.length,
          hasFromLocation: !!storedPhase3State.fromLocation,
          hasToLocation: !!storedPhase3State.toLocation,
          timestamp: new Date().toISOString(),
        });

        // Update store with phase3State
        await store.batchUpdateWizardState({
          selectedType: storedPhase3State.selectedType || "direct",
          flightSegments: storedPhase3State.flightSegments,
          fromLocation: storedPhase3State.fromLocation,
          toLocation: storedPhase3State.toLocation,
          _lastUpdate: Date.now(),
        });

        // Also update flightStore for consistency
        flightStore.saveFlightData(3, {
          selectedType: storedPhase3State.selectedType || "direct",
          flightSegments: storedPhase3State.flightSegments,
          fromLocation: storedPhase3State.fromLocation,
          toLocation: storedPhase3State.toLocation,
          timestamp: Date.now(),
        });

        // Add a backup check for missing locations - try phase 2 data for this
        if (!storedPhase3State.fromLocation || !storedPhase3State.toLocation) {
          try {
            const phase2StateStr = localStorage.getItem("phase2State");
            if (phase2StateStr) {
              const phase2State = JSON.parse(phase2StateStr);
              console.log(
                "=== Flight Details - Phase 3 missing locations, checking Phase 2 ===",
                {
                  phase2FromLocation: !!phase2State?.fromLocation,
                  phase2ToLocation: !!phase2State?.toLocation,
                  timestamp: new Date().toISOString(),
                }
              );

              // If phase 2 has locations that phase 3 is missing, get them
              if (phase2State.fromLocation && !storedPhase3State.fromLocation) {
                console.log("Recovering fromLocation from phase2State");
                store.setFromLocation(phase2State.fromLocation);
              }

              if (phase2State.toLocation && !storedPhase3State.toLocation) {
                console.log("Recovering toLocation from phase2State");
                store.setToLocation(phase2State.toLocation);
              }

              // Add a special block to ensure locations are saved to flightStore
              flightStore.saveFlightData(3, {
                fromLocation:
                  phase2State.fromLocation || storedPhase3State.fromLocation,
                toLocation:
                  phase2State.toLocation || storedPhase3State.toLocation,
                timestamp: Date.now(),
              });
            }
          } catch (error) {
            console.error("Error recovering locations from phase2:", error);
          }
        }
      }

      // Add a final check to see what the store state looks like after initialization
      console.log("=== Flight Details - Final State After Initialization ===", {
        fromLocation: store.fromLocation ? typeof store.fromLocation : "null",
        toLocation: store.toLocation ? typeof store.toLocation : "null",
        flightSegments: store.flightSegments?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Final fallback for missing locations
      if (!store.fromLocation || !store.toLocation) {
        try {
          const phase2StateStr = localStorage.getItem("phase2State");
          if (phase2StateStr) {
            const phase2State = JSON.parse(phase2StateStr);
            console.log(
              "=== Flight Details - Final location recovery attempt ===",
              {
                hasPhase2FromLocation: !!phase2State?.fromLocation,
                hasPhase2ToLocation: !!phase2State?.toLocation,
                timestamp: new Date().toISOString(),
              }
            );

            // Recovery: update the store with any locations from phase2
            if (phase2State?.fromLocation && !store.fromLocation) {
              console.log("=== Final fromLocation recovery from phase2 ===");
              store.setFromLocation(phase2State.fromLocation);
            }

            if (phase2State?.toLocation && !store.toLocation) {
              console.log("=== Final toLocation recovery from phase2 ===");
              store.setToLocation(phase2State.toLocation);
            }

            // CRITICAL FIX: Explicitly check if Phase 2 was using multi-segment BEFORE doing any other data processing
            const wasPhase2Multi =
              phase2State.selectedType === "multi" ||
              (phase2State.flightSegments &&
                phase2State.flightSegments.length > 1);

            // Get phase 1 data for direct flight detection
            const phase1Data = flightStore.getFlightData(1);

            if (wasPhase2Multi) {
              console.log(
                "=== CRITICAL FIX: Detected multi-segment in Phase 2 ===",
                {
                  selectedType: phase2State.selectedType,
                  segmentCount: phase2State.flightSegments?.length || 0,
                  timestamp: new Date().toISOString(),
                }
              );

              // Set LOCAL STORAGE flags to ensure persistence
              localStorage.setItem("_wasPhase2Multi", "true");
              localStorage.setItem("_preserveMultiSegmentPhase3", "true");

              // Force the store to use multi-segment before saving data
              store.setSelectedType("multi");

              // Make sure we have at least 2 segments
              if (
                !phase2State.flightSegments ||
                phase2State.flightSegments.length < 2
              ) {
                const segments = [...(phase2State.flightSegments || [])];

                // If we have no segments, create a first one with the from location
                if (segments.length === 0) {
                  segments.push({
                    fromLocation: phase2State.fromLocation,
                    toLocation: null,
                    date: null,
                    selectedFlight: null,
                  });
                }

                // Always ensure we have a second segment
                if (segments.length === 1) {
                  segments.push({
                    fromLocation: segments[0].toLocation || null,
                    toLocation: phase2State.toLocation,
                    date: null,
                    selectedFlight: null,
                  });
                }

                // Set these segments to the store
                store.setFlightSegments(segments);
              }
            }

            // Make sure these recovered locations are saved for next time
            // CRITICAL FIX: Ensure we use the correct selectedType from our detection
            const finalSelectedType = wasPhase2Multi
              ? "multi"
              : phase1Data?.selectedType === "direct"
              ? "direct"
              : store.selectedType || phase2State.selectedType || "direct";

            const finalData = {
              fromLocation: store.fromLocation || phase2State.fromLocation,
              toLocation: store.toLocation || phase2State.toLocation,
              flightSegments:
                store.flightSegments?.length > 0
                  ? store.flightSegments
                  : phase2State.flightSegments || [],
              selectedType: finalSelectedType,
              _isMultiSegment: finalSelectedType === "multi",
              _preserveFlightSegments: finalSelectedType === "multi",
              timestamp: Date.now(),
            };

            // Save to both flightStore and localStorage
            flightStore.saveFlightData(3, finalData);
            localStorage.setItem(
              "phase3State",
              JSON.stringify({
                ...finalData,
                _wasPhase2Multi: wasPhase2Multi,
              })
            );

            console.log("=== Saved final recovery data ===", {
              hasFromLocation: !!finalData.fromLocation,
              hasToLocation: !!finalData.toLocation,
              selectedType: finalData.selectedType,
              _isMultiSegment: finalData._isMultiSegment,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("Error in final location recovery:", error);
        }
      }

      // Continue with rest of initialization
      // ... existing initialization code ...

      // Check if we're navigating from phase 2 to phase 3
      const isNavigatingToPhase3 =
        typeof window !== "undefined" &&
        localStorage.getItem("navigating_to_phase3") === "true";

      if (isNavigatingToPhase3) {
        console.log(
          "=== Detected Forward Navigation from Phase 2 to Phase 3 ===",
          {
            timestamp: new Date().toISOString(),
          }
        );

        // Clear the flag
        localStorage.removeItem("navigating_to_phase3");

        // Ensure the first step is open and marked as interacted
        setOpenSteps([1]);
        setInteractedSteps([1]);

        // Force the validation state to mark step 1 as interacted
        if (store.validationState) {
          store.updateValidationState({
            stepInteraction: {
              ...store.validationState.stepInteraction,
              1: true,
            },
            _timestamp: Date.now(),
          });
        }
      }

      // Clear the deletedFlightIds array
      let deletedFlightIds: string[] = [];
      try {
        const deletedFlightsStr = localStorage.getItem(
          "phase3_deleted_flights"
        );
        if (deletedFlightsStr) {
          deletedFlightIds = JSON.parse(deletedFlightsStr);
          console.log(
            "=== Flight Details - Initialization with Deleted Flights ===",
            {
              count: deletedFlightIds.length,
              ids: deletedFlightIds,
              timestamp: new Date().toISOString(),
            }
          );
        }
      } catch (e) {
        console.error("Error parsing deleted flights:", e);
      }

      // Check if we have a phase3State in localStorage
      let existingState: any = null;
      try {
        const phase3StateStr = localStorage.getItem("phase3State");
        if (phase3StateStr) {
          existingState = JSON.parse(phase3StateStr);
          console.log("=== Flight Details - Found Phase 3 State ===", {
            hasFlightSegments: !!existingState?.flightSegments,
            hasSelectedFlights: !!existingState?.selectedFlights,
            timestamp: new Date().toISOString(),
          });

          // Parse dates in flight segments
          if (
            existingState?.flightSegments &&
            Array.isArray(existingState.flightSegments)
          ) {
            const updatedSegments = ensureSegmentFields(
              parseFlightSegmentDates(existingState.flightSegments)
            );

            // Create a new object with parsed segment dates
            existingState = {
              ...existingState,
              flightSegments: updatedSegments,
            };
            console.log(
              "=== Flight Details - Parsed dates in phase3State ===",
              {
                segmentCount: existingState.flightSegments.length,
                firstSegmentDate: existingState.flightSegments[0]?.date,
                timestamp: new Date().toISOString(),
              }
            );
          }
        }
      } catch (e) {
        console.error("Error parsing phase3State:", e);
      }

      // Check if we have flightStore data for phase 3
      let initialFlightStoreData = flightStore.getFlightData(3);
      if (initialFlightStoreData) {
        console.log("=== Flight Details - Found Flight Store Data ===", {
          hasSegments: !!initialFlightStoreData.flightSegments,
          hasSelectedFlights: !!initialFlightStoreData.selectedFlights,
          timestamp: new Date().toISOString(),
        });

        // Parse dates in flight segments
        if (
          initialFlightStoreData.flightSegments &&
          Array.isArray(initialFlightStoreData.flightSegments)
        ) {
          // Create a new object instead of modifying the read-only property
          initialFlightStoreData = {
            ...initialFlightStoreData,
            flightSegments: ensureSegmentFields(
              parseFlightSegmentDates(initialFlightStoreData.flightSegments)
            ),
          };

          console.log(
            "=== Flight Details - Parsed dates in flightStore data ===",
            {
              segmentCount: initialFlightStoreData.flightSegments.length,
              firstSegmentDate: initialFlightStoreData.flightSegments[0]?.date,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }

      // Apply any deleted flights to the flightStore data
      if (deletedFlightIds.length > 0 && initialFlightStoreData) {
        // Filter out deleted flights from selectedFlights
        const updatedSelectedFlights =
          initialFlightStoreData.selectedFlights?.filter(
            (flight) => !deletedFlightIds.includes(flight.id)
          ) || [];

        // Remove deleted flights from flight segments
        const updatedFlightSegments =
          initialFlightStoreData.flightSegments?.map((segment) => {
            if (
              segment.selectedFlight &&
              deletedFlightIds.includes(segment.selectedFlight.id)
            ) {
              return { ...segment, selectedFlight: null };
            }
            return segment;
          }) || [];

        // Save the updated data back to the flightStore
        flightStore.saveFlightData(3, {
          ...initialFlightStoreData,
          selectedFlights: updatedSelectedFlights,
          flightSegments: updatedFlightSegments,
          // Preserve the selectedType from the initial data
          selectedType: initialFlightStoreData.selectedType,
          // Set the preserve flag to avoid losing multi-segment information
          _preserveFlightSegments:
            initialFlightStoreData.selectedType === "multi",
          _isMultiSegment: initialFlightStoreData.selectedType === "multi",
          timestamp: Date.now(),
        });

        console.log(
          "=== Flight Details - Applied Deleted Flights to FlightStore ===",
          {
            remainingFlights: updatedSelectedFlights.length,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Check if we have phase 3 state in localStorage
      const phase3State = localStorage.getItem("phase3FlightData");
      if (phase3State) {
        console.log("=== Flight Details - Found Phase 3 State ===", {
          hasFlightSegments: true,
          hasSelectedFlights:
            JSON.parse(phase3State).selectedFlights?.length > 0,
          timestamp: new Date().toISOString(),
        });
      }

      // Check if we have flight store data for phase 3
      const flightStoreData = flightStore.getFlightData(3);
      console.log("=== Flight Details - Found Flight Store Data ===", {
        hasSegments:
          flightStoreData?.flightSegments &&
          flightStoreData.flightSegments.length > 0,
        hasSelectedFlights:
          flightStoreData?.selectedFlights &&
          flightStoreData.selectedFlights.length > 0,
        timestamp: new Date().toISOString(),
      });

      try {
        // First set mounted to true immediately to display the base UI
        setMounted(true);

        // First try to get existing state
        let existingState: {
          flightSegments?: FlightSegmentData[];
          selectedFlights?: Flight[];
          bookingNumber?: string;
        } | null = null;
        try {
          const phase3State = localStorage.getItem("phase3State");
          if (phase3State) {
            existingState = JSON.parse(phase3State);
            console.log("=== Flight Details - Found Phase 3 State ===", {
              hasFlightSegments:
                existingState?.flightSegments &&
                existingState.flightSegments.length > 0,
              hasSelectedFlights:
                existingState?.selectedFlights &&
                existingState.selectedFlights.length > 0,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Error parsing phase3State:", e);
        }

        // Set current phase
        await setCurrentPhase(3);

        // Get current store state
        const currentState = useStore.getState();

        // Check if we came from phase 2 with a multi-segment selection
        const phase2StateStr = localStorage.getItem("phase2State");
        let isMultiSegmentFromPhase2 = false;

        if (phase2StateStr) {
          try {
            const parsedPhase2State = JSON.parse(phase2StateStr);
            isMultiSegmentFromPhase2 =
              parsedPhase2State.selectedType === "multi" &&
              parsedPhase2State.flightSegments?.length > 1;

            if (isMultiSegmentFromPhase2) {
              console.log(
                "=== Detected Forward Navigation from Phase 2 to Phase 3 ===",
                {
                  timestamp: new Date().toISOString(),
                }
              );
            }
          } catch (e) {
            console.error("Error parsing phase2State:", e);
          }
        }

        // Check if we need to fetch data from flightStore
        let flightStoreData: {
          flightSegments?: FlightSegmentData[];
          selectedFlights?: Flight[];
          selectedDate?: string | null;
          selectedType?: "direct" | "multi";
          fromLocation?: any;
          toLocation?: any;
          timestamp?: number;
        } | null = null;
        try {
          flightStoreData = flightStore.getFlightData(3);
          if (flightStoreData) {
            console.log("=== Flight Details - Found Flight Store Data ===", {
              hasSegments:
                flightStoreData.flightSegments &&
                flightStoreData.flightSegments.length > 0,
              hasSelectedFlights:
                flightStoreData.selectedFlights &&
                flightStoreData.selectedFlights.length > 0,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.error("Error getting flight store data:", e);
        }

        // Get the best location data
        const { fromLocation, toLocation } = getBestLocationData();

        // Ensure we have valid flight segments by checking all available sources
        let finalFlightSegments = currentState.flightSegments;

        // First check if flightStore has valid segments
        if (
          flightStoreData &&
          flightStoreData.flightSegments &&
          flightStoreData.flightSegments.length > 0
        ) {
          // Process the segments using our helper functions
          const processedSegments = ensureSegmentFields(
            parseFlightSegmentDates(flightStoreData.flightSegments)
          );

          // Make a deep copy of the segments and ensure they have location data
          finalFlightSegments = processedSegments.map((segment) => {
            // Check if this segment has a flight that's been deleted
            if (
              segment.selectedFlight &&
              deletedFlightIds.includes(segment.selectedFlight.id)
            ) {
              // If the flight was deleted, return the segment without the flight
              console.log(
                "=== Flight Details - Removed deleted flight from segment ===",
                {
                  flightId: segment.selectedFlight.id,
                  timestamp: new Date().toISOString(),
                }
              );

              return {
                ...segment,
                selectedFlight: null, // Clear the deleted flight
                fromLocation: segment.fromLocation || fromLocation,
                toLocation: segment.toLocation || toLocation,
              };
            }

            // Normal case - keep the segment with its flight
            return {
              ...segment,
              fromLocation: segment.fromLocation || fromLocation,
              toLocation: segment.toLocation || toLocation,
            };
          });

          console.log("=== Flight Details - Using Flight Store Segments ===", {
            segmentCount: finalFlightSegments.length,
            selectedType: flightStoreData.selectedType || "direct",
            segmentDetails: finalFlightSegments.map((seg) => ({
              fromLocation:
                typeof seg.fromLocation === "string"
                  ? seg.fromLocation
                  : seg.fromLocation?.value,
              toLocation:
                typeof seg.toLocation === "string"
                  ? seg.toLocation
                  : seg.toLocation?.value,
              date: seg.date,
              hasFlight: !!seg.selectedFlight,
            })),
            timestamp: new Date().toISOString(),
          });

          // Make sure to update the selectedType if it's multi-segment
          if (
            (flightStoreData.selectedType === "multi" &&
              finalFlightSegments.length > 1) ||
            finalFlightSegments.length > 1 ||
            isMultiSegmentFromPhase2
          ) {
            // Only update if the current type is not already 'multi'
            if (store.selectedType !== "multi") {
              console.log(
                "=== Flight Details - Setting flight type to multi ===",
                {
                  reason: isMultiSegmentFromPhase2
                    ? "phase2_was_multi"
                    : "has_multiple_segments",
                  segmentCount: finalFlightSegments.length,
                  timestamp: new Date().toISOString(),
                }
              );

              store.setSelectedType("multi");

              // Also ensure that flightStore has the correct type
              flightStore.saveFlightData(3, {
                selectedType: "multi",
                _isMultiSegment: true,
                _preserveFlightSegments: true,
                timestamp: Date.now(),
              });
            }
          }
        }
        // Then check if phase3State has valid segments
        else if (
          existingState?.flightSegments &&
          existingState.flightSegments.length > 0
        ) {
          // Process the segments using our helper functions
          const processedSegments = ensureSegmentFields(
            parseFlightSegmentDates(existingState.flightSegments)
          );

          // Filter out deleted flights from existingState segments
          finalFlightSegments = processedSegments.map((segment) => {
            if (
              segment.selectedFlight &&
              deletedFlightIds.includes(segment.selectedFlight.id)
            ) {
              console.log(
                "=== Flight Details - Removed deleted flight from phase3State segment ===",
                {
                  flightId: segment.selectedFlight.id,
                  timestamp: new Date().toISOString(),
                }
              );
              return {
                ...segment,
                selectedFlight: null,
                fromLocation: segment.fromLocation || fromLocation,
                toLocation: segment.toLocation || toLocation,
              };
            }
            return {
              ...segment,
              fromLocation: segment.fromLocation || fromLocation,
              toLocation: segment.toLocation || toLocation,
            };
          });

          console.log("=== Flight Details - Using Phase3State Segments ===", {
            segmentCount: finalFlightSegments.length,
            selectedType: "direct",
            segmentDetails: finalFlightSegments.map((seg) => ({
              fromLocation:
                typeof seg.fromLocation === "string"
                  ? seg.fromLocation
                  : seg.fromLocation?.value,
              toLocation:
                typeof seg.toLocation === "string"
                  ? seg.toLocation
                  : seg.toLocation?.value,
              date: seg.date,
              hasFlight: !!seg.selectedFlight,
            })),
            timestamp: new Date().toISOString(),
          });
        }
        // Finally check phase1State for initial segments if nothing else is available
        else if (!finalFlightSegments || finalFlightSegments.length === 0) {
          try {
            const phase1StateStr = localStorage.getItem("phase1State");
            if (phase1StateStr) {
              const phase1State = JSON.parse(phase1StateStr);
              if (phase1State.flightSegments?.length > 0) {
                finalFlightSegments = phase1State.flightSegments;
                console.log(
                  "=== Flight Details - Using Phase 1 State Segments as Fallback ===",
                  {
                    segmentCount: finalFlightSegments.length,
                    timestamp: new Date().toISOString(),
                  }
                );
              }
            }
          } catch (e) {
            console.error("Error checking phase1State for segments:", e);
          }
        }

        // Check if we have any selected flights
        let finalSelectedFlights = [...(currentState.selectedFlights || [])];

        // Prefer flightStore selectedFlights if available
        if (
          flightStoreData &&
          flightStoreData.selectedFlights &&
          flightStoreData.selectedFlights.length > 0
        ) {
          finalSelectedFlights = [...flightStoreData.selectedFlights];
          console.log(
            "=== Flight Details - Using Flight Store Selected Flights ===",
            {
              flightCount: finalSelectedFlights.length,
              timestamp: new Date().toISOString(),
            }
          );
        }
        // Then check phase3State
        else if (
          existingState?.selectedFlights &&
          existingState.selectedFlights.length > 0
        ) {
          finalSelectedFlights = [...existingState.selectedFlights];
          console.log(
            "=== Flight Details - Using Phase 3 State Selected Flights ===",
            {
              flightCount: finalSelectedFlights.length,
              timestamp: new Date().toISOString(),
            }
          );
        }

        // Initialize filteredSelectedFlights with finalSelectedFlights
        let filteredSelectedFlights = [...finalSelectedFlights];

        // Filter out deleted flights from filteredSelectedFlights
        if (deletedFlightIds.length > 0) {
          filteredSelectedFlights = filteredSelectedFlights.filter(
            (flight) => !deletedFlightIds.includes(flight.id)
          );

          console.log("=== Flight Details - Filtered Out Deleted Flights ===", {
            originalCount: finalSelectedFlights.length,
            remainingCount: filteredSelectedFlights.length,
            deletedCount: deletedFlightIds.length,
            timestamp: new Date().toISOString(),
          });
        }

        // Mark as loaded
        setDataLoaded(true);
      } catch (error) {
        console.error("Error during phase initialization:", error);
        // Even on error, we should set dataLoaded to true to prevent endless loading
        setDataLoaded(true);
      }
    };

    initializePhase();
  }, [setCurrentPhase, flightStore]);

  // Initialize flight segments when data is available
  useEffect(() => {
    if (!flightStore || isInitializedRef.current) return;

    // Get current flight data
    const currentFlightData = flightStore.getFlightData(3);

    console.log("=== Flight Details - Using Flight Store Segments ===", {
      segmentCount: currentFlightData?.flightSegments?.length || 0,
      selectedType: currentFlightData?.selectedType || "unknown",
      segmentDetails:
        currentFlightData?.flightSegments?.map((seg: FlightSegmentData) => ({
          fromLocation:
            typeof seg.fromLocation === "string"
              ? seg.fromLocation
              : seg.fromLocation?.value,
          toLocation:
            typeof seg.toLocation === "string"
              ? seg.toLocation
              : seg.toLocation?.value,
        })) || [],
      timestamp: new Date().toISOString(),
    });

    // CRITICAL FIX: Check for multi-segment data from Phase 2
    const checkPhase2MultiSegment = () => {
      try {
        const phase2StateStr = localStorage.getItem("phase2State");
        if (phase2StateStr) {
          const phase2State = JSON.parse(phase2StateStr);
          const isMultiFromPhase2 =
            phase2State.selectedType === "multi" ||
            (phase2State.flightSegments &&
              phase2State.flightSegments.length > 1);

          if (isMultiFromPhase2) {
            console.log(
              "=== CRITICAL FIX: Detected multi-segment in Phase 2 ===",
              {
                selectedType: phase2State.selectedType,
                segmentCount: phase2State.flightSegments?.length || 0,
                timestamp: new Date().toISOString(),
              }
            );

            // Set a strong preservation flag - this is our definitive signal
            localStorage.setItem("_wasPhase2Multi", "true");
            localStorage.setItem("_preserveMultiSegmentPhase3", "true");

            // Force multi-segment in both the store and flightStore
            store.setSelectedType("multi");

            // CRITICAL FIX: Copy all flight segments from Phase 2 to Phase 3
            const segments = [...(phase2State.flightSegments || [])];

            // Ensure we have complete segment data, fix any partial segments
            if (segments.length > 0) {
              // Clean up segments to ensure they have proper structure
              const cleanedSegments = segments.map((segment) => ({
                fromLocation: segment.fromLocation || null,
                toLocation: segment.toLocation || null,
                date: segment.date || null,
                selectedFlight: segment.selectedFlight || null,
              }));

              // If somehow we only have one segment but it's marked as multi, add a second segment
              if (cleanedSegments.length === 1) {
                cleanedSegments.push({
                  fromLocation: cleanedSegments[0].toLocation || null,
                  toLocation:
                    phase2State.toLocation || store.toLocation || null,
                  date: null,
                  selectedFlight: null,
                });
              }

              // Update store with these segments
              store.setFlightSegments(cleanedSegments);

              // Save to flight store to ensure consistency across all components
              flightStore.saveFlightData(3, {
                selectedType: "multi",
                _isMultiSegment: true,
                flightSegments: cleanedSegments,
                _preserveFlightSegments: true,
                fromLocation: phase2State.fromLocation || store.fromLocation,
                toLocation: phase2State.toLocation || store.toLocation,
                timestamp: Date.now(),
              });

              console.log(
                "=== Flight Details - Preserved Phase 2 flight segments ===",
                {
                  segmentCount: cleanedSegments.length,
                  segments: cleanedSegments.map((s) => ({
                    fromLoc:
                      typeof s.fromLocation === "string"
                        ? s.fromLocation
                        : s.fromLocation?.value,
                    toLoc:
                      typeof s.toLocation === "string"
                        ? s.toLocation
                        : s.toLocation?.value,
                  })),
                  timestamp: new Date().toISOString(),
                }
              );
            } else {
              // Fallback if no segments found
              flightStore.saveFlightData(3, {
                selectedType: "multi",
                _isMultiSegment: true,
                _preserveFlightSegments: true,
                timestamp: Date.now(),
              });
            }

            return true;
          }
        }
        return false;
      } catch (error) {
        console.error("Error checking Phase 2 multi-segment:", error);
        return false;
      }
    };

    // First check if the preservation flag is already set
    const preservationFlagSet =
      localStorage.getItem("_preserveMultiSegmentPhase3") === "true";

    // If flag is set or we detect multi-segment from Phase 2, ensure it's preserved
    if (preservationFlagSet || checkPhase2MultiSegment()) {
      // Only create default segments if we don't already have them from Phase 2
      if ((currentFlightData?.flightSegments?.length || 0) < 2) {
        const segments = [...(currentFlightData?.flightSegments || [])];
        if (segments.length === 0) {
          // Create first segment with from location
          segments.push({
            fromLocation: currentFlightData?.fromLocation || store.fromLocation,
            toLocation: null,
            date: null,
            selectedFlight: null,
          });
        }

        // Ensure we have a second segment
        if (segments.length === 1) {
          // Add second segment with to location
          segments.push({
            fromLocation: segments[0].toLocation || null,
            toLocation: currentFlightData?.toLocation || store.toLocation,
            date: null,
            selectedFlight: null,
          });

          // Update store with these segments
          store.setFlightSegments(segments);

          // Update flight store to ensure consistency
          flightStore.saveFlightData(3, {
            selectedType: "multi",
            _isMultiSegment: true,
            flightSegments: segments,
            _preserveFlightSegments: true,
            timestamp: Date.now(),
          });
        }
      }
    }
  }, [flightStore, store]);

  // Fallback effect to ensure locations are loaded from phase2 if needed
  useEffect(() => {
    if (
      dataLoaded &&
      (!store.fromLocation || !store.toLocation) &&
      flightSegments.length > 0
    ) {
      console.log(
        "=== Flight Details - Missing locations after initialization, checking phase2 ==="
      );

      try {
        const phase2StateStr = localStorage.getItem("phase2State");
        if (phase2StateStr) {
          const phase2State = JSON.parse(phase2StateStr);

          if (phase2State.fromLocation && !store.fromLocation) {
            console.log(
              "Recovering fromLocation from phase2State in fallback effect"
            );
            store.setFromLocation(phase2State.fromLocation);
          }

          if (phase2State.toLocation && !store.toLocation) {
            console.log(
              "Recovering toLocation from phase2State in fallback effect"
            );
            store.setToLocation(phase2State.toLocation);
          }

          // Also ensure this data is saved in flightStore for next time
          flightStore.saveFlightData(3, {
            fromLocation: phase2State.fromLocation || store.fromLocation,
            toLocation: phase2State.toLocation || store.toLocation,
            flightSegments:
              flightSegments.length > 0
                ? flightSegments
                : phase2State.flightSegments,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.error("Error in fallback location recovery:", error);
      }
    }
  }, [
    dataLoaded,
    store.fromLocation,
    store.toLocation,
    flightSegments,
    store,
    flightStore,
  ]);

  // Add a second fallback effect to check if any flight segments have dates but missing selectedFlight
  useEffect(() => {
    if (
      dataLoaded &&
      flightSegments.length > 0 &&
      !processedSharedDataRef.current
    ) {
      console.log(
        "=== Flight Details - Checking for missing selectedFlight ===",
        {
          segmentsCount: flightSegments.length,
          timestamp: new Date().toISOString(),
        }
      );

      // Check if segments already have selected flights
      const allSegmentsHaveFlights = flightSegments.every(
        (segment) => segment.selectedFlight
      );

      // If all segments already have flights, no need to do anything
      if (allSegmentsHaveFlights) {
        console.log(
          "=== Flight Details - All segments already have flights ===",
          {
            segmentCount: flightSegments.length,
            timestamp: new Date().toISOString(),
          }
        );
        processedSharedDataRef.current = true;
        return;
      }

      // Check if we have shared flight data in the URL
      const urlParams = new URLSearchParams(window.location.search);
      const sharedFlightParam = urlParams.get("shared_flight");

      if (sharedFlightParam) {
        console.log("=== Flight Details - Found shared_flight in URL ===");
        try {
          // First check if we have valid json
          const parsedData = JSON.parse(decodeURIComponent(sharedFlightParam));

          // Get shared flight data from different sources
          let sharedFlightData = parsedData;

          // Check localStorage for sharedFlightData
          if (!sharedFlightData?.flightSegments) {
            try {
              const sharedFlightStr = localStorage.getItem("sharedFlightData");
              if (sharedFlightStr) {
                console.log(
                  "=== Flight Details - Found sharedFlightData in localStorage ==="
                );
                sharedFlightData = JSON.parse(sharedFlightStr);
              }
            } catch (e) {
              console.error("Error parsing localStorage sharedFlightData:", e);
            }
          }

          // If we have shared flight data, use it directly
          if (sharedFlightData && sharedFlightData.flightSegments) {
            console.log(
              "=== Flight Details - Using shared flight data directly ===",
              {
                segmentCount: sharedFlightData.flightSegments.length,
                timestamp: new Date().toISOString(),
              }
            );

            // Check if parsedData contains phase4Data with selectedFlights
            const hasRealFlightInfo =
              (sharedFlightData.phase4Data?.selectedFlights &&
                sharedFlightData.phase4Data.selectedFlights.length > 0) ||
              sharedFlightData.flightSegments.some(
                (seg: any) => seg.selectedFlight?.airline
              );

            if (hasRealFlightInfo) {
              console.log(
                "=== Flight Details - Using real flight info from shared data ===",
                {
                  timestamp: new Date().toISOString(),
                  flightsFromPhase4:
                    sharedFlightData.phase4Data?.selectedFlights?.length || 0,
                  flightsFromSegments: sharedFlightData.flightSegments.filter(
                    (s: any) => s.selectedFlight
                  ).length,
                }
              );

              // Mark as processed to prevent infinite loop
              processedSharedDataRef.current = true;

              // Extract real flight data from phase4Data if available
              const currentPhase = 3; // We're in flight-details, which is phase 3
              console.log("=== Flight Details - Phase Check ===", {
                currentPhase,
                usePhase3Data: true,
                timestamp: new Date().toISOString(),
              });

              // Add detailed debugging of the shared flight data structure
              console.log("=== DEBUGGING SHARED FLIGHT DATA STRUCTURE ===", {
                hasFlightSegments: !!sharedFlightData.flightSegments,
                flightSegmentsCount:
                  sharedFlightData.flightSegments?.length || 0,
                segmentsWithSelectedFlights:
                  sharedFlightData.flightSegments?.filter(
                    (s: any) => s.selectedFlight
                  ).length || 0,
                hasPhase3Data:
                  sharedFlightData.flightSegments?.some(
                    (s: any) => s.selectedFlight
                  ) || !!sharedFlightData.phase3Data?.selectedFlights?.length,
                hasPhase4Data: !!sharedFlightData.phase4Data?.selectedFlights,
                phase3SelectedFlightsCount:
                  sharedFlightData.phase3Data?.selectedFlights?.length || 0,
                phase4SelectedFlightsCount:
                  sharedFlightData.phase4Data?.selectedFlights?.length || 0,
                timestamp: new Date().toISOString(),
              });

              // If we have dedicated phase 3 data in the shared link, show it
              if (sharedFlightData.phase3Data?.selectedFlights?.length > 0) {
                console.log(
                  "=== DEBUGGING EXPLICIT PHASE 3 DATA IN SHARED LINK ===",
                  {
                    flightCount:
                      sharedFlightData.phase3Data.selectedFlights.length,
                    flights: sharedFlightData.phase3Data.selectedFlights.map(
                      (f: any) => ({
                        flightId: f.id,
                        flightNumber: f.flightNumber,
                        flightDate: f.date,
                        flightDateType: typeof f.date,
                      })
                    ),
                    timestamp: new Date().toISOString(),
                  }
                );
              }

              // If we have phase 3 data, log the first segment's flight details
              if (
                sharedFlightData.flightSegments?.some(
                  (s: any) => s.selectedFlight
                )
              ) {
                const firstSegmentWithFlight =
                  sharedFlightData.flightSegments.find(
                    (s: any) => s.selectedFlight
                  );
                if (firstSegmentWithFlight) {
                  console.log("=== DEBUGGING PHASE 3 FLIGHT IN SEGMENT ===", {
                    segmentIndex: sharedFlightData.flightSegments.indexOf(
                      firstSegmentWithFlight
                    ),
                    flightId: firstSegmentWithFlight.selectedFlight?.id,
                    flightNumber:
                      firstSegmentWithFlight.selectedFlight?.flightNumber,
                    flightDate: firstSegmentWithFlight.selectedFlight?.date,
                    flightDateType:
                      typeof firstSegmentWithFlight.selectedFlight?.date,
                    timestamp: new Date().toISOString(),
                  });
                }
              }

              // If we have phase 4 data, log the first flight details
              if (sharedFlightData.phase4Data?.selectedFlights?.length > 0) {
                console.log("=== DEBUGGING PHASE 4 FLIGHT ===", {
                  flightId: sharedFlightData.phase4Data.selectedFlights[0]?.id,
                  flightNumber:
                    sharedFlightData.phase4Data.selectedFlights[0]
                      ?.flightNumber,
                  flightDate:
                    sharedFlightData.phase4Data.selectedFlights[0]?.date,
                  flightDateType:
                    typeof sharedFlightData.phase4Data.selectedFlights[0]?.date,
                  timestamp: new Date().toISOString(),
                });
              }

              // Check if we have phase 3 specific data in the shared flight data
              const hasPhase3DataInSegments =
                sharedFlightData.flightSegments &&
                sharedFlightData.flightSegments.some(
                  (s: any) => s.selectedFlight
                );

              // We might also have explicit phase 3 data
              const hasExplicitPhase3Data =
                sharedFlightData.phase3Data?.selectedFlights?.length > 0;

              const hasPhase3Data =
                hasPhase3DataInSegments || hasExplicitPhase3Data;

              // For phase 3, extract data from phase 3 segments or from explicit phase3Data
              let phase3Flights: any[] = [];

              if (hasPhase3DataInSegments) {
                // Extract from segments
                phase3Flights = sharedFlightData.flightSegments
                  .filter((s: any) => s.selectedFlight)
                  .map((s: any) => s.selectedFlight);
              } else if (hasExplicitPhase3Data) {
                // Use explicit phase 3 data
                phase3Flights = sharedFlightData.phase3Data.selectedFlights;

                // If we have phase 3 flights but no selectedFlight in segments,
                // add the flights to the segments
                if (
                  phase3Flights.length > 0 &&
                  sharedFlightData.flightSegments?.length > 0
                ) {
                  console.log(
                    "=== Enhancing segments with explicit phase 3 flights ===",
                    {
                      phase3FlightCount: phase3Flights.length,
                      segmentCount: sharedFlightData.flightSegments.length,
                      timestamp: new Date().toISOString(),
                    }
                  );

                  // Add selectedFlight to segments
                  sharedFlightData.flightSegments =
                    sharedFlightData.flightSegments.map(
                      (segment: any, idx: number) => {
                        if (idx < phase3Flights.length) {
                          return {
                            ...segment,
                            selectedFlight: phase3Flights[idx],
                          };
                        }
                        return segment;
                      }
                    );
                }
              }

              // Only use phase 3 flights when in phase 3 view
              const realFlights = phase3Flights;

              // If we have no phase 3 flights but do have phase 4 data, log this but don't mix the data
              if (
                phase3Flights.length === 0 &&
                sharedFlightData.phase4Data?.selectedFlights?.length > 0
              ) {
                console.log(
                  "=== Flight Details - IMPORTANT: No phase 3 flights found but phase 4 flights exist ===",
                  {
                    timestamp: new Date().toISOString(),
                  }
                );

                // Debug the shared link creation to help understand why phase 3 data is missing
                console.log("=== Debugging shared link structure ===", {
                  fromLocation: sharedFlightData.fromLocation,
                  toLocation: sharedFlightData.toLocation,
                  hasDirectFlightSegments:
                    sharedFlightData.flightSegments?.some(
                      (s: any) =>
                        s.fromLocation?.value ===
                          sharedFlightData.fromLocation?.value &&
                        s.toLocation?.value ===
                          sharedFlightData.toLocation?.value
                    ),
                  fullStructure:
                    JSON.stringify(sharedFlightData).substring(0, 500) + "...", // Truncated for readability
                  timestamp: new Date().toISOString(),
                });

                // Debug local storage phase 3 data
                try {
                  const phase3StateStr = localStorage.getItem("phase3State");
                  if (phase3StateStr) {
                    const phase3State = JSON.parse(phase3StateStr);
                    console.log(
                      "=== Existing phase3State in localStorage ===",
                      {
                        hasFlightSegments: !!phase3State?.flightSegments,
                        segmentCount: phase3State?.flightSegments?.length || 0,
                        segmentsWithSelectedFlights:
                          phase3State?.flightSegments?.filter(
                            (s: any) => s.selectedFlight
                          ).length || 0,
                        timestamp: new Date().toISOString(),
                      }
                    );
                  } else {
                    console.log(
                      "=== No phase3State found in localStorage ===",
                      {
                        timestamp: new Date().toISOString(),
                      }
                    );
                  }
                } catch (e) {
                  console.error("Error checking localStorage phase3State:", e);
                }
              }

              console.log(
                "=== Flight Details - STRICT Phase Data Separation ===",
                {
                  currentPhase: 3,
                  hasPhase3Data,
                  phase3FlightsCount: phase3Flights.length,
                  usingOnlyPhase3Data: true,
                  selectedFlightCount: realFlights.length,
                  selectedFlightNumbers: realFlights
                    .map((f: any) => f.flightNumber || "unknown")
                    .join(", "),
                  timestamp: new Date().toISOString(),
                }
              );

              if (realFlights && realFlights.length > 0) {
                console.log(
                  "=== Flight Details - Found real flight data in shared link ===",
                  {
                    count: realFlights.length,
                    flightNumbers: realFlights
                      .map((f: any) => f.flightNumber)
                      .join(", "),
                    timestamp: new Date().toISOString(),
                  }
                );

                // IMPORTANT: For phase 3, we need a different date format than phase 4
                // Phase 3 uses DD.MM.YYYY strings for selectedFlight.date
                // We need to make sure we're not using Phase 4 dates directly
                console.log(
                  "=== Flight Details - Processing flight dates for PHASE 3 ===",
                  {
                    phase: 3,
                    currentPhase: "flight-details",
                    realFlightDates: realFlights.map((f: any) => f.date),
                  }
                );

                // Ensure dates are properly formatted for phase 3
                // Phase 3 expects dates in DD.MM.YYYY format rather than Date objects
                const processedFlights = realFlights.map((flight: any) => {
                  // Create a processed copy of the flight
                  const processedFlight = { ...flight };

                  // Check if we need to format the date for phase 3
                  if (flight.date) {
                    // Log the original date format for debugging
                    console.log(
                      "=== Flight Details - Processing flight date ===",
                      {
                        originalDate: flight.date,
                        dateType: typeof flight.date,
                        isISOString:
                          typeof flight.date === "string" &&
                          /^\d{4}-\d{2}-\d{2}/.test(flight.date),
                        timestamp: new Date().toISOString(),
                      }
                    );

                    // Format the date in the expected format for phase 3 (DD.MM.YYYY)
                    // If it's already in the correct format, leave it alone
                    try {
                      if (
                        typeof flight.date === "string" &&
                        /^\d{4}-\d{2}-\d{2}/.test(flight.date)
                      ) {
                        // Convert from ISO format to DD.MM.YYYY
                        const dateParts = flight.date
                          .substring(0, 10)
                          .split("-");
                        if (dateParts.length === 3) {
                          processedFlight.date = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
                          console.log(
                            "=== Flight Details - Converted ISO date to DD.MM.YYYY ===",
                            {
                              from: flight.date,
                              to: processedFlight.date,
                              timestamp: new Date().toISOString(),
                            }
                          );
                        }
                      } else if (
                        typeof flight.date === "string" &&
                        /^\d{2}\.\d{2}\.\d{4}/.test(flight.date)
                      ) {
                        // Already in the correct format
                        processedFlight.date = flight.date;
                      } else if (flight.date instanceof Date) {
                        // Convert Date object to DD.MM.YYYY
                        const day = flight.date
                          .getDate()
                          .toString()
                          .padStart(2, "0");
                        const month = (flight.date.getMonth() + 1)
                          .toString()
                          .padStart(2, "0");
                        const year = flight.date.getFullYear();
                        processedFlight.date = `${day}.${month}.${year}`;
                        console.log(
                          "=== Flight Details - Converted Date object to DD.MM.YYYY ===",
                          {
                            from: flight.date.toISOString(),
                            to: processedFlight.date,
                            timestamp: new Date().toISOString(),
                          }
                        );
                      }
                    } catch (e) {
                      console.error("Error formatting flight date:", e);
                      // Keep the original date if there's an error
                      processedFlight.date = flight.date;
                    }
                  }

                  // Ensure the flight has all required properties to show in the FlightPreviewCard
                  if (!processedFlight.airline) {
                    processedFlight.airline =
                      processedFlight.flightNumber?.substring(0, 2) ||
                      "Unknown";
                  }

                  // Make sure duration is set
                  if (!processedFlight.duration) {
                    processedFlight.duration = "Unknown";
                  }

                  return processedFlight;
                });

                // Update the segments with the real flight data
                const updatedSegments = flightSegments.map((segment, idx) => {
                  if (idx < processedFlights.length) {
                    // Extract the flight's date in the correct format for the segment's date
                    let segmentDate = segment.date;

                    // If segment has no date but flight has date, convert to Date object for the segment
                    if (!segmentDate && processedFlights[idx].date) {
                      try {
                        if (
                          typeof processedFlights[idx].date === "string" &&
                          /^\d{2}\.\d{2}\.\d{4}/.test(
                            processedFlights[idx].date
                          )
                        ) {
                          // Parse DD.MM.YYYY format to Date object
                          const parts = processedFlights[idx].date.split(".");
                          if (parts.length === 3) {
                            segmentDate = new Date(
                              parseInt(parts[2]), // year
                              parseInt(parts[1]) - 1, // month (0-based)
                              parseInt(parts[0]) // day
                            );
                            console.log(
                              "=== Flight Details - Parsed DD.MM.YYYY to Date for segment ===",
                              {
                                from: processedFlights[idx].date,
                                to: segmentDate,
                                timestamp: new Date().toISOString(),
                              }
                            );
                          }
                        } else if (processedFlights[idx].date instanceof Date) {
                          segmentDate = processedFlights[idx].date;
                        }
                      } catch (e) {
                        console.error(
                          "Error parsing flight date for segment:",
                          e
                        );
                      }
                    }

                    // Make sure selectedFlight is properly constructed for phase 3
                    // Use a proper interface-based approach to ensure ALL required properties exist
                    const selectedFlight: Flight = {
                      // Core required fields with defensive fallbacks
                      id:
                        processedFlights[idx].id ||
                        `flight-${idx}-${Date.now()}`,
                      flightNumber:
                        processedFlights[idx].flightNumber || "Unknown",
                      airline:
                        processedFlights[idx].airline ||
                        processedFlights[idx].flightNumber?.substring(0, 2) ||
                        "Unknown",

                      // Date field with the correct format for phase 3
                      date: processedFlights[idx].date || "01.01.2023", // Ensure date is in DD.MM.YYYY format

                      // Route information
                      departure: processedFlights[idx].departure || "Unknown",
                      arrival: processedFlights[idx].arrival || "Unknown",
                      departureCity:
                        processedFlights[idx].departureCity ||
                        processedFlights[idx].departure ||
                        "Unknown",
                      arrivalCity:
                        processedFlights[idx].arrivalCity ||
                        processedFlights[idx].arrival ||
                        "Unknown",

                      // Time information
                      departureTime:
                        processedFlights[idx].departureTime || "00:00",
                      arrivalTime: processedFlights[idx].arrivalTime || "00:00",
                      scheduledDepartureTime:
                        processedFlights[idx].scheduledDepartureTime ||
                        processedFlights[idx].departureTime ||
                        "00:00",
                      scheduledArrivalTime:
                        processedFlights[idx].scheduledArrivalTime ||
                        processedFlights[idx].arrivalTime ||
                        "00:00",

                      // Airport information
                      departureAirport:
                        processedFlights[idx].departureAirport ||
                        processedFlights[idx].departure ||
                        "Unknown",
                      arrivalAirport:
                        processedFlights[idx].arrivalAirport ||
                        processedFlights[idx].arrival ||
                        "Unknown",

                      // Flight details
                      duration: processedFlights[idx].duration || "Unknown",
                      status: processedFlights[idx].status || "scheduled",

                      // Optional fields with sensible defaults
                      actualDeparture:
                        processedFlights[idx].actualDeparture || null,
                      actualArrival:
                        processedFlights[idx].actualArrival || null,
                      arrivalDelay: processedFlights[idx].arrivalDelay || null,
                      stops: processedFlights[idx].stops || 0,
                      aircraft: processedFlights[idx].aircraft || "Unknown",
                      class: processedFlights[idx].class || "economy",
                      price: processedFlights[idx].price || 0,
                      distance: processedFlights[idx].distance || 0,
                      issueType: processedFlights[idx].issueType || undefined,
                      issueDescription:
                        processedFlights[idx].issueDescription || undefined,
                      issueSeverity:
                        processedFlights[idx].issueSeverity || undefined,
                      bookingReference:
                        processedFlights[idx].bookingReference || undefined,
                      connectionInfo:
                        processedFlights[idx].connectionInfo || undefined,
                    };

                    // Log the created flight object to verify all properties
                    console.log(
                      "=== Flight Details - Created complete flight object ===",
                      {
                        index: idx,
                        flight: {
                          id: selectedFlight.id,
                          flightNumber: selectedFlight.flightNumber,
                          airline: selectedFlight.airline,
                          date: selectedFlight.date,
                          departureCity: selectedFlight.departureCity,
                          arrivalCity: selectedFlight.arrivalCity,
                        },
                        timestamp: new Date().toISOString(),
                      }
                    );

                    return {
                      ...segment,
                      selectedFlight,
                      date: segmentDate,
                    };
                  }
                  return segment;
                });

                // Only update if something changed
                const needsUpdate =
                  JSON.stringify(flightSegments) !==
                  JSON.stringify(updatedSegments);

                if (needsUpdate) {
                  console.log(
                    "=== Flight Details - Updated segments with real flight data ===",
                    {
                      updatedSegments: updatedSegments.map((s, i) => ({
                        index: i,
                        hasSelectedFlight: !!s.selectedFlight,
                        flightNumber: s.selectedFlight?.flightNumber,
                        airline: s.selectedFlight?.airline,
                        date: s.selectedFlight?.date,
                        flightDateType: typeof s.selectedFlight?.date,
                        segmentDateType: s.date ? typeof s.date : "null",
                      })),
                      timestamp: new Date().toISOString(),
                    }
                  );

                  // Update selected flights in the flight store
                  const selectedFlights = updatedSegments
                    .map((segment) => segment.selectedFlight)
                    .filter((f): f is Flight => f !== null);

                  console.log(
                    "=== FlightStore - Setting Selected Flights for Phase 3 ===",
                    {
                      selectedFlights: selectedFlights.map((f) => ({
                        id: f.id,
                        flightNumber: f.flightNumber,
                        airline: f.airline,
                        date: f.date,
                        dateType: typeof f.date,
                      })),
                    }
                  );

                  // Set the flight segments in the store
                  store.setFlightSegments(updatedSegments as FlightSegment[]);

                  // Directly set selectedFlights in flightStore if needed
                  if (selectedFlights.length > 0) {
                    flightStore.setSelectedFlights(3, selectedFlights);
                  }

                  // Save the flight data including segments
                  flightStore.saveFlightData(3, {
                    selectedFlights,
                    selectedType: "direct", // Use direct for simplicity with shared flights
                    flightSegments: updatedSegments as FlightSegmentData[],
                    timestamp: Date.now(),
                  });

                  // Also update the main store using available functions
                  store.setSelectedType("direct"); // Use direct for simplicity with shared flights

                  // Set from and to locations properly
                  if (updatedSegments[0]?.fromLocation) {
                    const fromLocation = ensureStringAndLocationLike(
                      updatedSegments[0].fromLocation
                    );
                    store.setFromLocation(fromLocation);
                  }

                  if (updatedSegments[0]?.toLocation) {
                    const toLocation = ensureStringAndLocationLike(
                      updatedSegments[0].toLocation
                    );
                    store.setToLocation(toLocation);
                  }
                } else {
                  console.log(
                    "=== Flight Details - No changes needed for segments ===",
                    {
                      timestamp: new Date().toISOString(),
                    }
                  );
                }
                return;
              }
            }

            console.log(
              "=== Flight Details - No real flight data found, segments with dates but no flights will remain as is ===",
              {
                timestamp: new Date().toISOString(),
              }
            );
            processedSharedDataRef.current = true;
          }
        } catch (e) {
          console.error("Error processing shared_flight parameter:", e);
        }
      }

      // Mark as processed to prevent reprocessing
      processedSharedDataRef.current = true;
    }
  }, [
    dataLoaded,
    flightSegments,
    flightStore,
    processedSharedDataRef,
    router,
    selectedFlights,
    store,
  ]);

  const canContinue = useMemo(() => {
    return (
      validationState.stepValidation[1] && validationState.stepValidation[2]
    );
  }, [validationState.stepValidation]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    try {
      // Save the complete flight data to localStorage before transitioning
      const flightData = {
        selectedFlights: selectedFlights.map((flight) => ({
          ...flight,
          // Keep the original date format (YYYY-MM-DD)
          date: flight.date,
          // Preserve location data
          departureCity: flight.departureCity,
          arrivalCity: flight.arrivalCity,
          departureAirport: flight.departureAirport,
          arrivalAirport: flight.arrivalAirport,
        })),
        flightSegments: flightSegments.map((segment) => ({
          ...segment,
          // Keep the original date format (YYYY-MM-DD)
          date: segment.date,
          selectedFlight: segment.selectedFlight
            ? {
                ...segment.selectedFlight,
                date: segment.selectedFlight.date,
                departureCity: segment.selectedFlight.departureCity,
                arrivalCity: segment.selectedFlight.arrivalCity,
                departureAirport: segment.selectedFlight.departureAirport,
                arrivalAirport: segment.selectedFlight.arrivalAirport,
              }
            : null,
          fromLocation: segment.fromLocation
            ? {
                ...segment.fromLocation,
                value: segment.fromLocation.value,
                label: segment.fromLocation.label,
                city: segment.fromLocation.city,
                description: segment.fromLocation.description,
                dropdownLabel: segment.fromLocation.dropdownLabel,
              }
            : null,
          toLocation: segment.toLocation
            ? {
                ...segment.toLocation,
                value: segment.toLocation.value,
                label: segment.toLocation.label,
                city: segment.toLocation.city,
                description: segment.toLocation.description,
                dropdownLabel: segment.toLocation.dropdownLabel,
              }
            : null,
        })),
        directFlight: directFlight
          ? {
              ...directFlight,
              // Keep the original date format (YYYY-MM-DD)
              date: directFlight.date,
              selectedFlight: directFlight.selectedFlight
                ? {
                    ...directFlight.selectedFlight,
                    date: directFlight.selectedFlight.date,
                    departureCity: directFlight.selectedFlight.departureCity,
                    arrivalCity: directFlight.selectedFlight.arrivalCity,
                    departureAirport:
                      directFlight.selectedFlight.departureAirport,
                    arrivalAirport: directFlight.selectedFlight.arrivalAirport,
                  }
                : null,
              fromLocation: directFlight.fromLocation
                ? {
                    ...directFlight.fromLocation,
                    value: directFlight.fromLocation.value,
                    label: directFlight.fromLocation.label,
                    city: directFlight.fromLocation.city,
                    description: directFlight.fromLocation.description,
                    dropdownLabel: directFlight.fromLocation.dropdownLabel,
                  }
                : null,
              toLocation: directFlight.toLocation
                ? {
                    ...directFlight.toLocation,
                    value: directFlight.toLocation.value,
                    label: directFlight.toLocation.label,
                    city: directFlight.toLocation.city,
                    description: directFlight.toLocation.description,
                    dropdownLabel: directFlight.toLocation.dropdownLabel,
                  }
                : null,
            }
          : null,
        selectedType,
        bookingNumber: bookingNumber,
        validationState,
        timestamp: Date.now(),
      };

      // Save to phase 3 storage only - phase 4 should be completely separate
      localStorage.setItem("phase3FlightData", JSON.stringify(flightData));

      // Do NOT save phase 3 data to phase 4 storage
      // Phase 4 should initialize with its own fresh data
      // localStorage.setItem('phase4FlightData', JSON.stringify(flightData));

      // Also save to phase state with complete location data
      const phaseState = {
        ...flightData,
        currentPhase: 3,
        _explicitlyCompleted: true,
        _completedTimestamp: Date.now(),
        _forcedByHandleContinue: true,
      };
      localStorage.setItem("phase3State", JSON.stringify(phaseState));

      // Set alternative flags for more robustness
      localStorage.setItem("phase3_explicitlyCompleted", "true");

      // Also save a simplified version with just the essential flag
      const simpleState = {
        _explicitlyCompleted: true,
        _timestamp: Date.now(),
      };
      localStorage.setItem("phase3_simple", JSON.stringify(simpleState));

      console.log("=== FlightDetails - Phase 3 Explicitly Completed ===", {
        phaseState,
        simpleState,
        timestamp: new Date().toISOString(),
      });

      // Store the selected flights from phase 3 as original flights for comparison in phase 4
      // This is the ONLY data that should be shared between phases 3 and 4
      await flightStore.setOriginalFlights(selectedFlights);

      // Clear any previously selected flights for phase 4
      await flightStore.setSelectedFlights(4, []);

      // Also set original flights in phase4Store
      // This is the ONLY data that should be shared between phases 3 and 4
      phase4Store.batchUpdate({
        originalFlights: selectedFlights,
        selectedFlights: [],
        _lastUpdate: Date.now(),
      });

      // Complete phase 3 and move to phase 4
      await completePhase(3);
      await setCurrentPhase(4);

      // Ensure Phase 3 is marked as completed in the phasesCompletedViaContinue array
      // This fixes a potential issue with the PhaseGuard blocking access to Phase 4
      const store = await import("@/lib/state/store").then((m) => m.default);
      const currentStore = store.getState();
      const newPhasesCompletedViaContinue = [
        ...currentStore.phasesCompletedViaContinue,
      ];

      if (!newPhasesCompletedViaContinue.includes(3)) {
        newPhasesCompletedViaContinue.push(3);
        newPhasesCompletedViaContinue.sort((a, b) => a - b);

        store.setState({
          phasesCompletedViaContinue: newPhasesCompletedViaContinue,
        });

        console.log(
          "=== FlightDetails - Added Phase 3 to phasesCompletedViaContinue ===",
          {
            phasesCompletedViaContinue: newPhasesCompletedViaContinue,
            timestamp: new Date().toISOString(),
          }
        );
      }

      // Navigate to the next page
      router.push(getLanguageAwareUrl("/phases/trip-experience", lang));
    } catch (error) {
      console.error("Error during phase transition:", error);
    }
  }, [
    canContinue,
    selectedFlights,
    flightSegments,
    directFlight,
    selectedType,
    bookingNumber,
    validationState,
    flightStore,
    completePhase,
    setCurrentPhase,
    router,
    lang,
  ]);

  const handleInteraction = useCallback(
    (step: string) => {
      if (!interactedSteps.includes(Number(step))) {
        setInteractedSteps((prev: number[]) => [...prev, Number(step)]);
      }
    },
    [interactedSteps]
  );

  const handleBack = async () => {
    const previousUrl = "/phases/compensation-estimate";

    // Set a flag in localStorage to indicate a back navigation is in progress
    localStorage.setItem("navigating_back_to_phase2", "true");

    // Save current validation state before transitioning
    const currentState = {
      flightSegments: flightSegments.map((segment) => ({
        ...segment,
        date: segment.date ? formatDateForDisplay(segment.date) : null,
        selectedFlight: segment.selectedFlight,
        fromLocation: segment.fromLocation,
        toLocation: segment.toLocation,
      })),
      selectedType,
      currentPhase: 2,
      validationState: {
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          1: validationState.stepValidation[1],
          2: validationState.stepValidation[2],
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          1: validationState.stepInteraction[1],
          2: validationState.stepInteraction[2],
        },
      },
      bookingNumber: bookingNumber,
      _timestamp: Date.now(),
      // Add explicit flags to ensure multi-segment flights are preserved
      _preserveFlightSegments: true,
      _isMultiSegment: selectedType === "multi",
    };

    // Log the state we're saving to help with debugging
    console.log("=== Back Navigation - Saving State ===", {
      selectedType,
      segmentCount: flightSegments.length,
      fromLocation: flightSegments[0]?.fromLocation?.value,
      toLocation: flightSegments[flightSegments.length - 1]?.toLocation?.value,
      timestamp: new Date().toISOString(),
    });

    // Save state for both phases to ensure validation persists
    localStorage.setItem("phase2State", JSON.stringify(currentState));
    localStorage.setItem(
      "phase1State",
      JSON.stringify({
        ...currentState,
        currentPhase: 1,
      })
    );

    // Also save to flight store to ensure data is available immediately
    try {
      // Save to flight store for phase 2
      await flightStore.saveFlightData(2, {
        fromLocation: flightSegments[0]?.fromLocation
          ? ensureStringAndLocationLike(flightSegments[0].fromLocation)
          : null,
        toLocation: flightSegments[flightSegments.length - 1]?.toLocation
          ? ensureStringAndLocationLike(
              flightSegments[flightSegments.length - 1].toLocation
            )
          : null,
        selectedType,
        flightSegments: flightSegments.map((segment) => ({
          fromLocation: segment.fromLocation
            ? ensureStringAndLocationLike(segment.fromLocation)
            : null,
          toLocation: segment.toLocation
            ? ensureStringAndLocationLike(segment.toLocation)
            : null,
          date: segment.date,
          selectedFlight: segment.selectedFlight,
        })),
        _preserveFlightSegments: true,
        _isMultiSegment: selectedType === "multi",
        timestamp: Date.now(),
      });

      console.log("=== Back Navigation - Saved to FlightStore ===", {
        phase: 2,
        fromLocation: flightSegments[0]?.fromLocation?.value,
        toLocation:
          flightSegments[flightSegments.length - 1]?.toLocation?.value,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error saving to flight store:", error);
    }

    // First update the current phase to the previous phase and add a safeguard
    await setCurrentPhase(2);

    // Force the store to reflect the phase change immediately
    const store = await import("@/lib/state/store").then((m) => m.default);
    store.setState({
      currentPhase: 2,
      _preventPhaseChange: true, // Prevent any automatic phase changes
      _lastUpdate: Date.now(),
    });

    console.log("=== Back Navigation - Phase State Updated ===", {
      targetPhase: 2,
      storePhase: store.getState().currentPhase,
      timestamp: new Date().toISOString(),
    });

    // Add a small delay to ensure state is updated before navigation
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Then navigate to the previous URL with language parameter
    router.push(getLanguageAwareUrl(previousUrl, lang));
  };

  // Initialize validation state with all required fields
  useEffect(() => {
    if (!mounted) return;

    const initializeValidation = async () => {
      // Check if we have any selected flights
      const hasSelectedFlights = selectedFlights && selectedFlights.length > 0;
      const allSegmentsHaveFlights =
        selectedType === "multi"
          ? flightSegments.every((segment) => segment.selectedFlight)
          : true;
      const isFlightValid = hasSelectedFlights && allSegmentsHaveFlights;

      // Check if we have a valid booking number
      const isBookingValid = bookingNumber.length >= 6;

      // Create initial validation state
      const initialValidationState: ValidationState = {
        isFlightValid,
        isBookingValid,
        isWizardValid: true,
        isPersonalValid: true,
        isTermsValid: false,
        isSignatureValid: false,
        isWizardSubmitted: false,
        isCompensationValid: false,
        stepValidation: {
          1: isFlightValid,
          2: isBookingValid,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
        },
        stepInteraction: {
          1: true,
          2: !!bookingNumber,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
        },
        errors: {
          1: isFlightValid ? [] : ["Please select a flight"],
          2: isBookingValid ? [] : ["Please enter your booking number"],
          3: [],
          4: [],
          5: [],
          6: [],
          7: [],
        },
        stepCompleted: {
          1: isFlightValid,
          2: isBookingValid,
          3: false,
          4: false,
          5: false,
          6: false,
          7: false,
        },
        completedSteps: [
          ...(isFlightValid ? [1] : []),
          ...(isBookingValid ? [2] : []),
        ] as ValidationStep[],
        questionValidation: {},
        fieldErrors: {},
        transitionInProgress: false,
        _timestamp: Date.now(),
      };

      // Update validation state immediately
      await updateValidationState(initialValidationState);
    };

    initializeValidation();
  }, [
    mounted,
    selectedFlights,
    selectedType,
    flightSegments,
    bookingNumber,
    updateValidationState,
  ]);

  // Update handleFlightValidation to maintain complete validation step records
  const handleFlightValidation = useCallback(() => {
    if (!validationState) return;

    // In phase 3, validate that flights are selected
    const hasSelectedFlights = selectedFlights && selectedFlights.length > 0;
    const allSegmentsHaveFlights =
      selectedType === "multi"
        ? flightSegments.every((segment) => segment.selectedFlight)
        : true;

    // Flight selection is only valid if we have flights selected and all segments have flights
    const isFlightValid = hasSelectedFlights && allSegmentsHaveFlights;

    // Create new validation state synchronously
    const newValidationState: ValidationState = {
      isFlightValid,
      isBookingValid: validationState.isBookingValid,
      isWizardValid: validationState.isWizardValid,
      isPersonalValid: validationState.isPersonalValid,
      isTermsValid: validationState.isTermsValid,
      isSignatureValid: validationState.isSignatureValid,
      isWizardSubmitted: validationState.isWizardSubmitted,
      isCompensationValid: validationState.isCompensationValid,
      stepValidation: {
        ...validationState.stepValidation,
        1: isFlightValid,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        1: true,
      },
      errors: {
        ...validationState.errors,
        1: !isFlightValid ? ["Please select a flight"] : [],
      },
      stepCompleted: {
        ...validationState.stepCompleted,
        1: isFlightValid,
      },
      completedSteps: isFlightValid
        ? [
            ...(validationState.completedSteps || []),
            1 as ValidationStep,
          ].filter((v, i, a) => a.indexOf(v) === i)
        : (validationState.completedSteps || []).filter((step) => step !== 1),
      questionValidation: validationState.questionValidation,
      fieldErrors: validationState.fieldErrors,
      transitionInProgress: validationState.transitionInProgress,
      _timestamp: Date.now(),
    };

    // Update validation state immediately
    updateValidationState(newValidationState);

    // Then persist to localStorage
    const stateToSave = {
      flightSegments: flightSegments.map((segment) => ({
        ...segment,
        date: segment.date ? formatDateForDisplay(segment.date) : null,
        selectedFlight: segment.selectedFlight,
        fromLocation: segment.fromLocation,
        toLocation: segment.toLocation,
      })),
      selectedType,
      currentPhase: 3,
      validationState: newValidationState,
      _timestamp: Date.now(),
    };

    localStorage.setItem("phase3State", JSON.stringify(stateToSave));
  }, [
    validationState,
    updateValidationState,
    selectedFlights,
    selectedType,
    flightSegments,
    bookingNumber,
  ]);

  const handleBookingNumberChange = useCallback(
    (value: string) => {
      setBookingNumber(value);

      if (!validationState) return;

      const isValid = value.length >= 6;
      const newValidationState: ValidationState = {
        isFlightValid: validationState.isFlightValid,
        isBookingValid: isValid,
        isWizardValid: validationState.isWizardValid,
        isPersonalValid: validationState.isPersonalValid,
        isTermsValid: validationState.isTermsValid,
        isSignatureValid: validationState.isSignatureValid,
        isWizardSubmitted: validationState.isWizardSubmitted,
        isCompensationValid: validationState.isCompensationValid,
        stepValidation: {
          ...validationState.stepValidation,
          2: isValid,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: true,
        },
        errors: {
          ...validationState.errors,
          2: isValid ? [] : ["Booking number must be at least 6 characters"],
        },
        stepCompleted: validationState.stepCompleted,
        completedSteps: validationState.completedSteps,
        questionValidation: validationState.questionValidation,
        fieldErrors: validationState.fieldErrors,
        transitionInProgress: validationState.transitionInProgress,
        _timestamp: Date.now(),
      };

      updateValidationState(newValidationState);
    },
    [setBookingNumber, validationState, updateValidationState]
  );

  const getBestLocationData = (): {
    fromLocation: (string & LocationLike) | null;
    toLocation: (string & LocationLike) | null;
    selectedType: string;
    flightSegments: any[];
  } => {
    interface LocationSource {
      fromLocation: any;
      toLocation: any;
      source: string;
      flightSegments?: any[];
      selectedType?: "direct" | "multi";
    }

    // Track attempts to find location data
    console.log(
      "=== Location Resolution - Attempting to find location data ===",
      {
        timestamp: new Date().toISOString(),
        currentStore: {
          hasDirectFlight: !!store.directFlight,
          hasFlightSegments: store.flightSegments?.length > 0,
          hasSelectedFlights: store.selectedFlights?.length > 0,
        },
      }
    );

    // Get all possible sources with detailed logging
    const sources = [
      // Phase 2 state (highest priority for multi-segment flights)
      (() => {
        const phase2State = localStorage.getItem("phase2State");
        if (phase2State) {
          try {
            const parsedState = JSON.parse(phase2State);
            if (
              parsedState.fromLocation &&
              parsedState.toLocation &&
              parsedState.selectedType === "multi" &&
              parsedState.flightSegments &&
              parsedState.flightSegments.length > 1
            ) {
              console.log("=== Store - Found Valid Location Source ===", {
                source: "phase2State",
                fromLocation:
                  typeof parsedState.fromLocation === "string"
                    ? parsedState.fromLocation
                    : parsedState.fromLocation?.value,
                toLocation:
                  typeof parsedState.toLocation === "string"
                    ? parsedState.toLocation
                    : parsedState.toLocation?.value,
                selectedType: parsedState.selectedType,
                hasFlightSegments: !!parsedState.flightSegments,
                segmentCount: parsedState.flightSegments?.length || 0,
                timestamp: new Date().toISOString(),
              });
              return {
                fromLocation: parsedState.fromLocation,
                toLocation: parsedState.toLocation,
                flightSegments: parsedState.flightSegments || [],
                selectedType: "multi",
                source: "phase2State",
              } as LocationSource;
            }
          } catch (e) {
            console.error("Error parsing phase2State:", e);
          }
        }
        return null;
      })(),

      // Current UI state (next priority)
      (() => {
        // Check if we have current UI state in localStorage
        const currentUIState = localStorage.getItem("currentUIState");
        if (currentUIState) {
          try {
            const parsedState = JSON.parse(currentUIState);
            if (parsedState.fromLocation && parsedState.toLocation) {
              console.log("=== Found current UI state in localStorage ===", {
                fromLocation:
                  parsedState.fromLocation.value || parsedState.fromLocation,
                toLocation:
                  parsedState.toLocation.value || parsedState.toLocation,
                timestamp: new Date().toISOString(),
              });
              return {
                fromLocation: parsedState.fromLocation,
                toLocation: parsedState.toLocation,
                flightSegments: parsedState.flightSegments || [],
                selectedType: parsedState.selectedType || "direct",
                source: "currentUIState",
              } as LocationSource;
            }
          } catch (e) {
            console.error("Error parsing currentUIState:", e);
          }
        }
        return null;
      })(),

      // Phase 2 state (second priority for direct flights)
      (() => {
        const phase2State = localStorage.getItem("phase2State");
        if (phase2State) {
          try {
            const parsedState = JSON.parse(phase2State);
            if (
              parsedState.fromLocation &&
              parsedState.toLocation &&
              parsedState.selectedType !== "multi"
            ) {
              return {
                fromLocation: parsedState.fromLocation,
                toLocation: parsedState.toLocation,
                flightSegments: parsedState.flightSegments || [],
                selectedType: parsedState.selectedType || "direct",
                source: "phase2State",
              } as LocationSource;
            }
          } catch (e) {
            console.error("Error parsing phase2State:", e);
          }
        }
        return null;
      })(),

      // Selected flights - more robust checking
      (() => {
        if (store.selectedFlights?.[0]) {
          const flight = store.selectedFlights[0];
          // More thorough validation of the flight data
          if (flight.departureCity && flight.arrivalCity) {
            return {
              fromLocation: {
                value: flight.departureCity,
                label: flight.departureCity,
                city: flight.departureCity,
                description: flight.departureAirport || flight.departureCity,
                dropdownLabel: flight.departureAirport
                  ? `${flight.departureCity} (${flight.departureAirport})`
                  : flight.departureCity,
              },
              toLocation: {
                value: flight.arrivalCity,
                label: flight.arrivalCity,
                city: flight.arrivalCity,
                description: flight.arrivalAirport || flight.arrivalCity,
                dropdownLabel: flight.arrivalAirport
                  ? `${flight.arrivalCity} (${flight.arrivalAirport})`
                  : flight.arrivalCity,
              },
              source: "selectedFlights",
            } as LocationSource;
          }
        }
        return null;
      })(),

      // Current flight store data for each phase
      ...[3, 2, 1].map((phase) => {
        const flightData = flightStore.flightData[phase];
        if (flightData?.fromLocation && flightData?.toLocation) {
          // Add more validation to ensure we have proper location data
          return {
            fromLocation: flightData.fromLocation,
            toLocation: flightData.toLocation,
            flightSegments: flightData.flightSegments || [],
            selectedType: flightData.selectedType || "direct",
            source: `flightStore_phase${phase}`,
          } as LocationSource;
        }
        return null;
      }),

      // Direct flight from current state - with more validation
      (() => {
        if (
          store.directFlight?.fromLocation &&
          store.directFlight?.toLocation
        ) {
          // Extra validation to make sure we have valid locations
          const fromLoc = store.directFlight.fromLocation;
          const toLoc = store.directFlight.toLocation;

          if (
            (typeof fromLoc === "string" ||
              (typeof fromLoc === "object" && fromLoc?.value)) &&
            (typeof toLoc === "string" ||
              (typeof toLoc === "object" && toLoc?.value))
          ) {
            return {
              fromLocation: fromLoc,
              toLocation: toLoc,
              source: "directFlight",
            } as LocationSource;
          }
        }
        return null;
      })(),

      // Flight segments - with more validation
      (() => {
        if (
          store.flightSegments?.[0]?.fromLocation &&
          store.flightSegments?.[store.flightSegments.length - 1]?.toLocation
        ) {
          const fromLoc = store.flightSegments[0].fromLocation;
          const toLoc =
            store.flightSegments[store.flightSegments.length - 1].toLocation;

          if (
            (typeof fromLoc === "string" ||
              (typeof fromLoc === "object" && fromLoc?.value)) &&
            (typeof toLoc === "string" ||
              (typeof toLoc === "object" && toLoc?.value))
          ) {
            return {
              fromLocation: fromLoc,
              toLocation: toLoc,
              source: "flightSegments",
            } as LocationSource;
          }
        }
        return null;
      })(),
    ].filter((source): source is LocationSource => source !== null);

    console.log("=== Location Resolution - Available Sources ===", {
      sources,
      sourceCount: sources.length,
      timestamp: new Date().toISOString(),
    });

    // Find the first valid source
    const validSource = sources.find((source): source is LocationSource => {
      if (!source) return false;
      const fromLoc = source.fromLocation;
      const toLoc = source.toLocation;
      return (
        fromLoc &&
        toLoc &&
        (typeof fromLoc === "string" ||
          (typeof fromLoc === "object" && fromLoc?.value)) &&
        (typeof toLoc === "string" ||
          (typeof toLoc === "object" && toLoc?.value))
      );
    });

    if (validSource) {
      console.log("=== Store - Found Valid Location Source ===", {
        source: validSource.source,
        fromLocation:
          typeof validSource.fromLocation === "string"
            ? validSource.fromLocation
            : validSource.fromLocation?.value,
        toLocation:
          typeof validSource.toLocation === "string"
            ? validSource.toLocation
            : validSource.toLocation?.value,
        selectedType: validSource.selectedType,
        hasFlightSegments: !!validSource.flightSegments,
        segmentCount: validSource.flightSegments?.length || 0,
        timestamp: new Date().toISOString(),
      });

      // Process the locations to ensure they have the right format
      const processLocation = (
        location: any
      ): (string & LocationLike) | null => {
        if (!location) return null;

        try {
          // If it's a string (e.g., "BER"), create a Location object
          if (typeof location === "string") {
            console.log("=== processLocation - Airport Code Input ===", {
              input: location,
              result: String(location),
              timestamp: new Date().toISOString(),
            });

            const locationObj = {
              value: location,
              label: location,
              city: location,
              description: location,
              dropdownLabel: location,
            };

            // Use the Object.assign trick to satisfy TS
            return Object.assign(String(location), locationObj);
          }
          // If it's already a LocationLike object with a value field
          else if (location && typeof location === "object" && location.value) {
            console.log("=== processLocation - Location Object Input ===", {
              input: location.value,
              result: String(location.value),
              timestamp: new Date().toISOString(),
            });

            // Create a new location object with string as the prototype
            const locationObj = {
              value: location.value,
              label: location.label || location.value,
              city: location.city || location.value,
              description: location.description || location.value,
              dropdownLabel: location.dropdownLabel || location.value,
            };

            // Use the Object.assign trick to satisfy TS
            return Object.assign(String(location.value), locationObj);
          }
        } catch (error) {
          console.error("Error processing location:", error);
        }

        return null;
      };

      // Process and return the locations
      return {
        fromLocation: processLocation(validSource.fromLocation),
        toLocation: processLocation(validSource.toLocation),
        selectedType: validSource.selectedType || "direct",
        flightSegments: validSource.flightSegments || [],
      };
    }

    // Fall back to null values if no valid source is found
    return {
      fromLocation: null,
      toLocation: null,
      selectedType: "direct",
      flightSegments: [],
    };
  };

  // Modified loading state display
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f7fa]">
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
        </div>
      </div>
    );
  }

  // Show a loading state with the phase navigation when mounted but data not loaded
  if (mounted && !dataLoaded) {
    return (
      <PhaseGuard phase={3}>
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation currentPhase={3} completedPhases={[]} />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t.phases.flightDetails.speechBubble} />
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
              </div>
            </div>
          </main>
        </div>
      </PhaseGuard>
    );
  }

  // Only render the full content when both mounted and data loaded
  return (
    <PhaseGuard phase={3}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={3} completedPhases={[]} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message={t.phases.flightDetails.speechBubble} />

            <div className="space-y-4">
              <AccordionCard
                title={t.phases.flightDetails.steps.flightSelection.title}
                eyebrow={t.phases.flightDetails.steps.flightSelection.eyebrow}
                subtitle={t.phases.flightDetails.description}
                summary={(() => {
                  if (selectedFlights.length === 0) return "";

                  if (selectedFlights.length === 1) {
                    const flight = selectedFlights[0];
                    return t.phases.flightDetails.steps.flightSelection.summary.singleFlight
                      .replace("{airline}", flight.airline)
                      .replace("{flightNumber}", flight.flightNumber)
                      .replace("{departure}", flight.departureCity)
                      .replace("{arrival}", flight.arrivalCity);
                  }

                  // Multi-segment flight
                  const segments = selectedFlights.map(
                    (flight) =>
                      `${flight.departureCity} → ${flight.arrivalCity}`
                  );
                  return t.phases.flightDetails.steps.flightSelection.summary.multiSegment
                    .replace("{count}", selectedFlights.length.toString())
                    .replace("{segments}", segments.join(" | "));
                })()}
                isCompleted={validationState.stepValidation[1]}
                hasInteracted={interactedSteps.includes(1)}
                className={accordionConfig?.padding?.wrapper || "p-4"}
                shouldStayOpen={false}
                isOpenByDefault={isFirstVisit}
                stepId="flight-selection"
                isValid={validationState.stepValidation[1]}
                isOpen={openSteps.includes(1)}
                onToggle={() => {
                  setOpenSteps((prev) =>
                    prev.includes(1)
                      ? prev.filter((step) => step !== 1)
                      : [...prev, 1]
                  );
                  handleInteraction("1");
                }}
              >
                <div className="space-y-6">
                  <ModularFlightSelector
                    showFlightSearch={true}
                    showFlightDetails={false}
                    currentPhase={3}
                    disabled={false}
                    stepNumber={1}
                    onInteract={() => handleInteraction("1")}
                    title="Flight Details"
                    eyebrow="Step 1"
                    isOpenByDefault={true}
                  />
                </div>
              </AccordionCard>

              <AccordionCard
                title={t.phases.flightDetails.steps.bookingNumber.title}
                eyebrow={t.phases.flightDetails.steps.bookingNumber.eyebrow}
                summary={bookingNumber}
                isCompleted={validationState.stepValidation[2]}
                hasInteracted={interactedSteps.includes(2)}
                className={accordionConfig?.padding?.wrapper || "p-4"}
                shouldStayOpen={false}
                stepId="booking-number"
                isValid={validationState.stepValidation[2]}
                isOpen={openSteps.includes(2)}
                onToggle={() => {
                  setOpenSteps((prev) =>
                    prev.includes(2)
                      ? prev.filter((step) => step !== 2)
                      : [...prev, 2]
                  );
                  handleInteraction("2");
                }}
              >
                <div
                  className={accordionConfig?.padding?.content || "px-4 py-4"}
                >
                  <div className="relative mt-3">
                    <input
                      type="text"
                      value={bookingNumber}
                      onChange={(e) =>
                        handleBookingNumberChange(e.target.value)
                      }
                      onFocus={() => {
                        setIsBookingInputFocused(true);
                        handleInteraction("2");
                      }}
                      onBlur={() => setIsBookingInputFocused(false)}
                      className={`
                          w-full h-14 px-4 py-2
                          text-[#4B616D] text-base font-medium font-heebo
                          bg-white rounded-xl
                          transition-all duration-[250ms] ease-in-out
                          ${
                            isBookingInputFocused
                              ? "border-2 border-blue-500"
                              : "border border-[#e0e1e4] hover:border-blue-500"
                          }
                          focus:outline-none
                          ${bookingNumber ? "pr-10" : ""}
                        `}
                    />
                    {bookingNumber && (
                      <button
                        onClick={() => handleBookingNumberChange("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        type="button"
                        aria-label="Clear input"
                      >
                        <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-[#F54538] transition-colors" />
                      </button>
                    )}
                    <label
                      className={`
                          absolute left-4 top-0
                          transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
                          text-[#9BA3AF] font-heebo
                          ${
                            isBookingInputFocused || bookingNumber
                              ? "-translate-y-1/2 text-[10px] px-1 bg-white"
                              : "translate-y-[calc(50%+7px)] text-base"
                          }
                          ${isBookingInputFocused ? "text-[#464646]" : ""}
                        `}
                    >
                      {t.phases.flightDetails.steps.bookingNumber.label}
                    </label>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    {
                      t.phases.flightDetails.steps.bookingNumber.validation
                        .format
                    }
                  </p>
                </div>
              </AccordionCard>
            </div>

            <div className="flex justify-between mt-8">
              <BackButton
                onClick={handleBack}
                text={t.phases.flightDetails.navigation.back}
              />
              <ContinueButton
                onClick={handleContinue}
                text={t.phases.flightDetails.navigation.continue}
                disabled={!canContinue}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
