"use client";

import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { FlightTypeSelector } from "./FlightTypeSelector";
import { FlightSegments } from "./FlightSegments";
import { useTranslation } from "@/hooks/useTranslation";
import useStore, { usePhase4 } from "@/store/index";
import type {
  Store as MainStoreType,
  FlightSegment,
  Flight,
  FlightType,
  FlightLocation,
  Airline,
} from "@/store/types";
import type {
  Phase4State,
  Phase4FlightSegment,
} from "@/store/slices/phase4Slice";
import type { FlightSearchParams } from "@/types/api/endpoints/flight";
import { api } from "@/services/api";
import type { ModularFlightSelectorProps } from ".";
import React from "react";

// Helper function to create a placeholder FlightLocation
const createPlaceholderLocation = (idSuffix: string): FlightLocation => ({
  id: `placeholder-loc-${idSuffix}`,
  name: "",
  code: "",
  city: "",
  country: "",
  timezone: "",
  type: "airport",
});

// Helper function to create a placeholder Airline
const createPlaceholderAirline = (): Airline => ({
  name: "",
  code: "",
});

// Helper function to create a placeholder FlightSegment
const createPlaceholderSegment = (idSuffix: string): FlightSegment => ({
  id: `placeholder-seg-${idSuffix}`,
  origin: createPlaceholderLocation(`origin-${idSuffix}`),
  destination: createPlaceholderLocation(`destination-${idSuffix}`),
  departureTime: "",
  arrivalTime: "",
  flightNumber: "",
  airline: createPlaceholderAirline(),
  duration: "",
  stops: 0,
});

// Add this helper function near the top of the file, with the other helper functions
const convertToPhase4Segment = (segment: any): any => {
  // Safely convert any segment type to phase4 compatible format
  return {
    fromLocation: segment?.fromLocation ?? null,
    toLocation: segment?.toLocation ?? null,
    date: segment?.date ?? null,
    selectedFlight: segment?.selectedFlight ?? null,
  };
};

export interface ModularFlightSelectorClientProps
  extends ModularFlightSelectorProps {
  initialData?: any;
  initialSegments?: FlightSegment[];
}

// Define a type for the prevSegmentCount ref
type SegmentCountRef = {
  phase4: number;
  main: number;
  hasInitialSegments?: boolean;
};

export const ModularFlightSelectorClient: React.FC<
  ModularFlightSelectorClientProps
