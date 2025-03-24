import React, { useCallback, useEffect, useState, useRef } from "react";
import useStore from "@/lib/state/store";
import { usePhase4Store } from "@/lib/state/phase4Store";
import { useFlightStore } from "@/lib/state/flightStore";
import { useTranslation } from "@/hooks/useTranslation";
import { FlightTypeSelector } from "@/components/shared/FlightTypeSelector";
import { FlightSegments } from "./FlightSegments";
import { useFlightValidation } from "@/hooks/useFlightValidation";
import type { FlightSelectorProps } from "./types";
import type { Translations } from "@/translations/types";
import { useAccordion } from "@/components/shared/AccordionContext";
import {
  FlightNotListedForm,
  FlightNotListedData,
} from "../FlightNotListedForm";
import { SlideSheet } from "@/components/shared/SlideSheet";
import { Flight } from "@/types/flight";
import { format } from "date-fns";
import { processLocation } from "@/lib/state/slices/flightSlice";
import { useRouter } from "next/navigation";
import type { FlightSegmentData } from "@/types/store";
import { useTranslations } from "next-intl";
// Import ClaimService for access to contact details
import { ClaimService } from "@/services/claimService";

// Helper function to safely format date for display
const formatDateForDisplay = (date: Date | string | null): string => {
  if (!date) return "";

  try {
    if (typeof date === "string") {
      // Try to parse the string as a date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return date; // Return the original string if parsing fails
      }
      return format(parsedDate, "yyyy-MM-dd");
    }

    // If it's already a Date object
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    return typeof date === "string" ? date : "";
  }
};

type FlightType = "direct" | "multi";

const DEFAULT_TRANSLATIONS = {
  direct: "Direct Flight",
  multi: "Multiple Flights",
};

const getFlightTypes = (translations: Translations | null) => {
  const flightTypes =
    translations?.flightSelector?.types || DEFAULT_TRANSLATIONS;
  return [
    { id: "direct" as const, label: flightTypes.direct },
    { id: "multi" as const, label: flightTypes.multi },
  ] as const;
};

// Helper function to ensure segments are properly linked
const ensureSegmentsAreLinked = (segments: any[]): any[] => {
  if (!segments || segments.length <= 1) return segments;

  const linkedSegments = [...segments];

  // Link segments: each segment's fromLocation should match the previous segment's toLocation
  for (let i = 1; i < linkedSegments.length; i++) {
    if (linkedSegments[i - 1].toLocation && !linkedSegments[i].fromLocation) {
      linkedSegments[i] = {
        ...linkedSegments[i],
        fromLocation: linkedSegments[i - 1].toLocation,
      };
    }
  }

  return linkedSegments;
};

// Helper function to parse dates from loaded flight segments
const parseSegmentDates = (segments: any[]): any[] => {
  if (!segments || !Array.isArray(segments)) return segments;

  return segments.map((segment) => {
    if (!segment) return segment;

    // Convert date strings to Date objects
    let parsedDate = null;
    if (segment.date) {
      try {
        // If it's already a Date object, use it directly
        if (segment.date instanceof Date && !isNaN(segment.date.getTime())) {
          parsedDate = segment.date;
        }
        // Handle string dates
        else if (typeof segment.date === "string") {
          // Handle dd.MM.yyyy format (common in shared links)
          if (segment.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = segment.date.split(".").map(Number);
            parsedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
          }
          // Handle ISO date format
          else if (segment.date.includes("T") || segment.date.includes("-")) {
            parsedDate = new Date(segment.date);
          }

          // Ensure date is valid
          if (!parsedDate || isNaN(parsedDate.getTime())) {
            parsedDate = null;
          }
        }

        // Also parse selectedFlight date if it exists
        if (segment.selectedFlight && segment.selectedFlight.date) {
          let parsedFlightDate = null;
          const flightDate = segment.selectedFlight.date;

          // If it's already a Date object, use it directly
          if (flightDate instanceof Date && !isNaN(flightDate.getTime())) {
            parsedFlightDate = flightDate;
          }
          // Handle string dates
          else if (typeof flightDate === "string") {
            // Handle dd.MM.yyyy format
            if (flightDate.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
              const [day, month, year] = flightDate.split(".").map(Number);
              parsedFlightDate = new Date(
                Date.UTC(year, month - 1, day, 12, 0, 0, 0)
              );
            }
            // Handle ISO date format
            else if (flightDate.includes("T") || flightDate.includes("-")) {
              parsedFlightDate = new Date(flightDate);
            }
          }

          // Update the selectedFlight's date if we successfully parsed it
          if (parsedFlightDate && !isNaN(parsedFlightDate.getTime())) {
            segment.selectedFlight.date = parsedFlightDate;

            // If we couldn't parse the segment date but have a flight date, use that
            if (!parsedDate) {
              parsedDate = parsedFlightDate;
            }
          }
        }
      } catch (error) {
        // Silently handle errors
      }
    }

    return {
      ...segment,
      date: parsedDate,
    };
  });
};