> = ({
  phase,
  currentPhase,
  onFlightTypeChange,
  showFlightSearch = false,
  searchResults = [],
  isSearching = false,
  disabled = false,
  onInteract,
  stepNumber,
  setValidationState,
  setIsFlightNotListedOpen,
  onSelect,
  initialSegments,
}) => {
  const { t } = useTranslation();

  // --- Get Full Store Objects ---
  const mainStore = useStore();

  // CRITICAL FIX: Use multiple specific subscriptions instead of single phase4State
  // to ensure maximum reactivity to Phase 4 changes
  const phase4SelectedType = useStore(
    (state) => state.phase4?.selectedType || "direct"
  );
  const phase4DirectFlight = useStore((state) => state.phase4?.directFlight);
  const phase4FlightSegments = useStore(
    (state) => state.phase4?.flightSegments || []
  );
  const phase4IsInitializing = useStore(
    (state) => state.phase4?.isInitializing || false
  );

  // CRITICAL FIX: Add a subscription to _lastUpdate to force re-renders when Phase 4 data changes
  const phase4LastUpdate = useStore((state) => state.phase4?._lastUpdate || 0);

  // Get Phase 4 actions from the store
  const phase4Actions = useStore((state) => state.actions?.phase4);

  // Check if we're in Phase 4
  const isPhase4 = phase === 4 || currentPhase === 4;

  // Determine hydration status based on relevant store initialization flags
  // Log the underlying flags
  console.log(
    `[Client] Hydration Check - isPhase4: ${isPhase4}, mainInitialized: ${mainStore.core.isInitialized}, phase4Initializing: ${phase4IsInitializing}`
  );

  // For Phase 4, we'll rely on mainStore's initialization status instead of phase4Store.isInitializing
  // since phase4Store.isInitializing seems to stay true indefinitely
  const isHydrated = mainStore.core.isInitialized;

  console.log(`[Client] Calculated isHydrated: ${isHydrated}`);

  // --- Derived State ---
  // Access state directly from the store objects
  const flightType = isPhase4 ? phase4SelectedType : mainStore.flight.type;

  // Initialization flag
  const hasInitializedSegments = useRef(false); // Unified initialization flag

  // --- Get segments based on phase ---
  const segments = useMemo(() => {
    console.log("🔥 [ModularFlightSelectorClient] useMemo segments running:", {
      isPhase4,
      phase4SelectedType: phase4SelectedType,
      phase4FlightSegmentsLength: phase4FlightSegments?.length,
      phase4FlightSegments: phase4FlightSegments,
      phase4DirectFlight: phase4DirectFlight,
      phase4Initializing: phase4IsInitializing,
      mainStoreSegmentsLength: mainStore.flight.segments.length,
      timestamp: new Date().toISOString(),
    });

    if (isPhase4) {
      if (phase4SelectedType === "direct") {
        if (!phase4DirectFlight) {
          console.log(
            "🔥 [ModularFlightSelectorClient] No Phase4 direct flight data"
          );
          return [];
        }

        // SIMPLIFIED: Pass Phase4 format directly
        const directSegment = {
          ...phase4DirectFlight,
          id: `phase4-direct`,
        };

        console.log(
          "🔥 [ModularFlightSelectorClient] Created Phase 4 direct segment:",
          directSegment
        );

        return [directSegment];
      } else if (phase4SelectedType === "multi") {
        if (!phase4FlightSegments || phase4FlightSegments.length === 0) {
          console.log(
            "🔥 [ModularFlightSelectorClient] No Phase4 multi segments data"
          );
          return [];
        }

        const mappedMultiSegments = phase4FlightSegments.map(
          (segment, index) => {
            // CRITICAL FIX: Add proper error handling for segment date extraction
            let dateValue: string | null = null;
            let hasValidDate = false;

            // Check segment.date from Phase4 store first
            console.log(
              `🔍 [ModularFlightSelectorClient] Segment ${index} date validation:`,
              {
                hasSegmentDate: !!segment.date,
                segmentDateValue: segment.date,
                segmentDateType: typeof segment.date,
                isString: typeof segment.date === "string",
                trimmedNotEmpty:
                  segment.date &&
                  typeof segment.date === "string" &&
                  segment.date.trim() !== "",
                allConditionsMet:
                  segment.date &&
                  typeof segment.date === "string" &&
                  segment.date.trim() !== "",
              }
            );

            if (
              segment.date &&
              typeof segment.date === "string" &&
              segment.date.trim() !== ""
            ) {
              try {
                // Validate if it's a valid date string
                const testDate = new Date(segment.date);
                if (!isNaN(testDate.getTime())) {
                  dateValue = segment.date;
                  hasValidDate = true;
                  console.log(
                    `✅ [ModularFlightSelectorClient] Segment ${index} date validation passed: ${segment.date}`
                  );
                } else {
                  console.warn(
                    `❌ [ModularFlightSelectorClient] Segment ${index} invalid date object: ${segment.date}`
                  );
                }
              } catch (e) {
                console.warn(
                  `❌ [ModularFlightSelectorClient] Segment ${index} date parsing error: ${segment.date}`,
                  e
                );
              }
            } else {
              console.warn(
                `❌ [ModularFlightSelectorClient] Segment ${index} date validation failed:`,
                {
                  segmentDate: segment.date,
                  hasDate: !!segment.date,
                  isString: typeof segment.date === "string",
                  trimmedNotEmpty:
                    segment.date &&
                    typeof segment.date === "string" &&
                    segment.date.trim() !== "",
                }
              );
            }

            console.log(
              `🔥 [ModularFlightSelectorClient] Phase 4 multi segment ${index}:`,
              {
                segment,
                hasDate: hasValidDate,
                dateValue: dateValue,
                dateType: typeof dateValue,
                fromLocationCode: segment.fromLocation?.code || "",
                toLocationCode: segment.toLocation?.code || "",
              }
            );

            // SIMPLIFIED: Pass Phase4FlightSegment directly - no conversion needed
            // The flightSegmentToCustom function will handle both formats
            return {
              ...segment,
              id: `phase4-multi-${index}-${
                segment.fromLocation?.code || "na"
              }-${segment.toLocation?.code || "na"}`,
              // Ensure date is properly set for validation
              date: dateValue || segment.date,
            };
          }
        );

        console.log(
          "🔥 [ModularFlightSelectorClient] Created Phase 4 multi segments:",
          mappedMultiSegments
        );
        return mappedMultiSegments;
      }
    }

    // Fallback to main store
    console.log("🔥 [ModularFlightSelectorClient] Using main store segments");
    return mainStore.flight.segments;
  }, [
    isPhase4,
    phase4SelectedType, // Use individual subscriptions
    phase4DirectFlight, // Use individual subscriptions
    phase4FlightSegments, // Use individual subscriptions - this should trigger re-renders
    phase4LastUpdate, // CRITICAL: Force re-render when Phase 4 data changes
    mainStore.flight.segments,
    mainStore.flight.type,
    // CRITICAL: Use stable reference for phase4FlightSegments dates instead of JSON.stringify
    // JSON.stringify creates new string references every time, causing unnecessary re-renders
    phase4FlightSegments?.length, // Track length changes
    phase4FlightSegments?.map((s) => s.date).join(","), // More stable than JSON.stringify
  ]);

  // --- REMOVED Manual Hydration Effect ---
  // Hydration is handled by Zustand persistence middleware and checked via store flags.

  // --- Phase 4 Validation ---
  const validatePhase4 = useCallback(() => {
    // Use specific subscriptions instead of phase4Store object
    const directFlight = phase4DirectFlight;
    const flightSegments = phase4FlightSegments;
    const selectedType = phase4SelectedType;

    console.log("[ModularFlightSelectorClient] Phase 4 validation check -", {
      selectedType,
      directFlight: {
        from: directFlight?.fromLocation?.code,
        to: directFlight?.toLocation?.code,
        date: !!directFlight?.date,
        dateValue: directFlight?.date,
        hasSelectedFlight: !!directFlight?.selectedFlight,
        selectedFlightDate: directFlight?.selectedFlight?.departureTime,
      },
      segmentsCount: flightSegments.length,
      allSegmentsValid: flightSegments.every((s) => {
        const hasLocations = !!s.fromLocation?.code && !!s.toLocation?.code;
        const hasDate = !!s.date || !!s.selectedFlight?.departureTime;
        return hasLocations && hasDate;
      }),
    });

    if (selectedType === "direct") {
      // For direct flights in Phase 4, check if we have locations and either a date or a selected flight with date
      const hasLocations = !!(
        directFlight?.fromLocation?.code && directFlight?.toLocation?.code
      );

      // Accept either segment.date OR selectedFlight.departureTime as valid date
      const hasValidDate = !!(
        (directFlight?.date &&
          directFlight.date.trim() !== "" &&
          directFlight.date !== "null" &&
          directFlight.date !== "undefined") ||
        directFlight?.selectedFlight?.departureTime
      );

      const isValid = hasLocations && hasValidDate;

      console.log(
        "[ModularFlightSelectorClient] Phase 4 direct validation result:",
        {
          isValid,
          hasLocations,
          hasValidDate,
          segmentDate: directFlight?.date,
          selectedFlightDate: directFlight?.selectedFlight?.departureTime,
        }
      );
      return isValid;
    }

    if (selectedType === "multi") {
      // For multi segments, each must have locations and either a date or selected flight with date
      const isValid =
        flightSegments.length > 0 &&
        flightSegments.every((segment, index) => {
          const hasLocations = !!(
            segment.fromLocation?.code && segment.toLocation?.code
          );

          // Accept either segment.date OR selectedFlight.departureTime as valid date
          const hasValidDate = !!(
            (segment.date &&
              segment.date.trim() !== "" &&
              segment.date !== "null" &&
              segment.date !== "undefined") ||
            segment.selectedFlight?.departureTime
          );

          const segmentValid = hasLocations && hasValidDate;

          if (!segmentValid) {
            console.log(
              `❌ [ModularFlightSelectorClient] Segment ${index} validation failed:`,
              {
                segmentDate: segment.date,
                hasDate: !!segment.date,
                isString: typeof segment.date === "string",
                trimmedNotEmpty: segment.date
                  ? segment.date.trim() !== ""
                  : null,
                selectedFlightDate: segment.selectedFlight?.departureTime,
                hasSelectedFlightDate: !!segment.selectedFlight?.departureTime,
                hasLocations,
                hasValidDate,
              }
            );
          }

          return segmentValid;
        });

      console.log(
        "[ModularFlightSelectorClient] Phase 4 multi validation result:",
        {
          isValid,
          segmentCount: flightSegments.length,
          invalidSegments: flightSegments
            .map((s, i) => ({
              index: i,
              hasDate: !!s.date || !!s.selectedFlight?.departureTime,
            }))
            .filter((s) => !s.hasDate),
        }
      );
      return isValid;
    }

    return false; // Default to invalid
  }, [phase4SelectedType, phase4DirectFlight, phase4FlightSegments]); // Use individual Phase 4 subscriptions

  // --- Standard (non-Phase 4) Validation ---
  const validateSegments = useCallback(
    (currentSegments: FlightSegment[]) => {
      console.log(
        "[ModularFlightSelectorClient] Running validateSegments for standard phases"
      );
      if (!currentSegments || currentSegments.length === 0) {
        console.log(
          "[ModularFlightSelectorClient] validateSegments: No segments provided"
        );
        return false;
      }

      // Access flightType directly from component scope (derived from store)
      const requiredSegments =
        flightType === "direct" ? currentSegments.slice(0, 1) : currentSegments;

      console.log(
        "[ModularFlightSelectorClient] validateSegments: Checking required segments:",
        requiredSegments.map((s) => ({
          origin: s.origin?.code,
          dest: s.destination?.code,
          date: s.departureTime,
          dateType: typeof s.departureTime,
        }))
      );

      // Phase-based validation logic
      const isPhase1 = currentPhase === 1;

      const isValidSegments = requiredSegments.every((segment, index) => {
        const hasOrigin = !!segment?.origin?.code;
        const hasDestination = !!segment?.destination?.code;

        // CRITICAL FIX: Also check if a flight has been selected
        // Check for flight selection by looking at flightNumber (which is stored in raw segment)
        const hasSelectedFlight = !!(segment as any)?.flightNumber;

        // For non-phase1, also validate dates with strict validation (same as search button)
        let hasValidDate = true;
        if (!isPhase1) {
          const dateValue = segment?.departureTime;
          hasValidDate = !!(
            dateValue &&
            typeof dateValue === "string" &&
            dateValue.trim() !== "" &&
            dateValue !== "undefined" &&
            dateValue !== "null" &&
            // Additional check: ensure it's a valid date format
            // YYYY-MM-DD, DD.MM.YYYY, or datetime strings (YYYY-MM-DD HH:MM:SS)
            (/^\d{4}-\d{2}-\d{2}$/.test(dateValue) ||
              /^\d{2}\.\d{2}\.\d{4}$/.test(dateValue) ||
              /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateValue) ||
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dateValue))
          );
        }

        // FIXED: Different validation requirements for Phase 1 vs other phases
        let isValid;
        if (isPhase1) {
          // Phase 1: Only requires origin and destination (no date or selectedFlight required)
          isValid = hasOrigin && hasDestination;
        } else {
          // Other phases: Require origin, destination, valid date, AND selectedFlight
          isValid =
            hasOrigin && hasDestination && hasValidDate && hasSelectedFlight;
        }

        if (!isValid) {
          console.log(
            `[ModularFlightSelectorClient] validateSegments: Invalid segment ${index} found:`,
            {
              hasOrigin,
              hasDestination,
              hasValidDate,
              hasSelectedFlight,
              dateValue: segment?.departureTime,
              dateType: typeof segment?.departureTime,
              isPhase1,
              segment: segment,
            }
          );
        }

        return isValid;
      });

      console.log(
        `[ModularFlightSelectorClient] validateSegments result: ${isValidSegments} (phase: ${currentPhase}, isPhase1: ${isPhase1})`
      );
      return isValidSegments;
    },
    [flightType, currentPhase] // Add currentPhase dependency
  );

  // --- Combined Validation Handler (Stable Callback) ---
  const handleValidation = useCallback(() => {
    let isValid = false;
    if (isPhase4) {
      console.log(
        "[ModularFlightSelectorClient] handleValidation: Using Phase 4 logic"
      );
      isValid = validatePhase4();
    } else {
      console.log(
        "[ModularFlightSelectorClient] handleValidation: Using Standard logic with segments:",
        mainStore.flight.segments // Access segments directly
      );
      isValid = validateSegments(mainStore.flight.segments); // Use current segments from main store state
    }

    // Call the validation state setter from props
    if (setValidationState) {
      console.log(
        `[ModularFlightSelectorClient] Calling setValidationState with: ${isValid}`
      );
      setValidationState(isValid); // Update parent/page validation state
    } else {
      console.warn(
        "[ModularFlightSelectorClient] setValidationState prop is missing!"
      );
    }
    return isValid; // Return result for potential immediate use
  }, [
    isPhase4,
    validatePhase4,
    validateSegments,
    mainStore.flight.segments, // Depends on main store segments for standard validation
    setValidationState,
  ]);

  // --- Effect to Run Validation ---
  // Trigger validation only when relevant data changes *after* hydration and initialization
  useEffect(() => {
    if (!isHydrated || !hasInitializedSegments.current) {
      console.log(
        "[ModularFlightSelectorClient] Skipping validation: Not hydrated or initialized yet."
      );
      return;
    }

    console.log(
      "[ModularFlightSelectorClient] Running validation effect due to dependency change."
    );
    handleValidation();
  }, [
    isHydrated,
    // Dependencies for Phase 4 validation:
    isPhase4,
    phase4SelectedType, // Use individual Phase 4 subscriptions
    phase4DirectFlight, // Use individual Phase 4 subscriptions
    phase4FlightSegments, // Use individual Phase 4 subscriptions
    phase4LastUpdate, // CRITICAL: Force validation when Phase 4 data changes
    // Dependencies for Standard validation:
    mainStore.flight.segments.length, // Use length instead of entire array
    // Callback dependencies (already stable due to useCallback):
    handleValidation, // This now correctly depends on mainStore.flight.segments
  ]);

  // --- UPDATED: Handle flight type changes ---
  const handleFlightTypeChange = useCallback(
    (type: FlightType) => {
      console.log(`[ModularFlightSelectorClient] Flight type change: ${type}`);

      // Call parent handler if provided
      if (onFlightTypeChange) {
        onFlightTypeChange(type);
      }

      // For Phase 4, update phase4Store
      if (isPhase4) {
        // Initialize basic segment data if needed
        if (type === "multi" && phase4FlightSegments.length < 2) {
          // Ensure we have at least two segments for multi-type
          console.log(
            "[ModularFlightSelectorClient] Ensuring two segments for multi-type"
          );

          const firstSegment = phase4FlightSegments[0] || {
            fromLocation: phase4DirectFlight.fromLocation,
            toLocation: null,
            date: null,
            selectedFlight: null,
          };

          const secondSegment = {
            fromLocation: firstSegment.toLocation || null,
            toLocation: phase4DirectFlight.toLocation || null,
            date: null,
            selectedFlight: null,
          };

          // Set flight segments with at least two items
          phase4Actions.setFlightSegments([firstSegment, secondSegment]);
        }

        // Now set the selected type
        phase4Actions.setSelectedType(type);
      } else {
        // For other phases, update mainStore
        mainStore.actions.flight.setFlightType(type);

        // Also ensure multi-type has at least two segments
        if (type === "multi" && mainStore.flight.segments.length < 2) {
          const segments = [...mainStore.flight.segments];

          if (segments.length === 0) {
            segments.push(createPlaceholderSegment("main-multi-1"));
          }

          if (segments.length === 1) {
            segments.push({
              ...createPlaceholderSegment("main-multi-2"),
              origin:
                segments[0].destination ||
                createPlaceholderLocation("main-multi-2-origin"),
            });
          }

          mainStore.actions.flight.setSegments(segments);
        }
      }

      // Always trigger onInteract if provided
      if (onInteract) {
        onInteract();
      }
    },
    [isPhase4, phase4Actions, mainStore, onFlightTypeChange, onInteract]
  );

  // --- UPDATED: Handle segment updates (Called by child components like DirectFlight/MultiCityFlight) ---
  const handleSegmentUpdate = useCallback(
    (index: number, updatedSegmentData: Partial<FlightSegment>) => {
      console.log(
        `[ModularFlightSelectorClient] handleSegmentUpdate - Index: ${index}, Data:`,
        updatedSegmentData
      );

      // Helper to check if data is a complete Flight (duck typing)
      const isFlight = (data: any): data is Flight => {
        return (
          data &&
          typeof data === "object" &&
          "from" in data &&
          "to" in data &&
          "status" in data &&
          "type" in data
        );
      };

      let segmentForCallback: FlightSegment | null = null; // To store the segment passed to onSelect

      if (isPhase4) {
        if (flightType === "direct") {
          console.log(
            "[ModularFlightSelectorClient] Updating Phase 4 Direct Flight"
          );
          // Access state directly from store object
          const currentDirect = phase4DirectFlight;

          // Determine if we're getting a selected flight
          // Either through a full Flight object or through flightNumber/airline properties
          const isSelectedFlightUpdate =
            isFlight(updatedSegmentData) ||
            (updatedSegmentData.flightNumber && updatedSegmentData.airline);

          console.log(
            "[ModularFlightSelectorClient] Is flight selection update:",
            isSelectedFlightUpdate
          );

          // Create the base segment structure
          const segmentBase = {
            id: `phase4-direct-${
              updatedSegmentData.origin?.code ||
              currentDirect.fromLocation?.code ||
              "na"
            }-${
              updatedSegmentData.destination?.code ||
              currentDirect.toLocation?.code ||
              "na"
            }`,
            origin: updatedSegmentData.origin ?? currentDirect.fromLocation,
            destination:
              updatedSegmentData.destination ?? currentDirect.toLocation,
            // CRITICAL FIX: Don't overwrite segment date with flight's departureTime
            // The segment date is for user-selected travel dates (YYYY-MM-DD format)
            // The flight's departureTime is for flight timing (includes time)
            // Only update date if it's explicitly a date update (not a flight selection)
            departureTime:
              updatedSegmentData.origin ||
              updatedSegmentData.destination ||
              isSelectedFlightUpdate
                ? currentDirect.date // Preserve existing date when updating locations/flights
                : updatedSegmentData.departureTime ?? currentDirect.date, // Only use departureTime for explicit date updates
          };

          // CRITICAL FIX: Clear selectedFlight when locations are being updated without a flight selection
          // This prevents stale flight data from showing when user changes locations
          let newSelectedFlight: Flight | null = null;

          if (isSelectedFlightUpdate) {
            // This is a flight selection update
            newSelectedFlight = isFlight(updatedSegmentData)
              ? updatedSegmentData
              : ({
                  id: updatedSegmentData.id || segmentBase.id,
                  flightNumber: updatedSegmentData.flightNumber!,
                  airline: updatedSegmentData.airline!,
                  departureTime:
                    updatedSegmentData.departureTime ||
                    segmentBase.departureTime ||
                    "",
                  arrivalTime: updatedSegmentData.arrivalTime || "",
                  duration: updatedSegmentData.duration || "",
                  // Ensure from/to are not null with fallbacks and proper typing
                  from: segmentBase.origin || createPlaceholderLocation("from"),
                  to:
                    segmentBase.destination || createPlaceholderLocation("to"),
                  stops: updatedSegmentData.stops || 0,
                  status: "scheduled",
                  type: "direct",
                  price: updatedSegmentData.price || {
                    amount: 0,
                    currency: "EUR",
                  },
                } as Flight);
          } else if (
            // This is a location/date update - check if we should clear the selected flight
            (updatedSegmentData.origin || updatedSegmentData.destination) &&
            currentDirect.selectedFlight
          ) {
            // If locations are being updated and we have a selected flight,
            // check if the new locations match the flight's locations
            const flightFromCode =
              currentDirect.selectedFlight.from?.code ||
              currentDirect.selectedFlight.from?.iata;
            const flightToCode =
              currentDirect.selectedFlight.to?.code ||
              currentDirect.selectedFlight.to?.iata;
            const newFromCode = segmentBase.origin?.code;
            const newToCode = segmentBase.destination?.code;

            // Clear selected flight if locations don't match
            if (
              (newFromCode && newFromCode !== flightFromCode) ||
              (newToCode && newToCode !== flightToCode)
            ) {
              console.log(
                "[ModularFlightSelectorClient] Clearing selected flight due to location mismatch:",
                { flightFromCode, flightToCode, newFromCode, newToCode }
              );
              newSelectedFlight = null;
            } else {
              // Keep existing flight if locations still match
              newSelectedFlight = currentDirect.selectedFlight;
            }
          } else {
            // Keep existing selected flight for other updates (like date-only changes)
            newSelectedFlight = currentDirect.selectedFlight;
          }

          console.log(
            "[ModularFlightSelectorClient] New selected flight:",
            newSelectedFlight
          );

          // Create the full segment for the callback with flight properties merged in
          segmentForCallback = {
            ...segmentBase,
            // For regular segment properties
            arrivalTime: newSelectedFlight?.arrivalTime || "",
            flightNumber: newSelectedFlight?.flightNumber || "",
            airline: newSelectedFlight?.airline || createPlaceholderAirline(),
            duration: newSelectedFlight?.duration || "",
            stops: newSelectedFlight?.stops || 0,
            // Important: Also include the selectedFlight property for Phase 4
            selectedFlight: newSelectedFlight,
          } as FlightSegment & { selectedFlight?: Flight | null };

          // Update the Phase4 store with single Zustand call
          phase4Actions.setDirectFlight({
            fromLocation: segmentBase.origin,
            toLocation: segmentBase.destination,
            date: segmentBase.departureTime,
            selectedFlight: newSelectedFlight,
          });

          // Log the update for debugging
          console.log(
            "[ModularFlightSelectorClient] Updated phase4Store direct flight:",
            {
              fromLocation: segmentBase.origin,
              toLocation: segmentBase.destination,
              date: segmentBase.departureTime,
              selectedFlight: newSelectedFlight,
            }
          );
        } else {
          console.log(
            "[ModularFlightSelectorClient] Updating Phase 4 Multi-Segment Flight at index:",
            index
          );
          // Access state directly from store object
          const currentSegments = phase4FlightSegments;
          if (index >= 0 && index < currentSegments.length) {
            const segmentToUpdate = currentSegments[index];
            // Ensure selectedFlight is Flight or null
            const newSelectedFlight = isFlight(updatedSegmentData)
              ? updatedSegmentData
              : null;
            const newSegments = [...currentSegments];
            // Merge for the store update
            const mergedStoreSegment = {
              ...segmentToUpdate,
              fromLocation:
                updatedSegmentData.origin ?? segmentToUpdate.fromLocation,
              toLocation:
                updatedSegmentData.destination ?? segmentToUpdate.toLocation,
              date:
                updatedSegmentData.origin || updatedSegmentData.destination
                  ? segmentToUpdate.date // Preserve existing date when updating locations/flights
                  : updatedSegmentData.departureTime ?? segmentToUpdate.date, // Only use departureTime for explicit date updates
              selectedFlight: newSelectedFlight,
            };
            newSegments[index] = mergedStoreSegment;
            // Create the full segment for the callback
            segmentForCallback = {
              id: `phase4-multi-${index}-${
                mergedStoreSegment.fromLocation?.code || "na"
              }-${mergedStoreSegment.toLocation?.code || "na"}`,
              origin: mergedStoreSegment.fromLocation,
              destination: mergedStoreSegment.toLocation,
              departureTime: mergedStoreSegment.date,
              arrivalTime: newSelectedFlight?.arrivalTime || "",
              flightNumber: newSelectedFlight?.flightNumber || "",
              airline: newSelectedFlight?.airline || createPlaceholderAirline(),
              duration: newSelectedFlight?.duration || "",
              stops: newSelectedFlight?.stops || 0,
            } as FlightSegment;

            phase4Actions.setFlightSegments(newSegments); // Single Zustand update - handles everything
          } else {
            console.error(
              `[ModularFlightSelectorClient] Invalid index ${index} for Phase 4 multi-segment update`
            );
          }
        }
      } else {
        console.log(
          "[ModularFlightSelectorClient] Updating Main Store Segment at index:",
          index
        );
        // Access state directly from store object
        const currentSegment = mainStore.flight.segments[index];
        if (currentSegment) {
          const isUpdatingWithFlightObject = isFlight(updatedSegmentData);
          let flightObjectForStore: Flight | undefined = undefined;

          const mergedSegment: FlightSegment = {
            ...currentSegment, // Start with existing data
            // If updatedSegmentData is a Flight object, extract properties for the segment
            // Otherwise, spread it directly if it's a Partial<FlightSegment>
            ...(isUpdatingWithFlightObject
              ? {
                  id: updatedSegmentData.id || currentSegment.id, // Flight ID might be different from segment ID
                  origin: updatedSegmentData.from,
                  destination: updatedSegmentData.to,
                  departureTime: updatedSegmentData.departureTime,
                  arrivalTime: updatedSegmentData.arrivalTime,
                  flightNumber: updatedSegmentData.flightNumber,
                  airline: updatedSegmentData.airline,
                  duration: updatedSegmentData.duration,
                  stops: updatedSegmentData.stops,
                  // other segment-specific properties from Flight object if necessary
                }
              : updatedSegmentData),
            // CRITICAL FIX: Only use fallbacks when the field is NOT explicitly provided in updatedSegmentData
            // If a field exists in updatedSegmentData (even if undefined), respect that value
            id:
              "id" in updatedSegmentData
                ? updatedSegmentData.id ?? currentSegment.id
                : currentSegment.id,
            origin:
              "origin" in updatedSegmentData
                ? updatedSegmentData.origin ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.from
                    : currentSegment.origin)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.from
                : currentSegment.origin,
            destination:
              "destination" in updatedSegmentData
                ? updatedSegmentData.destination ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.to
                    : currentSegment.destination)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.to
                : currentSegment.destination,
            departureTime:
              "departureTime" in updatedSegmentData
                ? updatedSegmentData.departureTime ?? "" // Convert undefined to empty string for TypeScript
                : isUpdatingWithFlightObject
                ? updatedSegmentData.departureTime
                : currentSegment.departureTime,
            arrivalTime:
              "arrivalTime" in updatedSegmentData
                ? updatedSegmentData.arrivalTime ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.arrivalTime
                    : currentSegment.arrivalTime)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.arrivalTime
                : currentSegment.arrivalTime,
            flightNumber:
              "flightNumber" in updatedSegmentData
                ? updatedSegmentData.flightNumber ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.flightNumber
                    : currentSegment.flightNumber)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.flightNumber
                : currentSegment.flightNumber,
            airline:
              "airline" in updatedSegmentData
                ? updatedSegmentData.airline ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.airline
                    : currentSegment.airline)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.airline
                : currentSegment.airline,
            duration:
              "duration" in updatedSegmentData
                ? updatedSegmentData.duration ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.duration
                    : currentSegment.duration)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.duration
                : currentSegment.duration,
            stops:
              "stops" in updatedSegmentData
                ? updatedSegmentData.stops ??
                  (isUpdatingWithFlightObject
                    ? updatedSegmentData.stops
                    : currentSegment.stops)
                : isUpdatingWithFlightObject
                ? updatedSegmentData.stops
                : currentSegment.stops,
          };

          if (isUpdatingWithFlightObject) {
            flightObjectForStore = updatedSegmentData as Flight;
          }

          segmentForCallback = mergedSegment; // Store for callback

          // First, update the segment details
          mainStore.actions.flight.updateFlightSegment(index, mergedSegment);

          // If a specific flight object was provided (meaning a flight was selected from search)
          // then also update the selectedFlights record for this segment.
          if (flightObjectForStore) {
            console.log(
              `[ModularFlightSelectorClient] Setting selected flight for main store segment ${index}:`,
              flightObjectForStore
            );
            mainStore.actions.flight.setCurrentSegmentIndex(index);
            mainStore.actions.flight.setSelectedFlights([flightObjectForStore]);
          }
        } else {
          console.error(
            `[ModularFlightSelectorClient] Could not find segment at index ${index} in main store to update.`
          );
        }
      }

      // Notify parent if onSelect prop is provided and we have a segment
      if (onSelect && segmentForCallback) {
        // Use setTimeout to prevent triggering state updates during render
        setTimeout(() => {
          onSelect(segmentForCallback); // Pass the fully merged segment
        }, 0);
      } else if (onSelect) {
        console.warn(
          "[ModularFlightSelectorClient] onSelect prop exists, but segmentForCallback is null."
        );
      }

      onInteract?.();
    },
    [
      isPhase4,
      flightType,
      phase4Actions, // Depend on the whole store object as actions/state are accessed
      mainStore, // Depend on the whole store object
      onSelect,
      onInteract,
    ]
  );

  // Memoize search handler
  const handleSearch = useCallback(
    async (term: string) => {
      // ... (search logic remains the same, ensure api.searchFlights and result handling are correct) ...
      console.warn(
        "[ModularFlightSelectorClient] handleSearch not fully implemented for demonstration."
      );
    },
    [] // Add dependencies if search logic uses props/state
  );

  const flightTypes = useMemo(
    () => [
      {
        id: "direct" as const,
        label: t("flightSelector.types.direct", "Direct"),
      },
      {
        id: "multi" as const,
        label: t("flightSelector.types.multi", "Multi-City"),
      },
    ],
    [t]
  );

  // --- Unified Initialization Effect ---
  useEffect(() => {
    console.log(
      `[Client] Init Effect Start - isHydrated: ${isHydrated}, hasInitializedSegments: ${hasInitializedSegments.current}, flightType: ${flightType}`
    );

    // Only run after hydration is complete
    if (!isHydrated) {
      console.log(`[Client] Skipping initialization. Not hydrated yet.`);
      return;
    }

    // CRITICAL FIX: Check if we actually have valid existing data before deciding to initialize
    let hasValidExistingData = false;

    if (isPhase4) {
      if (flightType === "direct") {
        // Check if direct flight has any meaningful data
        hasValidExistingData = !!(
          phase4DirectFlight?.fromLocation?.code ||
          phase4DirectFlight?.toLocation?.code ||
          phase4DirectFlight?.date ||
          phase4DirectFlight?.selectedFlight
        );
      } else if (flightType === "multi") {
        // Check if multi segments have any meaningful data
        hasValidExistingData =
          phase4FlightSegments.length >= 2 &&
          phase4FlightSegments.some(
            (segment) =>
              segment.fromLocation?.code ||
              segment.toLocation?.code ||
              segment.date ||
              segment.selectedFlight
          );
      }
    } else {
      // For non-Phase4, check main store segments
      const currentSegments = mainStore.flight?.segments || [];
      hasValidExistingData =
        currentSegments.length > 0 &&
        currentSegments.some(
          (segment) =>
            segment.origin?.code ||
            segment.destination?.code ||
            segment.departureTime ||
            segment.flightNumber
        );
    }

    console.log(`[Client] Valid existing data check:`, {
      hasValidExistingData,
      isPhase4,
      flightType,
      phase4DirectFlight: phase4DirectFlight,
      phase4FlightSegmentsLength: phase4FlightSegments.length,
      hasInitializedSegments: hasInitializedSegments.current,
    });

    // CRITICAL FIX: If we have valid existing data, mark as initialized and skip initialization
    if (hasValidExistingData && !hasInitializedSegments.current) {
      console.log(
        `[Client] Found valid existing data, marking as initialized and skipping initialization`
      );
      hasInitializedSegments.current = true;
      return;
    }

    // For legitimate prop changes (like flightType), allow re-initialization
    // but avoid excessive re-initialization by checking if we actually need it
    const needsInitialization =
      !hasInitializedSegments.current ||
      (isPhase4 &&
        flightType === "multi" &&
        phase4FlightSegments.length < 2 &&
        !hasValidExistingData) ||
      (isPhase4 &&
        flightType === "direct" &&
        !phase4DirectFlight?.fromLocation &&
        !phase4DirectFlight?.toLocation &&
        !hasValidExistingData);

    if (!needsInitialization) {
      console.log(
        `[Client] Skipping initialization. Already properly initialized or has valid data.`
      );
      return;
    }

    // Set a timeout to force initialization if it doesn't happen quickly
    const forceInitTimeout = setTimeout(() => {
      if (needsInitialization) {
        console.log(`[Client] Force initializing segments after timeout`);
        initializeSegments();
      }
    }, 2000); // 2 second timeout

    function initializeSegments() {
      // Get current values to avoid dependency issues
      const currentFlightType = flightType;
      const currentIsPhase4 = isPhase4;

      console.log(
        `[Client] Initializing segments for type: ${currentFlightType}`
      );

      if (currentIsPhase4) {
        console.log(
          `[Client] Initializing Phase 4 segments. Selected type: ${currentFlightType}`
        );

        // Check if initialSegments prop is provided - prioritize this over store data
        if (initialSegments && initialSegments.length > 0) {
          console.log(
            `[Client] Using initialSegments prop for Phase 4 (${initialSegments.length} segments)`
          );

          if (flightType === "direct" && initialSegments[0]) {
            // Use the first segment from initialSegments for direct flight
            // Use the helper function to convert to Phase4 compatible format
            const convertedSegment = convertToPhase4Segment(initialSegments[0]);
            phase4Actions.setDirectFlight(convertedSegment);
          } else {
            // Use all segments for multi-city
            // Convert all segments to Phase4 compatible format
            const convertedSegments = initialSegments.map(
              convertToPhase4Segment
            );

            // Ensure we have at least 2 segments for multi-city
            if (flightType === "multi" && convertedSegments.length < 2) {
              console.log(
                `[Client] Adding a second segment for multi-city flight (initialSegments prop)`
              );
              // Add a second segment if needed
              const firstSegment = convertedSegments[0] || {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              };

              convertedSegments.push({
                fromLocation: firstSegment.toLocation || null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              });
            }

            phase4Actions.setFlightSegments(convertedSegments);
          }
        } else {
          // Fall back to store data if no initialSegments provided
          console.log(
            `[Client] No initialSegments prop, using phase4Store data`
          );

          // 🎯 CRITICAL FIX: Don't overwrite existing valid data
          // Only initialize if data is actually missing or empty
          if (flightType === "direct") {
            // Check if we already have valid data - if so, don't overwrite it
            const hasValidDirectFlightData = !!(
              phase4DirectFlight?.fromLocation?.code &&
              phase4DirectFlight?.toLocation?.code &&
              phase4DirectFlight?.date
            );

            if (!hasValidDirectFlightData) {
              console.log("[Client] Initializing empty direct flight data");
              // Only initialize if data is actually missing
              phase4Actions.setDirectFlight({
                fromLocation: phase4DirectFlight.fromLocation || null,
                toLocation: phase4DirectFlight.toLocation || null,
                date: phase4DirectFlight.date || null,
                selectedFlight: phase4DirectFlight.selectedFlight || null,
              });
            } else {
              console.log(
                "[Client] Direct flight already has valid data, skipping initialization"
              );
            }
          } else {
            // Initialize multiple segments for non-direct flights
            const segmentsToUse = phase4FlightSegments;

            // 🎯 CRITICAL FIX: Check if we already have valid multi-city data
            const hasValidMultiData =
              segmentsToUse.length >= 2 &&
              segmentsToUse.some(
                (segment) =>
                  segment.fromLocation?.code ||
                  segment.toLocation?.code ||
                  segment.date
              );

            // For multi-segment flights, ensure we have at least 2 segments
            if (flightType === "multi") {
              if (!hasValidMultiData) {
                console.log(
                  "[Client] Initializing empty multi-city flight data"
                );
                // Create a new array to avoid mutating the original
                const newSegments = [...segmentsToUse];

                // If empty, add first segment
                if (newSegments.length === 0) {
                  console.log(
                    `[Client] Adding first segment for multi-city flight`
                  );
                  newSegments.push({
                    fromLocation: phase4DirectFlight.fromLocation || null,
                    toLocation: null,
                    date: null,
                    selectedFlight: null,
                  });
                }

                // If only one segment, add another
                if (newSegments.length === 1) {
                  console.log(
                    `[Client] Adding second segment for multi-city flight`
                  );
                  newSegments.push({
                    fromLocation: newSegments[0].toLocation || null,
                    toLocation: phase4DirectFlight.toLocation || null,
                    date: null,
                    selectedFlight: null,
                  });
                }

                // Only update if we've made changes to avoid unnecessary updates
                if (newSegments.length !== segmentsToUse.length) {
                  phase4Actions.setFlightSegments(newSegments);
                }
              } else {
                console.log(
                  "[Client] Multi-city segments already have valid data, skipping initialization"
                );
              }
            } else if (segmentsToUse.length === 0) {
              // For direct flights with no segments, initialize with one
              phase4Actions.setFlightSegments([
                {
                  fromLocation: null,
                  toLocation: null,
                  date: null,
                  selectedFlight: null,
                },
              ]);
            }
          }
        }
      } else {
        // Regular non-Phase 4 initialization
        const currentSegments = mainStore.flight?.segments || [];
        const currentSegmentCount = currentSegments.length;

        if (currentSegmentCount === 0) {
          if (flightType === "direct") {
            // Create a default segment for direct flight if none exists
            const segmentsToAdd = [
              createPlaceholderSegment(`direct-init-${Date.now()}`),
            ];

            // Add segments one by one if addFlightSegment doesn't support multiple
            segmentsToAdd.forEach((seg) =>
              mainStore.actions.flight.addFlightSegment(seg)
            );
          } else if (flightType === "multi") {
            // Create at least two segments for multi-city flights
            const segmentsToAdd = [
              createPlaceholderSegment(`multi-init-1-${Date.now()}`),
              createPlaceholderSegment(`multi-init-2-${Date.now()}`),
            ];

            // Add segments one by one
            segmentsToAdd.forEach((seg) =>
              mainStore.actions.flight.addFlightSegment(seg)
            );
          }
        } else if (currentSegmentCount === 1 && flightType === "multi") {
          // Add a second segment for multi-city if only one exists
          const secondSegment = createPlaceholderSegment(
            `multi-init-2-${Date.now()}`
          );
          // Use the destination of the first segment as the origin of the second if available
          if (currentSegments[0]?.destination) {
            secondSegment.origin = currentSegments[0].destination;
          }

          mainStore.actions.flight.addFlightSegment(secondSegment);
        }
      }

      console.log("[Client] Initialization complete.");
      hasInitializedSegments.current = true;

      // Force phase4Store.isInitializing to false if it's still true
      if (isPhase4 && phase4IsInitializing) {
        console.log("[Client] Forcing phase4Store.isInitializing to false");
        // Ideally, this would use a setIsInitializing action, but we'll make sure
        // our hydration check doesn't depend on this value anymore
      }
    }

    // Call the initialization function
    initializeSegments();

    // Clean up the timeout if component unmounts
    return () => clearTimeout(forceInitTimeout);
  }, [
    isHydrated,
    isPhase4,
    flightType, // ✅ Re-added: needed for smart re-initialization
    phase4FlightSegments.length, // ✅ Check segment count for multi-city
    phase4DirectFlight?.fromLocation, // ✅ Check direct flight data
    phase4DirectFlight?.toLocation, // ✅ Check direct flight data
    // Actions (stable references from Zustand)
    phase4Actions.setDirectFlight,
    phase4Actions.setFlightSegments,
    mainStore.actions.flight.addFlightSegment,
    mainStore.actions.flight.setSegments,
  ]);

  const selectedType = useMemo(() => {
    return flightType === "direct" ? "direct" : "multi";
  }, [flightType]);

  // --- Render Logic ---
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Add a check here: Don't render FlightSegments if segments data isn't ready
  // This prevents the "No segments provided" error during initial render or hydration
  if (typeof segments === "undefined" || segments === null) {
    console.warn(
      "[ModularFlightSelectorClient] Segments data not ready, skipping FlightSegments render."
    );
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="text-sm text-gray-500">Loading flight details...</div>
      </div>
    ); // Or a more appropriate loading state
  }

  // Prepare props for FlightSegments component, passing only what's needed
  const flightSegmentsProps = {
    segments: segments, // This will be passed as initialSegmentsData
    flightType: flightType,
    phase: phase,
    currentPhase: currentPhase,
    disabled: disabled,
    showFlightSearch: showFlightSearch,
    searchResults: searchResults,
    isSearching: isSearching,
    setIsFlightNotListedOpen: setIsFlightNotListedOpen,
    onSingleSegmentUpdate: (index: number, updates: Partial<FlightSegment>) => {
      if (isPhase4) {
        // Convert FlightSegment updates to Phase4FlightSegment format
        // CRITICAL FIX: Only include fields that are actually being updated (not undefined)
        const phase4Updates: Partial<Phase4FlightSegment> = {};

        // Only include fromLocation if it's being explicitly updated
        if ("origin" in updates) {
          phase4Updates.fromLocation = updates.origin;
        }

        // Only include toLocation if it's being explicitly updated
        if ("destination" in updates) {
          phase4Updates.toLocation = updates.destination;
        }

        // Only include date if it's being explicitly updated
        if ("departureTime" in updates) {
          phase4Updates.date = updates.departureTime;
        }

        // Only include selectedFlight if it's being explicitly updated
        if ("selectedFlight" in updates) {
          phase4Updates.selectedFlight = updates.selectedFlight;
        }

        console.log(
          `🔍 [ModularFlightSelectorClient] Phase4 update conversion for segment ${index}:`,
          {
            originalUpdates: Object.keys(updates),
            convertedUpdates: Object.keys(phase4Updates),
            willPreserveExistingFlight: !("selectedFlight" in updates),
          }
        );

        // Use the new simplified action
        phase4Actions.updateSegment(index, phase4Updates);
      } else {
        // Use existing main store logic
        handleSegmentUpdate(index, updates);
      }
      onInteract?.();
    },
    onAddSegment: () => {
      if (isPhase4) {
        // Use the new simplified action
        phase4Actions.addSegment();
      } else {
        mainStore.actions.flight.addFlightSegment(
          createPlaceholderSegment(`add-${Date.now()}`)
        );
      }
      onInteract?.();
    },
    onRemoveSegment: (index: number) => {
      if (isPhase4) {
        // Use the new simplified action
        phase4Actions.removeSegment(index);
      } else {
        mainStore.actions.flight.removeFlightSegment(index);
      }
      onInteract?.();
    },
    // Pass other necessary props/callbacks expected by FlightSegments
    // NOTE: Explicitly NOT passing the full store or setValidationState if FlightSegments doesn't need it
    // setValidationState: setValidationState, // Pass down ONLY if FlightSegments calls it directly
  };

  return (
    <div className="space-y-4">
      <FlightTypeSelector
        types={flightTypes}
        selectedType={selectedType}
        onTypeSelect={handleFlightTypeChange}
        disabled={disabled}
      />

      {/* Render FlightSegments with calculated props */}
      {/* Pass the prepared props, including the renamed onSingleSegmentUpdate */}
      {/* @ts-ignore // Temporarily ignore type error if FlightSegments still expects store prop */}
      <FlightSegments initialSegmentsData={segments} {...flightSegmentsProps} />
    </div>
  );
};