export const ModularFlightSelector: React.FC<FlightSelectorProps> = (props) => {
  const {
    currentPhase,
    disabled,
    stepNumber,
    setValidationState,
    onSelect,
    onInteract = () => {},
  } = props;

  const mainStore = useStore();
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const { t } = useTranslation();
  const initializedRef = useRef<Record<number, boolean>>({});

  // Create empty segments array for initial hook call
  const emptySegments: any[] = [];

  // Call useFlightValidation with required parameters
  const { validate } = useFlightValidation({
    selectedType: "direct",
    segments: emptySegments,
    phase: currentPhase || 1,
    stepNumber,
    setValidationState,
  });

  // Move all hooks to the top level
  useEffect(() => {
    // Only run initialization once per phase
    if (initializedRef.current[currentPhase]) {
      return;
    }

    // Special handling for phase 4
    if (currentPhase === 4) {
      // Phase 4 should only use its own data, never inherit from phases 1-3
      const phase4Data = flightStore.getFlightData(4);

      if (!phase4Data) {
        // Initialize with empty data for phase 4
        const emptyPhase4Data = {
          selectedType: "direct" as "direct" | "multi",
          flightSegments: [
            {
              fromLocation: null,
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
          ],
          selectedFlights: [],
          fromLocation: null,
          toLocation: null,
          timestamp: Date.now(),
        };

        // Save isolated phase 4 data
        flightStore.saveFlightData(4, emptyPhase4Data);
      }

      initializedRef.current[currentPhase] = true;
      return;
    }

    // Check for saved data in localStorage first (for phases 1-3)
    const phaseStateKey = `phase${currentPhase}State`;
    let localStorageData: any = null;
    try {
      const savedState = localStorage.getItem(phaseStateKey);
      // Also check for shared flight data
      const sharedFlightData =
        localStorage.getItem("_sharedFlightData") === "true";

      if (savedState) {
        localStorageData = JSON.parse(savedState);
      }

      // Check if we have shared flight data but no localStorage data
      else if (sharedFlightData) {
        // Try to find shared flight data in URL or session storage
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const sharedFlightParam = urlParams.get("shared_flight");

          if (sharedFlightParam) {
            const decodedData = decodeURIComponent(sharedFlightParam);
            const parsedData = JSON.parse(decodedData);

            if (parsedData._sharedClaim) {
              localStorageData = parsedData;
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      }
    } catch (error) {
      // Silently handle errors
    }

    // Check for saved flight data in the flightStore
    let hasCurrentPhaseData = flightStore.getFlightData(currentPhase) !== null;

    // Only check for other phases' data if we're not in phase 4
    const hasPhase1Data =
      currentPhase === 4 ? false : flightStore.getFlightData(1) !== null;
    const hasPhase2Data =
      currentPhase === 4 ? false : flightStore.getFlightData(2) !== null;
    const hasPhase3Data =
      currentPhase === 4 ? false : flightStore.getFlightData(3) !== null;

    // Special handling for phase 3 to recover flight selections
    if (currentPhase === 3) {
      // Try to get the saved phase 3 state from local storage first
      let recoveredFlightData = null;

      try {
        const savedPhase3State = localStorage.getItem("phase3State");
        if (savedPhase3State) {
          const phase3Data = JSON.parse(savedPhase3State);

          // Check if the data has selected flights
          if (
            phase3Data &&
            phase3Data.selectedFlights &&
            phase3Data.selectedFlights.length > 0
          ) {
            recoveredFlightData = phase3Data;
          }
        }
      } catch (error) {
        // Silently handle errors
      }

      // If we didn't find flight data in localStorage, check flight store
      if (!recoveredFlightData) {
        const storeData = flightStore.getFlightData(3);
        if (
          storeData &&
          storeData.selectedFlights &&
          storeData.selectedFlights.length > 0
        ) {
          recoveredFlightData = storeData;
        }
      }

      // If we found valid flight data with selected flights, use it
      if (recoveredFlightData) {
        // If we have a recovery source, make sure to save it to the flightStore
        flightStore.saveFlightData(3, recoveredFlightData);

        // Mark as having current phase data so we'll use this data
        hasCurrentPhaseData = true;
      }
    }

    // Prioritize localStorage data over flightStore data
    let dataToUse: any = null;

    if (currentPhase === 4) {
      // For phase 4, ONLY use phase 4 data, never phases 1-3

      // Clear any data from phases 1-3 in localStorage
      try {
        // Save essential data that should be preserved
        const termsAccepted = localStorage.getItem("termsAccepted");
        const privacyAccepted = localStorage.getItem("privacyAccepted");
        const currentPhase = "4"; // Force phase 4
        const completedPhases = localStorage.getItem("completedPhases");
        const phasesCompletedViaContinue = localStorage.getItem(
          "phasesCompletedViaContinue"
        );

        // Clear all localStorage and sessionStorage except for essential data
        localStorage.clear();

        // Clear sessionStorage except for booking_number
        const bookingNumberValue = sessionStorage.getItem("booking_number");
        sessionStorage.clear();
        if (bookingNumberValue) {
          sessionStorage.setItem("booking_number", bookingNumberValue);
        }

        // Restore essential data
        if (termsAccepted) localStorage.setItem("termsAccepted", termsAccepted);
        if (privacyAccepted)
          localStorage.setItem("privacyAccepted", privacyAccepted);
        localStorage.setItem("currentPhase", currentPhase);
        if (completedPhases)
          localStorage.setItem("completedPhases", completedPhases);
        if (phasesCompletedViaContinue)
          localStorage.setItem(
            "phasesCompletedViaContinue",
            phasesCompletedViaContinue
          );

        // Also clear the flightStore for phase 4
        flightStore.clearFlightData(4);
      } catch (e) {
        // Silently handle errors
      }

      // For phase 4, create fresh data instead of using existing data
      dataToUse = {
        selectedType: "direct",
        _isMultiSegment: false,
        flightSegments: [
          {
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          },
        ],
      };

      console.log(`[ModularFlightSelector] Using fresh data for phase 4`, {
        selectedType: dataToUse.selectedType,
        isMultiSegment: dataToUse._isMultiSegment,
        flightSegments: dataToUse.flightSegments,
        timestamp: new Date().toISOString(),
      });
    } else {
      // For phases 1-3, use the existing logic
      if (localStorageData) {
        // Use localStorage data if available
        dataToUse = localStorageData;

        // Parse dates in flight segments
        if (
          dataToUse.flightSegments &&
          Array.isArray(dataToUse.flightSegments)
        ) {
          // Create a deep copy before modification
          const parsedSegments = parseSegmentDates(
            JSON.parse(JSON.stringify(dataToUse.flightSegments))
          );
          dataToUse = {
            ...dataToUse,
            flightSegments: parsedSegments,
          };
        }

        console.log(
          `[ModularFlightSelector] Using localStorage data for phase ${currentPhase}`,
          {
            selectedType: dataToUse.selectedType,
            isMultiSegment: dataToUse._isMultiSegment,
            flightSegments: dataToUse.flightSegments,
            timestamp: new Date().toISOString(),
          }
        );

        // Ensure segments are properly linked
        if (
          dataToUse.flightSegments &&
          dataToUse.flightSegments.length > 1 &&
          dataToUse.selectedType === "multi"
        ) {
          // Create a deep copy before modification
          const linkedSegments = ensureSegmentsAreLinked(
            JSON.parse(JSON.stringify(dataToUse.flightSegments))
          );
          dataToUse = {
            ...dataToUse,
            flightSegments: linkedSegments,
          };

          console.log(
            `[ModularFlightSelector] Linked segments for phase ${currentPhase} from localStorage`,
            {
              linkedSegments: dataToUse.flightSegments,
              timestamp: new Date().toISOString(),
            }
          );
        }
      } else if (hasCurrentPhaseData) {
        // Use current phase data if available
        dataToUse = flightStore.getFlightData(currentPhase);

        // Parse dates in flight segments
        if (
          dataToUse.flightSegments &&
          Array.isArray(dataToUse.flightSegments)
        ) {
          // Create a deep copy before modification
          const parsedSegments = parseSegmentDates(
            JSON.parse(JSON.stringify(dataToUse.flightSegments))
          );
          dataToUse = {
            ...dataToUse,
            flightSegments: parsedSegments,
          };
        }

        console.log(
          `=== ModularFlightSelector - Using Current Phase Data Directly ===`,
          {
            phase: currentPhase,
            flightSegments: dataToUse.flightSegments,
            fromLocation: dataToUse.fromLocation,
            toLocation: dataToUse.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // Ensure segments are properly linked
        if (
          dataToUse.flightSegments &&
          dataToUse.flightSegments.length > 1 &&
          dataToUse.selectedType === "multi"
        ) {
          // Create a deep copy before modification
          const linkedSegments = ensureSegmentsAreLinked(
            JSON.parse(JSON.stringify(dataToUse.flightSegments))
          );
          dataToUse = {
            ...dataToUse,
            flightSegments: linkedSegments,
          };

          console.log(
            `[ModularFlightSelector] Linked segments for phase ${currentPhase} from current phase data`,
            {
              linkedSegments: dataToUse.flightSegments,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    }

    if (dataToUse) {
      console.log(
        `[ModularFlightSelector] Final data to use for phase ${currentPhase}`,
        {
          selectedType: dataToUse.selectedType,
          isMultiSegment: dataToUse._isMultiSegment,
          hasSegments: !!dataToUse.flightSegments,
          segmentCount: dataToUse.flightSegments?.length,
          timestamp: new Date().toISOString(),
        }
      );

      // Set the flight type
      const selectedType = dataToUse.selectedType || "direct";

      // Update the store based on the current phase
      if (currentPhase === 4 && phase4Store) {
        phase4Store.setSelectedType(selectedType);

        // Set from and to locations
        if (dataToUse.fromLocation) {
          const fromLocation =
            typeof dataToUse.fromLocation === "string"
              ? processLocation(dataToUse.fromLocation)
              : processLocation(dataToUse.fromLocation);
          phase4Store.setFromLocation(fromLocation);
        }

        if (dataToUse.toLocation) {
          const toLocation =
            typeof dataToUse.toLocation === "string"
              ? processLocation(dataToUse.toLocation)
              : processLocation(dataToUse.toLocation);
          phase4Store.setToLocation(toLocation);
        }

        // Set flight segments if available
        if (dataToUse.flightSegments && dataToUse.flightSegments.length > 0) {
          // Ensure all segments have proper location objects
          const processedSegments = dataToUse.flightSegments.map(
            (segment: any, index: number) => {
              // Process from location
              let fromLocation = segment.fromLocation;
              if (fromLocation) {
                fromLocation =
                  typeof fromLocation === "string"
                    ? processLocation(fromLocation)
                    : processLocation(fromLocation);
              } else if (index === 0 && dataToUse.fromLocation) {
                // Use main fromLocation for first segment if missing
                fromLocation =
                  typeof dataToUse.fromLocation === "string"
                    ? processLocation(dataToUse.fromLocation)
                    : processLocation(dataToUse.fromLocation);
              } else if (
                index > 0 &&
                dataToUse.flightSegments[index - 1]?.toLocation
              ) {
                // Use previous segment's toLocation as this segment's fromLocation
                const prevToLocation =
                  dataToUse.flightSegments[index - 1].toLocation;
                fromLocation =
                  typeof prevToLocation === "string"
                    ? processLocation(prevToLocation)
                    : processLocation(prevToLocation);
              }

              // Process to location
              let toLocation = segment.toLocation;
              if (toLocation) {
                toLocation =
                  typeof toLocation === "string"
                    ? processLocation(toLocation)
                    : processLocation(toLocation);
              } else if (
                index === dataToUse.flightSegments.length - 1 &&
                dataToUse.toLocation
              ) {
                // Use main toLocation for last segment if missing
                toLocation =
                  typeof dataToUse.toLocation === "string"
                    ? processLocation(dataToUse.toLocation)
                    : processLocation(dataToUse.toLocation);
              }

              return {
                ...segment,
                fromLocation,
                toLocation,
              };
            }
          );

          phase4Store.setFlightSegments(processedSegments);
        } else {
          // Create default segments based on the selected type
          const defaultSegments: any[] = [];
          if (selectedType === "direct") {
            defaultSegments.push({
              fromLocation: dataToUse.fromLocation
                ? processLocation(dataToUse.fromLocation)
                : null,
              toLocation: dataToUse.toLocation
                ? processLocation(dataToUse.toLocation)
                : null,
              date: null,
              selectedFlight: null,
            });
          } else if (selectedType === "multi") {
            // For multi-segment, create at least two segments
            defaultSegments.push({
              fromLocation: dataToUse.fromLocation
                ? processLocation(dataToUse.fromLocation)
                : null,
              toLocation: null,
              date: null,
              selectedFlight: null,
            });
            defaultSegments.push({
              fromLocation: null,
              toLocation: dataToUse.toLocation
                ? processLocation(dataToUse.toLocation)
                : null,
              date: null,
              selectedFlight: null,
            });
          }
          phase4Store.setFlightSegments(defaultSegments);
        }
      } else if (mainStore) {
        mainStore.setSelectedType(selectedType);

        // Set from and to locations
        if (dataToUse.fromLocation) {
          const fromLocation =
            typeof dataToUse.fromLocation === "string"
              ? processLocation(dataToUse.fromLocation)
              : processLocation(dataToUse.fromLocation);
          mainStore.setFromLocation(fromLocation);
        }

        if (dataToUse.toLocation) {
          const toLocation =
            typeof dataToUse.toLocation === "string"
              ? processLocation(dataToUse.toLocation)
              : processLocation(dataToUse.toLocation);
          mainStore.setToLocation(toLocation);
        }

        // Set flight segments if available
        if (dataToUse.flightSegments && dataToUse.flightSegments.length > 0) {
          // Ensure all segments have proper location objects
          const processedSegments = dataToUse.flightSegments.map(
            (segment: any, index: number) => {
              // Process from location
              let fromLocation = segment.fromLocation;
              if (fromLocation) {
                fromLocation =
                  typeof fromLocation === "string"
                    ? processLocation(fromLocation)
                    : processLocation(fromLocation);
              } else if (index === 0 && dataToUse.fromLocation) {
                // Use main fromLocation for first segment if missing
                fromLocation =
                  typeof dataToUse.fromLocation === "string"
                    ? processLocation(dataToUse.fromLocation)
                    : processLocation(dataToUse.fromLocation);
              } else if (
                index > 0 &&
                dataToUse.flightSegments[index - 1]?.toLocation
              ) {
                // Use previous segment's toLocation as this segment's fromLocation
                const prevToLocation =
                  dataToUse.flightSegments[index - 1].toLocation;
                fromLocation =
                  typeof prevToLocation === "string"
                    ? processLocation(prevToLocation)
                    : processLocation(prevToLocation);
              }

              // Process to location
              let toLocation = segment.toLocation;
              if (toLocation) {
                toLocation =
                  typeof toLocation === "string"
                    ? processLocation(toLocation)
                    : processLocation(toLocation);
              } else if (
                index === dataToUse.flightSegments.length - 1 &&
                dataToUse.toLocation
              ) {
                // Use main toLocation for last segment if missing
                toLocation =
                  typeof dataToUse.toLocation === "string"
                    ? processLocation(dataToUse.toLocation)
                    : processLocation(dataToUse.toLocation);
              }

              return {
                ...segment,
                fromLocation,
                toLocation,
              };
            }
          );

          mainStore.setFlightSegments(processedSegments);
        } else {
          // Create default segments based on the selected type
          const defaultSegments: any[] = [];
          if (selectedType === "direct") {
            defaultSegments.push({
              fromLocation: dataToUse.fromLocation
                ? processLocation(dataToUse.fromLocation)
                : null,
              toLocation: dataToUse.toLocation
                ? processLocation(dataToUse.toLocation)
                : null,
              date: null,
              selectedFlight: null,
            });
          } else if (selectedType === "multi") {
            // For multi-segment, create at least two segments
            defaultSegments.push({
              fromLocation: dataToUse.fromLocation
                ? processLocation(dataToUse.fromLocation)
                : null,
              toLocation: null,
              date: null,
              selectedFlight: null,
            });
            defaultSegments.push({
              fromLocation: null,
              toLocation: dataToUse.toLocation
                ? processLocation(dataToUse.toLocation)
                : null,
              date: null,
              selectedFlight: null,
            });
          }
          mainStore.setFlightSegments(defaultSegments);
        }
      }

      // Save the data to the flight store for the current phase
      flightStore.saveFlightData(currentPhase, {
        selectedType,
        _isMultiSegment: selectedType === "multi",
        flightSegments:
          currentPhase === 4
            ? phase4Store?.flightSegments
            : mainStore?.flightSegments,
        fromLocation:
          currentPhase === 4
            ? (phase4Store?.fromLocation as any)
            : (mainStore?.fromLocation as any),
        toLocation:
          currentPhase === 4
            ? (phase4Store?.toLocation as any)
            : (mainStore?.toLocation as any),
        timestamp: Date.now(),
      });

      // Also sync to other phases if we're not in phase 4
      if (currentPhase !== 4) {
        [1, 2, 3].forEach((phase) => {
          if (phase !== currentPhase) {
            flightStore.saveFlightData(phase, {
              selectedType,
              _isMultiSegment: selectedType === "multi",
              flightSegments: mainStore?.flightSegments,
              fromLocation: mainStore?.fromLocation,
              toLocation: mainStore?.toLocation,
              timestamp: Date.now(),
            });
          }
        });
      }
    }

    // Mark this phase as initialized
    initializedRef.current[currentPhase] = true;
  }, [currentPhase, flightStore, mainStore, phase4Store]);

  useEffect(() => {
    // Handle phase changes
  }, [currentPhase]);

  useEffect(() => {
    // Handle validation updates
  }, [validate, currentPhase, setValidationState]);

  // Add debug logging to help diagnose rendering issues
  console.log("=== ModularFlightSelector - Rendering ===", {
    phase: currentPhase,
    selectedType: mainStore?.selectedType,
    segmentCount: mainStore?.flightSegments.length,
    hasSegments: mainStore?.flightSegments.length > 0,
    selectedFlights:
      mainStore?.selectedFlights?.map((f: any) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })) || [],
    phase4SelectedFlights:
      currentPhase === 4
        ? phase4Store?.selectedFlights?.map((f: any) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })) || []
        : [],
    flightStorePhase4:
      currentPhase === 4
        ? flightStore?.getSelectedFlights?.(4)?.map((f: any) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })) || []
        : [],
    timestamp: new Date().toISOString(),
  });

  // Check for browser notifications
  React.useEffect(() => {
    if (typeof window !== "undefined" && currentPhase === 4) {
      console.log(
        "=== ModularFlightSelector - Checking for notifications ===",
        {
          phase: currentPhase,
          timestamp: new Date().toISOString(),
        }
      );

      const checkForNotifications = () => {
        const notifications = document.querySelectorAll(
          '.notification, [role="alert"], .alert, .toast'
        );
        if (notifications.length > 0) {
          console.log(
            "=== Found notification elements in ModularFlightSelector ===",
            {
              count: notifications.length,
              elements: Array.from(notifications).map((el) => ({
                className: el.className,
                text: el.textContent,
              })),
              timestamp: new Date().toISOString(),
            }
          );
        }
      };

      // Check immediately and after a short delay
      checkForNotifications();

      // Set up a mutation observer to detect dynamically added notifications
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            checkForNotifications();
          }
        });
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Clean up
      return () => {
        observer.disconnect();
      };
    }
  }, [currentPhase, mainStore]);

  // Check localStorage for flight data
  React.useEffect(() => {
    if (typeof window !== "undefined" && currentPhase === 4) {
      try {
        const phase4FlightData = localStorage.getItem("phase4FlightData");
        if (phase4FlightData) {
          // Remove the problematic console.log and parsedData reference
        }
      } catch (error) {
        // Silently handle errors
      }
    }
  }, [currentPhase]);

  return (
    <ModularFlightSelectorContent
      {...props}
      mainStore={mainStore}
      phase4Store={phase4Store}
      flightStore={flightStore}
      validate={validate}
      t={t}
    />
  );
};

// Create a separate component for the content to avoid conditional hook calls
const ModularFlightSelectorContent: React.FC<
  FlightSelectorProps & {
    mainStore: any;
    phase4Store: any;
    flightStore: any;
    validate: any;
    t: any;
  }
> = ({
  showFlightSearch = false,
  showFlightDetails = false,
  currentPhase,
  disabled,
  stepNumber,
  setValidationState,
  onSelect,
  onInteract = () => {},
  mainStore,
  phase4Store,
  flightStore,
  validate,
  t,
}) => {
  // Define empty location objects instead of hardcoded airports
  const emptyLocation = { value: "", label: "", description: "" };

  // All hooks must be called at the top level, before any conditional logic
  const { autoTransition } = useAccordion();
  const [isFlightNotListedOpen, setIsFlightNotListedOpen] = useState(false);
  const [isFromSearchSheet, setIsFromSearchSheet] = useState(false);
  // State for prefilled personal details
  const [prefilledDetails, setPrefilledDetails] = useState<any>(null);
  const isInitializedRef = useRef(false);
  const initialized = useRef(false);
  const hasInitialized = useRef(false);

  // Get personal details before opening the form
  const handleOpenFlightNotListedForm = async () => {
    try {
      // Clear any previously stored description to avoid it persisting
      localStorage.removeItem("flight_not_found_data_description");

      // Try to get personal details first from local sources
      const personalDetails = ClaimService.getLastPersonalDetails();

      // Get existing deal ID and contact ID from session storage
      const dealId = sessionStorage.getItem("hubspot_deal_id");
      const contactId = sessionStorage.getItem("hubspot_contact_id");

      // Check if we have any stored flight-not-found description from previous submissions
      let previousDescription = "";
      try {
        // First try to get from the dedicated field
        const storedDescription = localStorage.getItem(
          "flight_not_found_data_description"
        );
        if (storedDescription) {
          previousDescription = storedDescription;
        } else {
          // Fall back to extracting from the legacy format for backward compatibility
          const storedData = localStorage.getItem("flight_not_found_data");
          if (storedData) {
            const descriptionMatch = storedData.match(/Description: ([\s\S]+)/);
            if (descriptionMatch && descriptionMatch[1]) {
              previousDescription = descriptionMatch[1].trim();
            }
          }
        }
      } catch (error) {
        // Silently handle errors
      }

      // If we have a contactId but no personal details, try to fetch data from HubSpot
      let hubspotDetails = null;
      if (contactId && (!personalDetails || !personalDetails.email)) {
        try {
          const response = await fetch(
            "/.netlify/functions/hubspot-integration/contact-details",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ contactId }),
            }
          );

          if (response.ok) {
            const result = await response.json();

            if (result && result.properties) {
              hubspotDetails = {
                salutation: result.properties.salutation || "",
                firstName: result.properties.firstname || "",
                lastName: result.properties.lastname || "",
                email: result.properties.email || "",
              };
            }
          }
        } catch (error) {
          // Silently handle errors
        }
      }

      // Set prefilled data, prioritizing HubSpot data over local data
      if (hubspotDetails) {
        setPrefilledDetails({
          salutation: hubspotDetails.salutation || "",
          firstName: hubspotDetails.firstName || "",
          lastName: hubspotDetails.lastName || "",
          email: hubspotDetails.email || "",
          // Don't include description here so it doesn't get passed to the form
        });
      } else if (personalDetails) {
        setPrefilledDetails({
          salutation: personalDetails.salutation || "",
          firstName: personalDetails.firstName || "",
          lastName: personalDetails.lastName || "",
          email: personalDetails.email || "",
          // Don't include description here so it doesn't get passed to the form
        });
      } else {
        // Reset prefilled data if no personal details found
        setPrefilledDetails(null);
      }
    } catch (error) {
      // Silently handle errors
    } finally {
      // Open the form
      setIsFromSearchSheet(false);
      setIsFlightNotListedOpen(true);
    }
  };

  // Get current segments and type from the appropriate store
  const segments =
    currentPhase === 4
      ? phase4Store?.flightSegments
      : mainStore?.flightSegments || [];
  const selectedType =
    currentPhase === 4
      ? phase4Store?.selectedType
      : mainStore?.selectedType || "direct";

  // Use our new validation hook - must be called unconditionally
  const { validate: validateFlight } = useFlightValidation({
    selectedType,
    segments,
    phase: currentPhase,
    stepNumber,
    setValidationState,
    validateOnMount: true,
  });

  // Helper function to ensure location is an object or null - moved outside of useEffect
  const ensureLocationObject = useCallback(
    (location: any, defaultLocation: any = emptyLocation) => {
      if (!location) return defaultLocation;

      if (typeof location === "string") {
        // If it's just a string, convert it to a location object
        return { value: location, label: location, description: "" };
      }

      if (typeof location === "object" && location.value) {
        // If it's already a location object, return it
        return location;
      }

      return defaultLocation;
    },
    []
  );

  // Effect to handle auto-transition when validation state changes
  useEffect(() => {
    if (mainStore?.validationState?.stepValidation?.[1] && stepNumber === 1) {
      setTimeout(() => {
        autoTransition("2", true);
      }, 100);
    }
  }, [mainStore?.validationState?.stepValidation, stepNumber, autoTransition]);

  // Initialize flight data from saved state
  useEffect(() => {
    // Skip if already initialized
    if (hasInitialized.current) return;

    // Check for saved flight data in flightStore for the current phase
    const flightStoreData = flightStore.getFlightData(currentPhase);

    // If phase 4, ONLY use phase 4 data, never fall back to other phases
    if (currentPhase === 4) {
      if (flightStoreData) {
        console.log(
          "=== ModularFlightSelector - Using Phase 4 Data Directly ===",
          {
            phase: currentPhase,
            flightSegments: flightStoreData.flightSegments,
            fromLocation: flightStoreData.fromLocation,
            toLocation: flightStoreData.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // For Phase 4 alternative flights, reset dates to null to force user selection
        if (phase4Store) {
          const travelStatus = phase4Store.travelStatusAnswers?.find?.(
            (a: any) => a.questionId === "travel_status"
          )?.value;

          const needsAlternativeFlight =
            travelStatus === "provided" ||
            travelStatus === "took_alternative_own";

          if (needsAlternativeFlight) {
            // Create segments with null dates to force selection
            const updatedSegments = flightStoreData.flightSegments.map(
              (segment: any) => ({
                ...segment,
                date: null,
              })
            );

            // Update phase4Store with segments that have null dates
            phase4Store.setFlightSegments(updatedSegments);

            console.log(
              "=== ModularFlightSelector - Reset Phase 4 Alternative Flight Dates ===",
              {
                travelStatus,
                segmentsWithNullDates: updatedSegments,
                timestamp: new Date().toISOString(),
              }
            );
          }
        }

        // Mark as initialized
        hasInitialized.current = true;
      } else {
        // For phase 4, if no data exists, create fresh data instead of using data from other phases
        console.log(
          "=== ModularFlightSelector - Creating Fresh Phase 4 Data ===",
          {
            timestamp: new Date().toISOString(),
          }
        );

        // Mark as initialized
        hasInitialized.current = true;
      }
      return;
    }

    // For phases 1-3, use the existing logic
    // If no data for current phase, try to get data from phase 3 (flight details)
    const phase3Data = currentPhase !== 3 ? flightStore.getFlightData(3) : null;

    // Use the current phase data or fall back to phase 3 data
    const dataToUse = flightStoreData || phase3Data;

    console.log("=== ModularFlightSelector - Checking Saved Flight Data ===", {
      phase: currentPhase,
      hasCurrentPhaseData: !!flightStoreData,
      hasPhase3Data: !!phase3Data,
      dataSource: flightStoreData
        ? "currentPhase"
        : phase3Data
        ? "phase3"
        : "none",
      hasMultiSegmentData:
        dataToUse?._isMultiSegment === true &&
        Array.isArray(dataToUse?.flightSegments) &&
        dataToUse.flightSegments.length > 1,
      savedType: dataToUse?.selectedType,
      isMultiSegmentFlag: dataToUse?._isMultiSegment,
      segmentCount: dataToUse?.flightSegments?.length,
      timestamp: new Date().toISOString(),
    });

    // If we have data for the current phase, use it directly without modification
    if (flightStoreData && currentPhase !== 1) {
      console.log(
        "=== ModularFlightSelector - Using Current Phase Data Directly ===",
        {
          phase: currentPhase,
          flightSegments: flightStoreData.flightSegments,
          fromLocation: flightStoreData.fromLocation,
          toLocation: flightStoreData.toLocation,
          timestamp: new Date().toISOString(),
        }
      );

      // For non-phase 4, update the mainStore
      if (currentPhase !== 4 && mainStore && flightStoreData.flightSegments) {
        // Set the flight type
        mainStore.setSelectedType(flightStoreData.selectedType || "direct");

        // Create a deep copy of flight segments to avoid mutating read-only objects
        const flightSegmentsCopy = JSON.parse(
          JSON.stringify(flightStoreData.flightSegments)
        );

        // Set the flight segments
        mainStore.setFlightSegments(flightSegmentsCopy);

        // Set the from and to locations
        if (flightStoreData.fromLocation) {
          mainStore.setFromLocation(
            ensureLocationObject(flightStoreData.fromLocation)
          );
        }

        if (flightStoreData.toLocation) {
          mainStore.setToLocation(
            ensureLocationObject(flightStoreData.toLocation)
          );
        }

        // Mark as initialized
        hasInitialized.current = true;
        return;
      }
      // For phase 4, update the phase4Store
      else if (
        currentPhase === 4 &&
        phase4Store &&
        flightStoreData.flightSegments
      ) {
        // Set the flight type
        phase4Store.setSelectedType(flightStoreData.selectedType || "direct");

        // Create a deep copy of flight segments to avoid mutating read-only objects
        const flightSegmentsCopy = JSON.parse(
          JSON.stringify(flightStoreData.flightSegments)
        );

        // Set the flight segments
        phase4Store.setFlightSegments(flightSegmentsCopy);

        // Set the from and to locations
        if (flightStoreData.fromLocation) {
          phase4Store.setFromLocation(
            ensureLocationObject(flightStoreData.fromLocation)
          );
        }

        if (flightStoreData.toLocation) {
          phase4Store.setToLocation(
            ensureLocationObject(flightStoreData.toLocation)
          );
        }

        // Mark as initialized
        hasInitialized.current = true;
        return;
      }
    }

    // Special handling for phase 1
    if (currentPhase === 1) {
      console.log("=== ModularFlightSelector - Phase 1 Initialization ===", {
        dataToUse,
        timestamp: new Date().toISOString(),
      });

      // Initialize with empty locations instead of hardcoded defaults
      if (mainStore) {
        // Determine if we should use direct or multi based on saved data
        const flightType = dataToUse?.selectedType || "direct";

        if (flightType === "direct") {
          // For direct flights, create a single empty segment
          const directSegment = {
            fromLocation: null,
            toLocation: null,
            selectedFlight: null,
            date: null,
          };

          mainStore.setSelectedType("direct");
          mainStore.setFlightSegments([directSegment]);
          mainStore.setFromLocation(null);
          mainStore.setToLocation(null);

          console.log(
            "=== ModularFlightSelector - Phase 1 Direct Flight Initialized ===",
            {
              segment: directSegment,
              timestamp: new Date().toISOString(),
            }
          );
        } else {
          // For multi-segment flights, create two empty segments
          const multiSegments = [
            {
              fromLocation: null,
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
            {
              fromLocation: null,
              toLocation: null,
              selectedFlight: null,
              date: null,
            },
          ];

          mainStore.setSelectedType("multi");
          mainStore.setFlightSegments(multiSegments);
          mainStore.setFromLocation(null);
          mainStore.setToLocation(null);

          console.log(
            "=== ModularFlightSelector - Phase 1 Multi-Segment Flight Initialized ===",
            {
              segments: multiSegments,
              timestamp: new Date().toISOString(),
            }
          );
        }
      }
    }
    // Special handling for phase 3 - Flight Details
    else if (currentPhase === 3) {
      console.log("=== ModularFlightSelector - Phase 3 Initialization ===", {
        dataToUse,
        timestamp: new Date().toISOString(),
      });

      // For phase 3, we want to preserve the locations from the current phase data
      // Only fall back to phase 1 if necessary
      const phase1Data = flightStore.getFlightData(1);

      console.log(
        "=== ModularFlightSelector - Phase 3 Using Phase 1 Data ===",
        {
          hasPhase1Data: !!phase1Data,
          phase1FromLocation: phase1Data?.fromLocation,
          phase1ToLocation: phase1Data?.toLocation,
          currentFromLocation: dataToUse?.fromLocation,
          currentToLocation: dataToUse?.toLocation,
          timestamp: new Date().toISOString(),
        }
      );

      if (mainStore) {
        // Determine if we should use direct or multi based on saved data
        const flightType =
          dataToUse?.selectedType || phase1Data?.selectedType || "direct";

        // Check if we have explicit null values in the segments
        const hasExplicitNullFromLocation =
          Array.isArray(dataToUse?.flightSegments) &&
          dataToUse.flightSegments.length > 0 &&
          dataToUse.flightSegments[0].fromLocation === null;

        const hasExplicitNullToLocation =
          Array.isArray(dataToUse?.flightSegments) &&
          dataToUse.flightSegments.length > 0 &&
          dataToUse.flightSegments[0].toLocation === null;

        // IMPORTANT: Prioritize the current phase data over phase 1 data
        // Only use phase 1 data if the current phase data doesn't have the location
        const fromLocationObj = hasExplicitNullFromLocation
          ? null
          : ensureLocationObject(
              dataToUse?.fromLocation ||
                dataToUse?.flightSegments?.[0]?.fromLocation,
              ensureLocationObject(phase1Data?.fromLocation, emptyLocation)
            );

        const toLocationObj = hasExplicitNullToLocation
          ? null
          : ensureLocationObject(
              dataToUse?.toLocation ||
                dataToUse?.flightSegments?.[
                  dataToUse?.flightSegments?.length - 1
                ]?.toLocation,
              ensureLocationObject(
                phase1Data?.toLocation,
                flightType === "direct" ? emptyLocation : emptyLocation
              )
            );

        if (flightType === "direct") {
          // For direct flights, create a single segment
          const directSegment = {
            fromLocation: fromLocationObj,
            toLocation: toLocationObj,
            selectedFlight: null,
            date: null,
          };

          mainStore.setSelectedType("direct");
          mainStore.setFlightSegments([directSegment]);
          mainStore.setFromLocation(processLocation(fromLocationObj));
          mainStore.setToLocation(processLocation(toLocationObj));

          // Explicitly save to flight store to ensure consistency
          const fromLocationValue =
            typeof fromLocationObj === "string"
              ? fromLocationObj
              : fromLocationObj?.value;
          const toLocationValue =
            typeof toLocationObj === "string"
              ? toLocationObj
              : toLocationObj?.value;

          flightStore.saveFlightData(3, {
            selectedType: "direct",
            _isMultiSegment: false,
            flightSegments: [directSegment],
            fromLocation: fromLocationValue,
            toLocation: toLocationValue,
            timestamp: Date.now(),
          });

          // Also save to phase 1 to ensure consistency
          flightStore.saveFlightData(1, {
            selectedType: "direct",
            _isMultiSegment: false,
            flightSegments: [directSegment],
            fromLocation: fromLocationValue,
            toLocation: toLocationValue,
            timestamp: Date.now(),
          });
        } else {
          // For multi-segment flights, use the existing segments if available
          let multiSegments;

          if (
            Array.isArray(dataToUse?.flightSegments) &&
            dataToUse.flightSegments.length > 1
          ) {
            // Use the existing segments from the current phase data
            multiSegments = dataToUse.flightSegments.map(
              (segment: any, index: number) => {
                // Check if this segment has explicit null values
                const hasNullFromLocation = segment.fromLocation === null;
                const hasNullToLocation = segment.toLocation === null;

                return {
                  ...segment,
                  fromLocation: hasNullFromLocation
                    ? null
                    : ensureLocationObject(
                        segment.fromLocation,
                        index === 0 ? emptyLocation : emptyLocation
                      ),
                  toLocation: hasNullToLocation
                    ? null
                    : ensureLocationObject(
                        segment.toLocation,
                        index === dataToUse.flightSegments.length - 1
                          ? emptyLocation
                          : emptyLocation
                      ),
                  selectedFlight: segment.selectedFlight || null,
                  date: segment.date || null,
                };
              }
            );
          } else {
            // Create new segments if none exist
            const intermediateLocationObj = ensureLocationObject(
              emptyLocation,
              emptyLocation
            );

            multiSegments = [
              {
                fromLocation: fromLocationObj,
                toLocation: intermediateLocationObj,
                selectedFlight: null,
                date: null,
              },
              {
                fromLocation: intermediateLocationObj,
                toLocation: toLocationObj,
                selectedFlight: null,
                date: null,
              },
            ];
          }

          mainStore.setSelectedType("multi");
          mainStore.setFlightSegments(multiSegments);
          mainStore.setFromLocation(processLocation(fromLocationObj));
          mainStore.setToLocation(processLocation(toLocationObj));

          // Explicitly save to flight store to ensure consistency
          const fromLocationValue =
            typeof fromLocationObj === "string"
              ? fromLocationObj
              : fromLocationObj?.value;
          const toLocationValue =
            typeof toLocationObj === "string"
              ? toLocationObj
              : toLocationObj?.value;

          flightStore.saveFlightData(3, {
            selectedType: "multi",
            _isMultiSegment: true,
            flightSegments: multiSegments,
            fromLocation: fromLocationValue,
            toLocation: toLocationValue,
            timestamp: Date.now(),
          });

          // Also save to phase 1 to ensure consistency
          flightStore.saveFlightData(1, {
            selectedType: "multi",
            _isMultiSegment: true,
            flightSegments: multiSegments,
            fromLocation: fromLocationValue,
            toLocation: toLocationValue,
            timestamp: Date.now(),
          });
        }
      }
    }
    // Handle other phases
    else if (dataToUse) {
      // Handle direct flights
      if (dataToUse.selectedType === "direct") {
        console.log(
          "=== ModularFlightSelector - Initializing with Direct Flight Data ===",
          {
            phase: currentPhase,
            fromLocation: dataToUse.fromLocation,
            toLocation: dataToUse.toLocation,
            flightSegments: dataToUse.flightSegments,
            timestamp: new Date().toISOString(),
          }
        );

        // For direct flights, we need a single segment with fromLocation and toLocation
        // Check if we're in phase 3 and have data from phase 1
        let fromLocation;
        let toLocation;

        // Check if we have explicit null values in the segments
        const hasExplicitNullFromLocation =
          Array.isArray(dataToUse.flightSegments) &&
          dataToUse.flightSegments.length > 0 &&
          dataToUse.flightSegments[0].fromLocation === null;

        const hasExplicitNullToLocation =
          Array.isArray(dataToUse.flightSegments) &&
          dataToUse.flightSegments.length > 0 &&
          dataToUse.flightSegments[0].toLocation === null;

        console.log(
          "=== ModularFlightSelector - Checking for Null Locations ===",
          {
            hasExplicitNullFromLocation,
            hasExplicitNullToLocation,
            segmentFromLocation: dataToUse.flightSegments?.[0]?.fromLocation,
            segmentToLocation: dataToUse.flightSegments?.[0]?.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // For phase 3, try to get data from phase 1 if available
        if (currentPhase === 3) {
          const phase1Data = flightStore.getFlightData(1);
          console.log(
            "=== ModularFlightSelector - Checking Phase 1 Data for Phase 3 ===",
            {
              hasPhase1Data: !!phase1Data,
              phase1FromLocation: phase1Data?.fromLocation,
              phase1ToLocation: phase1Data?.toLocation,
              currentFromLocation: dataToUse.fromLocation,
              currentToLocation: dataToUse.toLocation,
              timestamp: new Date().toISOString(),
            }
          );

          // Preserve null values if they exist in the segments
          fromLocation = hasExplicitNullFromLocation
            ? null
            : ensureLocationObject(
                dataToUse.fromLocation || phase1Data?.fromLocation,
                emptyLocation
              );

          toLocation = hasExplicitNullToLocation
            ? null
            : ensureLocationObject(
                dataToUse.toLocation || phase1Data?.toLocation,
                emptyLocation
              );
        } else {
          // For other phases, use the data from the current phase
          // Preserve null values if they exist in the segments
          fromLocation = hasExplicitNullFromLocation
            ? null
            : ensureLocationObject(dataToUse.fromLocation, emptyLocation);

          toLocation = hasExplicitNullToLocation
            ? null
            : ensureLocationObject(dataToUse.toLocation, emptyLocation);
        }

        console.log("=== ModularFlightSelector - Direct Flight Locations ===", {
          phase: currentPhase,
          fromLocation,
          toLocation,
          isFromLocationNull: fromLocation === null,
          isToLocationNull: toLocation === null,
          timestamp: new Date().toISOString(),
        });

        // Create a single segment for direct flights
        const directSegment = {
          fromLocation,
          toLocation,
          selectedFlight: null,
          date: null,
        };

        // For non-phase 4, update the mainStore
        if (currentPhase !== 4 && mainStore) {
          mainStore.setSelectedType("direct");
          mainStore.setFlightSegments([directSegment]);
          mainStore.setFromLocation(processLocation(fromLocation));
          mainStore.setToLocation(processLocation(toLocation));

          // Save to flight store to ensure consistency
          flightStore.saveFlightData(currentPhase, {
            selectedType: "direct",
            _isMultiSegment: false,
            flightSegments: [directSegment],
            fromLocation: processLocation(fromLocation),
            toLocation: processLocation(toLocation),
            timestamp: Date.now(),
          });
        }
        // For phase 4, update the phase4Store
        else if (currentPhase === 4 && phase4Store) {
          phase4Store.setSelectedType("direct");
          phase4Store.setFlightSegments([directSegment]);
          phase4Store.setFromLocation(processLocation(fromLocation));
          phase4Store.setToLocation(processLocation(toLocation));

          // Save to flight store to ensure consistency
          flightStore.saveFlightData(currentPhase, {
            selectedType: "direct",
            _isMultiSegment: false,
            flightSegments: [directSegment],
            fromLocation: processLocation(fromLocation),
            toLocation: processLocation(toLocation),
            timestamp: Date.now(),
          });
        }
      }
      // Handle multi-segment flights
      else if (
        dataToUse?._isMultiSegment === true &&
        Array.isArray(dataToUse?.flightSegments) &&
        dataToUse.flightSegments.length > 1
      ) {
        console.log(
          "=== ModularFlightSelector - Initializing with Multi-Segment Data ===",
          {
            phase: currentPhase,
            segmentCount: dataToUse.flightSegments.length,
            segments: dataToUse.flightSegments,
            timestamp: new Date().toISOString(),
          }
        );

        // For non-phase 4, update the mainStore
        if (currentPhase !== 4 && mainStore && dataToUse) {
          // Ensure we have valid location data for each segment
          const updatedSegments = dataToUse.flightSegments.map(
            (segment: any, index: number) => {
              // Check if this segment has explicit null values
              const hasExplicitNullFromLocation = segment.fromLocation === null;
              const hasExplicitNullToLocation = segment.toLocation === null;

              let fromLocation;
              let toLocation;

              // First segment should have fromLocation = BER
              if (index === 0) {
                // Preserve null values for fromLocation
                fromLocation = hasExplicitNullFromLocation
                  ? null
                  : ensureLocationObject(
                      segment.fromLocation || dataToUse.fromLocation,
                      emptyLocation
                    );

                // If we have more than 2 segments, the toLocation should be the fromLocation of the next segment
                // Otherwise, for a 2-segment flight, it should be 'FRA'
                // Preserve null values for toLocation
                if (hasExplicitNullToLocation) {
                  toLocation = null;
                } else if (dataToUse.flightSegments.length > 2) {
                  toLocation = ensureLocationObject(
                    segment.toLocation ||
                      dataToUse.flightSegments[index + 1]?.fromLocation,
                    emptyLocation
                  );
                } else {
                  toLocation = ensureLocationObject(
                    segment.toLocation,
                    emptyLocation
                  );
                }
              }
              // Last segment should have toLocation = MUC
              else if (index === dataToUse.flightSegments.length - 1) {
                // Preserve null values for toLocation
                toLocation = hasExplicitNullToLocation
                  ? null
                  : ensureLocationObject(
                      segment.toLocation || dataToUse.toLocation,
                      emptyLocation
                    );

                // If this is the second segment in a 2-segment flight, fromLocation should be 'FRA'
                // Preserve null values for fromLocation
                if (hasExplicitNullFromLocation) {
                  fromLocation = null;
                } else if (
                  index === 1 &&
                  dataToUse.flightSegments.length === 2
                ) {
                  fromLocation = ensureLocationObject(
                    segment.fromLocation,
                    emptyLocation
                  );
                } else {
                  fromLocation = ensureLocationObject(
                    segment.fromLocation ||
                      dataToUse.flightSegments[index - 1]?.toLocation,
                    emptyLocation
                  );
                }
              }
              // Middle segments (if any)
              else {
                // Preserve null values for fromLocation
                fromLocation = hasExplicitNullFromLocation
                  ? null
                  : ensureLocationObject(
                      segment.fromLocation ||
                        dataToUse.flightSegments[index - 1]?.toLocation,
                      emptyLocation
                    );

                // Preserve null values for toLocation
                toLocation = hasExplicitNullToLocation
                  ? null
                  : ensureLocationObject(
                      segment.toLocation ||
                        dataToUse.flightSegments[index + 1]?.fromLocation,
                      emptyLocation
                    );
              }

              // Log each segment's data for debugging
              console.log(
                `=== ModularFlightSelector - Processing Segment ${index} ===`,
                {
                  originalSegment: segment,
                  fromLocation,
                  toLocation,
                  preservedNull: {
                    fromLocationNull: segment.fromLocation === null,
                    toLocationNull: segment.toLocation === null,
                    hasExplicitNullFromLocation,
                    hasExplicitNullToLocation,
                  },
                  timestamp: new Date().toISOString(),
                }
              );

              // Return the updated segment
              return {
                ...segment,
                fromLocation,
                toLocation,
              };
            }
          );

          // Only update if the segments have changed
          if (
            JSON.stringify(mainStore.flightSegments) !==
            JSON.stringify(updatedSegments)
          ) {
            mainStore.setFlightSegments(updatedSegments);
            mainStore.setSelectedType("multi");

            // Also update the fromLocation and toLocation in the store
            if (updatedSegments.length > 0) {
              const firstSegment = updatedSegments[0];
              const lastSegment = updatedSegments[updatedSegments.length - 1];

              if (
                firstSegment.fromLocation &&
                firstSegment.fromLocation.value
              ) {
                mainStore.setFromLocation(
                  processLocation(firstSegment.fromLocation)
                );
              }

              if (lastSegment.toLocation && lastSegment.toLocation.value) {
                mainStore.setToLocation(
                  processLocation(lastSegment.toLocation)
                );
              }
            }
          }
        }
        // For phase 4, update the phase4Store
        else if (currentPhase === 4 && phase4Store && dataToUse) {
          // Ensure we have valid location data for each segment
          const updatedSegments = dataToUse.flightSegments.map(
            (segment: any, index: number) => {
              // Check if this segment has explicit null values
              const hasExplicitNullFromLocation = segment.fromLocation === null;
              const hasExplicitNullToLocation = segment.toLocation === null;

              let fromLocation;
              let toLocation;

              // First segment should have fromLocation = BER
              if (index === 0) {
                // Preserve null values for fromLocation
                fromLocation = hasExplicitNullFromLocation
                  ? null
                  : ensureLocationObject(
                      segment.fromLocation || dataToUse.fromLocation,
                      emptyLocation
                    );

                // If we have more than 2 segments, the toLocation should be the fromLocation of the next segment
                // Otherwise, for a 2-segment flight, it should be 'FRA'
                // Preserve null values for toLocation
                if (hasExplicitNullToLocation) {
                  toLocation = null;
                } else if (dataToUse.flightSegments.length > 2) {
                  toLocation = ensureLocationObject(
                    segment.toLocation ||
                      dataToUse.flightSegments[index + 1]?.fromLocation,
                    emptyLocation
                  );
                } else {
                  toLocation = ensureLocationObject(
                    segment.toLocation,
                    emptyLocation
                  );
                }
              }
              // Last segment should have toLocation = MUC
              else if (index === dataToUse.flightSegments.length - 1) {
                // Preserve null values for toLocation
                toLocation = hasExplicitNullToLocation
                  ? null
                  : ensureLocationObject(
                      segment.toLocation || dataToUse.toLocation,
                      emptyLocation
                    );

                // If this is the second segment in a 2-segment flight, fromLocation should be 'FRA'
                // Preserve null values for fromLocation
                if (hasExplicitNullFromLocation) {
                  fromLocation = null;
                } else if (
                  index === 1 &&
                  dataToUse.flightSegments.length === 2
                ) {
                  fromLocation = ensureLocationObject(
                    segment.fromLocation,
                    emptyLocation
                  );
                } else {
                  fromLocation = ensureLocationObject(
                    segment.fromLocation ||
                      dataToUse.flightSegments[index - 1]?.toLocation,
                    emptyLocation
                  );
                }
              }
              // Middle segments (if any)
              else {
                // Preserve null values for fromLocation
                fromLocation = hasExplicitNullFromLocation
                  ? null
                  : ensureLocationObject(
                      segment.fromLocation ||
                        dataToUse.flightSegments[index - 1]?.toLocation,
                      emptyLocation
                    );

                // Preserve null values for toLocation
                toLocation = hasExplicitNullToLocation
                  ? null
                  : ensureLocationObject(
                      segment.toLocation ||
                        dataToUse.flightSegments[index + 1]?.fromLocation,
                      emptyLocation
                    );
              }

              // Log each segment's data for debugging
              console.log(
                `=== ModularFlightSelector - Processing Phase 4 Segment ${index} ===`,
                {
                  originalSegment: segment,
                  fromLocation,
                  toLocation,
                  preservedNull: {
                    fromLocationNull: segment.fromLocation === null,
                    toLocationNull: segment.toLocation === null,
                    hasExplicitNullFromLocation,
                    hasExplicitNullToLocation,
                  },
                  timestamp: new Date().toISOString(),
                }
              );

              // Return the updated segment
              return {
                ...segment,
                fromLocation,
                toLocation,
              };
            }
          );

          // Only update if the segments have changed
          if (
            JSON.stringify(phase4Store.flightSegments) !==
            JSON.stringify(updatedSegments)
          ) {
            phase4Store.setFlightSegments(updatedSegments);
            phase4Store.setSelectedType("multi");

            // Also update the fromLocation and toLocation in the store
            if (updatedSegments.length > 0) {
              const firstSegment = updatedSegments[0];
              const lastSegment = updatedSegments[updatedSegments.length - 1];

              if (
                firstSegment.fromLocation &&
                firstSegment.fromLocation.value
              ) {
                phase4Store.setFromLocation(
                  processLocation(firstSegment.fromLocation)
                );
              }

              if (lastSegment.toLocation && lastSegment.toLocation.value) {
                phase4Store.setToLocation(
                  processLocation(lastSegment.toLocation)
                );
              }
            }
          }
        }
      }
      // Default case - no valid data or single segment
      else if (dataToUse.fromLocation && dataToUse.toLocation) {
        console.log(
          "=== ModularFlightSelector - Initializing with Basic Location Data ===",
          {
            phase: currentPhase,
            fromLocation: dataToUse.fromLocation,
            toLocation: dataToUse.toLocation,
            timestamp: new Date().toISOString(),
          }
        );

        // Create a single segment with the available location data
        const fromLocation = ensureLocationObject(dataToUse.fromLocation);
        const toLocation = ensureLocationObject(dataToUse.toLocation);

        const singleSegment = {
          fromLocation,
          toLocation,
          selectedFlight: null,
          date: null,
        };

        // For non-phase 4, update the mainStore
        if (currentPhase !== 4 && mainStore) {
          // Default to direct if no type is specified
          const flightType = dataToUse.selectedType || "direct";
          mainStore.setSelectedType(flightType);
          mainStore.setFlightSegments([singleSegment]);
          mainStore.setFromLocation(processLocation(fromLocation));
          mainStore.setToLocation(processLocation(toLocation));
        }
        // For phase 4, update the phase4Store
        else if (currentPhase === 4 && phase4Store) {
          // Default to direct if no type is specified
          const flightType = dataToUse.selectedType || "direct";
          phase4Store.setSelectedType(flightType);
          phase4Store.setFlightSegments([singleSegment]);
          phase4Store.setFromLocation(processLocation(fromLocation));
          phase4Store.setToLocation(processLocation(toLocation));
        }
      }
    }

    // Mark as initialized to prevent multiple initializations
    hasInitialized.current = true;
  }, [
    currentPhase,
    mainStore,
    phase4Store,
    flightStore,
    ensureLocationObject,
    emptyLocation,
  ]);

  const handleFlightTypeChange = useCallback(
    (type: FlightType) => {
      // Initialize segments based on type
      const newSegments =
        type === "direct"
          ? [
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
            ]
          : [
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
              {
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              },
            ];

      // Clear all stores in a synchronized way
      if (currentPhase === 4) {
        // For phase 4, only update phase4Store
        phase4Store.batchUpdate({
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: null,
          toLocation: null,
          flightSegments: newSegments,
          selectedType: type,
          _lastUpdate: Date.now(),
        });

        // Update flightStore only for phase 4
        flightStore.saveFlightData(4, {
          selectedType: type,
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          fromLocation: null,
          toLocation: null,
          _lastUpdate: Date.now(),
        });

        // Update localStorage for phase 4
        if (typeof window !== "undefined") {
          const phaseKey = `phase4FlightData`;
          const existingData = localStorage.getItem(phaseKey);
          const phaseData = existingData ? JSON.parse(existingData) : {};

          localStorage.setItem(
            phaseKey,
            JSON.stringify({
              ...phaseData,
              selectedType: type,
              flightSegments: newSegments,
              selectedFlights: [],
              timestamp: Date.now(),
            })
          );

          // Also ensure phase 4 data is isolated in flightStore localStorage
          localStorage.setItem(
            `flightData_phase4`,
            JSON.stringify({
              selectedType: type,
              flightSegments: newSegments,
              selectedFlight: null,
              selectedFlights: [],
              fromLocation: null,
              toLocation: null,
              timestamp: Date.now(),
            })
          );
        }
      } else {
        if (!mainStore?.batchUpdateWizardState) return;

        // For phases 1-3, update mainStore
        mainStore.batchUpdateWizardState({
          selectedType: type,
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          _lastUpdate: Date.now(),
        });

        // Update flightStore for phases 1-3
        flightStore.saveFlightData(currentPhase, {
          selectedType: type,
          flightSegments: newSegments,
          selectedFlight: null,
          selectedFlights: [],
          _lastUpdate: Date.now(),
        });

        // Also update flightStore for all phases 1-3 to ensure consistency
        [1, 2, 3].forEach((phase) => {
          if (phase !== currentPhase) {
            flightStore.saveFlightData(phase, {
              selectedType: type,
              flightSegments: newSegments,
              selectedFlight: null,
              selectedFlights: [],
              _lastUpdate: Date.now(),
            });
          }
        });

        // Update localStorage for phases 1-3
        if (typeof window !== "undefined") {
          const phaseKey = `phase${currentPhase}FlightData`;
          const existingData = localStorage.getItem(phaseKey);
          const phaseData = existingData ? JSON.parse(existingData) : {};

          localStorage.setItem(
            phaseKey,
            JSON.stringify({
              ...phaseData,
              selectedType: type,
              flightSegments: newSegments,
              selectedFlights: [],
              timestamp: Date.now(),
            })
          );
        }
      }

      // Trigger validation
      validate();

      // Notify parent
      onInteract();
    },
    [currentPhase, mainStore, phase4Store, flightStore, validate, onInteract]
  );

  const handleFlightNotListedSubmit = async (data: any) => {
    // Handle flight not listed form submission
    console.log("Flight not listed data:", data);

    // Format the flight details in a readable format for HubSpot
    const flightNotFoundDetails = `Salutation: ${data.salutation}
First Name: ${data.firstName}
Last Name: ${data.lastName}
Email: ${data.email}
Description: ${data.description}`;

    // Check if we have an existing deal ID
    const dealId = sessionStorage.getItem("hubspot_deal_id");
    const contactId = sessionStorage.getItem("hubspot_contact_id");

    console.log("Submitting flight not listed data with:", {
      dealId,
      contactId,
      hasDescription: !!data.description,
    });

    // Store only the description part in localStorage for future use - we'll clear this after successful submission
    localStorage.setItem(
      "flight_not_found_data_description",
      data.description || ""
    );
    // Keep the full formatted data for backward compatibility, but we'll use the specific field going forward
    localStorage.setItem("flight_not_found_data", flightNotFoundDetails);

    try {
      // First, ensure we have a contact
      let currentContactId = contactId;
      if (!currentContactId) {
        console.log("Creating new contact for flight not listed submission");
        const contactResponse = await fetch(
          "/.netlify/functions/hubspot-integration/contact",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              salutation: data.salutation,
            }),
          }
        );

        if (!contactResponse.ok) {
          const errorText = await contactResponse.text();
          throw new Error(`Failed to create contact: ${errorText}`);
        }

        const contactResult = await contactResponse.json();
        currentContactId = contactResult.hubspotContactId;

        if (currentContactId) {
          sessionStorage.setItem("hubspot_contact_id", currentContactId);
        } else {
          throw new Error("Failed to create contact - no ID returned");
        }
      }

      // Now create or update the deal
      const currentDealId = dealId;
      console.log(
        `${
          currentDealId ? "Updating" : "Creating"
        } deal with flight not found data`
      );

      // Get flight information from the store to include in the deal
      const fromLocation = mainStore?.flightSegments?.[0]?.fromLocation;
      const toLocation = mainStore?.flightSegments?.[0]?.toLocation;

      const dealResponse = await fetch(
        "/.netlify/functions/hubspot-integration/deal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dealId: currentDealId, // Will be undefined for new deals
            contactId: currentContactId,
            flight_not_found: flightNotFoundDetails,
            stage: currentPhase === 3 ? "flight_details" : "initial_assessment",
            // Include flight route information if available
            directFlight: {
              fromLocation: fromLocation || undefined,
              toLocation: toLocation || undefined,
            },
            personalDetails: {
              firstName: data.firstName,
              lastName: data.lastName,
              salutation: data.salutation,
              email: data.email,
            },
          }),
        }
      );

      if (!dealResponse.ok) {
        const errorText = await dealResponse.text();
        throw new Error(`Failed to create/update deal: ${errorText}`);
      }

      const dealResult = await dealResponse.json();
      console.log("Successfully saved deal for flight not found:", dealResult);

      // Save the deal ID for future use
      if (dealResult.hubspotDealId && !currentDealId) {
        sessionStorage.setItem("hubspot_deal_id", dealResult.hubspotDealId);
      }

      // Clear the stored description on successful submission so it doesn't prefill next time
      localStorage.removeItem("flight_not_found_data_description");

      // Close the form on success
      setIsFlightNotListedOpen(false);
      return dealResult;
    } catch (error) {
      console.error("Error in flight not listed submission:", error);
      throw error;
    }
  };

  const handleFormClose = () => {
    setIsFlightNotListedOpen(false);
    // Don't clear the form data here, as it might be a cancel - we'll clear in submit handler

    if (isFromSearchSheet) {
      window.dispatchEvent(
        new CustomEvent("form-closed", { detail: { fromSearchSheet: true } })
      );
    }
  };

  // Get translations and types
  const types = getFlightTypes(t as Translations | null);

  // Add debug logging to help diagnose rendering issues
  console.log("=== ModularFlightSelector - Rendering ===", {
    phase: currentPhase,
    selectedType: mainStore?.selectedType,
    segmentCount: mainStore?.flightSegments.length,
    hasSegments: mainStore?.flightSegments.length > 0,
    selectedFlights:
      mainStore?.selectedFlights?.map((f: any) => ({
        id: f.id,
        flightNumber: f.flightNumber,
        date: f.date,
      })) || [],
    phase4SelectedFlights:
      currentPhase === 4
        ? phase4Store?.selectedFlights?.map((f: any) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })) || []
        : [],
    flightStorePhase4:
      currentPhase === 4
        ? flightStore?.getSelectedFlights?.(4)?.map((f: any) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })) || []
        : [],
    timestamp: new Date().toISOString(),
  });

  // Handle updates to flight segments and sync data between phases
  const handleSegmentUpdate = useCallback(
    (index: number, updatedSegment: any) => {
      console.log(`[ModularFlightSelector] Segment ${index} updated`, {
        updatedSegment,
        phase: currentPhase,
        timestamp: new Date().toISOString(),
      });

      // Get the current segments from the appropriate store
      const currentSegments =
        currentPhase === 4
          ? phase4Store?.flightSegments || []
          : mainStore?.flightSegments || [];

      // Create a copy of the segments array
      const newSegments = [...currentSegments] as any[];

      // Update the segment at the specified index
      newSegments[index] = updatedSegment;

      // Update the store with the new segments
      if (currentPhase === 4 && phase4Store) {
        phase4Store.setFlightSegments(newSegments);

        // Update main locations if this is the first or last segment
        if (index === 0 && updatedSegment.fromLocation) {
          phase4Store.setFromLocation(
            processLocation(updatedSegment.fromLocation)
          );
        }

        if (index === newSegments.length - 1 && updatedSegment.toLocation) {
          phase4Store.setToLocation(processLocation(updatedSegment.toLocation));
        }
      } else if (mainStore) {
        mainStore.setFlightSegments(newSegments);

        // Update main locations if this is the first or last segment
        if (index === 0 && updatedSegment.fromLocation) {
          mainStore.setFromLocation(
            processLocation(updatedSegment.fromLocation)
          );
        }

        if (index === newSegments.length - 1 && updatedSegment.toLocation) {
          mainStore.setToLocation(processLocation(updatedSegment.toLocation));
        }
      }

      // Process locations for store compatibility
      const fromLocationProcessed = newSegments[0]?.fromLocation
        ? processLocation(newSegments[0].fromLocation)
        : null;
      const toLocationProcessed = newSegments[newSegments.length - 1]
        ?.toLocation
        ? processLocation(newSegments[newSegments.length - 1].toLocation)
        : null;

      // Save to flight store for all relevant phases
      const dataToSave = {
        selectedType:
          currentPhase === 4
            ? phase4Store?.selectedType
            : mainStore?.selectedType,
        _isMultiSegment:
          currentPhase === 4
            ? phase4Store?.selectedType === "multi"
            : mainStore?.selectedType === "multi",
        flightSegments: newSegments,
        fromLocation: fromLocationProcessed,
        toLocation: toLocationProcessed,
        timestamp: Date.now(),
      };

      // Save to the current phase
      flightStore.saveFlightData(currentPhase, dataToSave);

      // If we're in phase 1, 2, or 3, sync to all non-phase-4 phases
      if (currentPhase !== 4) {
        [1, 2, 3].forEach((phase) => {
          if (phase !== currentPhase) {
            flightStore.saveFlightData(phase, dataToSave);
          }
        });
      }

      // Update localStorage for the current phase
      try {
        const phaseStateKey = `phase${currentPhase}State`;
        const existingState = localStorage.getItem(phaseStateKey);
        if (existingState) {
          const parsedState = JSON.parse(existingState);
          const updatedState = {
            ...parsedState,
            selectedType: dataToSave.selectedType,
            _isMultiSegment: dataToSave._isMultiSegment,
            flightSegments: newSegments.map((seg: any) => ({
              ...seg,
              date: seg.date ? formatDateForDisplay(seg.date) : null,
            })),
            fromLocation: fromLocationProcessed,
            toLocation: toLocationProcessed,
          };
          localStorage.setItem(phaseStateKey, JSON.stringify(updatedState));
        }

        // Also update localStorage for other relevant phases
        if (currentPhase !== 4) {
          [1, 2, 3].forEach((phase) => {
            if (phase !== currentPhase) {
              const otherPhaseStateKey = `phase${phase}State`;
              const otherExistingState =
                localStorage.getItem(otherPhaseStateKey);
              if (otherExistingState) {
                const parsedState = JSON.parse(otherExistingState);
                const updatedState = {
                  ...parsedState,
                  selectedType: dataToSave.selectedType,
                  _isMultiSegment: dataToSave._isMultiSegment,
                  flightSegments: newSegments.map((seg: any) => ({
                    ...seg,
                    date: seg.date ? formatDateForDisplay(seg.date) : null,
                  })),
                  fromLocation: fromLocationProcessed,
                  toLocation: toLocationProcessed,
                };
                localStorage.setItem(
                  otherPhaseStateKey,
                  JSON.stringify(updatedState)
                );
              }
            }
          });
        }
      } catch (error) {
        // Silently handle errors
      }
    },
    [currentPhase, flightStore, mainStore, phase4Store]
  );

  return (
    <div className="space-y-8">
      <FlightTypeSelector
        types={types}
        selectedType={selectedType}
        onTypeSelect={handleFlightTypeChange}
        disabled={disabled}
      />
      <div className="space-y-4">
        <FlightSegments
          showFlightSearch={showFlightSearch}
          showFlightDetails={showFlightDetails}
          currentPhase={currentPhase}
          disabled={disabled}
          onInteract={onInteract}
          stepNumber={stepNumber}
          setValidationState={setValidationState}
          setIsFlightNotListedOpen={(isOpen) => {
            setIsFromSearchSheet(true);
            setIsFlightNotListedOpen(isOpen);
          }}
          store={currentPhase === 4 ? phase4Store : mainStore}
          onSegmentUpdate={handleSegmentUpdate}
        />
      </div>
      {currentPhase !== 1 && (
        <div className="flex justify-center gap-4">
          <button
            onClick={handleOpenFlightNotListedForm}
            className="text-sm font-medium text-[#F54538] hover:text-[#F54538]/80"
          >
            {t.flightSelector.flightNotListed.button}
          </button>
        </div>
      )}

      {/* Flight Not Listed SlideSheet */}
      <SlideSheet
        isOpen={isFlightNotListedOpen}
        onClose={handleFormClose}
        title={
          t?.flightSelector?.flightNotListed?.title || "Flight Not Listed?"
        }
      >
        <FlightNotListedForm
          onSubmit={handleFlightNotListedSubmit}
          initialData={prefilledDetails}
        />
      </SlideSheet>
    </div>
  );
};
