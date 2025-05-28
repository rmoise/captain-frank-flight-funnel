import React, { useState, useCallback, useEffect, useRef } from "react";
import { FlightPreviewCard } from "./FlightPreviewCard";
import { AutocompleteInput } from "@/components/ui/input/AutocompleteInput";
import { DateSelector } from "@/components/ui/date/DateSelector";
import { Button } from "@/components/ui/button/Button";
import { useTranslation } from "@/hooks/useTranslation";
import {
  TrashIcon,
  PlusIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import type { Flight, SelectedFlight } from "@/store/types";
import type { BaseLocation, LocationData } from "@/types/shared/location";
import type { FlightLocation } from "@/types/shared/flight";
import { parseISO, format, isValid } from "date-fns";
import type { ChangeEvent } from "react";
import { SecondaryButton } from "@/components/ui/button/SecondaryButton";
import { formatAirportDropdownLabel } from "@/utils/locationUtils";

// Custom FlightSegment interface for this component
interface CustomFlightSegment {
  fromLocation?: FlightLocation;
  toLocation?: FlightLocation;
  date?: string;
  selectedFlight?: SelectedFlight;
}

interface MultiCityFlightProps {
  phase: number;
  segments: CustomFlightSegment[];
  onSegmentsChange: (segments: CustomFlightSegment[]) => void;
  addFlightSegment: (segment: CustomFlightSegment) => void;
  removeFlightSegment: (index: number) => void;
  onSearch: (params: {
    from: FlightLocation | null;
    to: FlightLocation | null;
    date: string | null;
    segmentIndex: number;
  }) => Promise<void>;
  searchResults: Flight[];
  isSearching?: boolean;
  showDateAndSearch?: boolean;
  showAddMoreFlights?: boolean;
  disabled?: boolean;
  currentPhase?: number;
  setIsFlightNotListedOpen: (isOpen: boolean) => void;
  searchAirports: (term: string) => Promise<FlightLocation[]>;
  locations?: FlightLocation[];
  setLocations?: React.Dispatch<React.SetStateAction<FlightLocation[]>>;
  setValidationState?: (isValid: boolean) => void;
}

// --- Add helper from DirectFlight ---
// Convert LocationData back to FlightLocation (from AutocompleteInput onChange)
const locationDataToFlightLocation = (
  data: LocationData | null,
  existingLocations: FlightLocation[] | undefined // Accept potentially undefined
): FlightLocation | null => {
  if (!data) return null;

  // Ensure existingLocations is an array before using find
  const validExistingLocations = Array.isArray(existingLocations)
    ? existingLocations
    : [];

  // First try to find the original FlightLocation based on the value (iata/code)
  const existingLocation = validExistingLocations.find(
    (loc) => loc.iata === data.value || loc.code === data.value
  );

  if (existingLocation) {
    return existingLocation;
  }

  // If not found, create a new FlightLocation from the LocationData
  console.warn(
    "[MultiCity] Creating new FlightLocation from LocationData because it wasn't found in shared list:",
    data
  );
  return {
    id: data.value, // Use value (IATA/code) as ID
    name: data.name || data.label, // Airport name
    code: data.value, // Use value as code
    city: data.city || data.description || "", // City name if available
    country: "", // No country in LocationData
    timezone: "", // No timezone in LocationData
    type: "airport", // Default to airport
    iata: data.value, // Use value as IATA
  };
};
// -----------------------------------

// +++ Add flightLocationToLocationData helper (from DirectFlight) +++
const flightLocationToLocationData = (
  location: FlightLocation | null | undefined
): LocationData | null => {
  if (!location) return null;
  const code = location.iata || location.code || "";
  return {
    value: code,
    label: location.name || code, // Use name as label for display
    description: location.city || "", // Use city as description
    city: location.city || "",
    name: location.name || "",
    dropdownLabel: formatAirportDropdownLabel({
      name: location.name,
      city: location.city,
      country: location.country,
      iata: location.iata,
      code: location.code,
    }),
  };
};
// +++ End flightLocationToLocationData helper +++

export const MultiCityFlight: React.FC<MultiCityFlightProps> = ({
  phase,
  segments,
  onSegmentsChange,
  addFlightSegment,
  removeFlightSegment,
  onSearch,
  searchResults,
  isSearching = false,
  showDateAndSearch = true,
  showAddMoreFlights = true,
  disabled = false,
  currentPhase,
  setIsFlightNotListedOpen,
  searchAirports,
  locations,
  setLocations,
  setValidationState,
}) => {
  // Simple approach: track immediate date changes for search button reactivity
  // Removed pendingDateUpdates - using pure Zustand state only

  // Removed cleanup logic - using pure Zustand state only

  // Debug effect to track segments changes
  React.useEffect(() => {
    console.log("[MultiCityFlight] Segments prop changed:", {
      segmentsLength: segments.length,
      segmentsWithDates: segments.map((seg, index) => ({
        index,
        date: seg.date,
        dateType: typeof seg.date,
        dateRepresentation: JSON.stringify(seg.date),
        hasDate: !!seg.date,
        isValidDateFormat: seg.date
          ? /^\d{4}-\d{2}-\d{2}$/.test(seg.date)
          : false,
        hasSelectedFlight: !!seg.selectedFlight,
        flightId: seg.selectedFlight?.id,
        flightNumber: seg.selectedFlight?.flightNumber,
      })),
      timestamp: new Date().toISOString(),
    });
  }, [segments]);
  console.log("[MultiCity] Received segments prop length:", segments.length);
  const { t } = useTranslation();

  const convertToFlightLocation = (location: BaseLocation): FlightLocation => ({
    ...location,
    id: location.id,
    name: location.name,
    iata: location.code, // Use code instead of iata which doesn't exist on BaseLocation
    city: location.city,
    country: location.country,
  });

  const convertToSelectedFlight = (flight: Flight): SelectedFlight => ({
    id: flight.id || Date.now().toString(),
    flightNumber: flight.flightNumber || "",
    airline: flight.airline || "",
    departureTime: flight.departureTime || "",
    arrivalTime: flight.arrivalTime || "",
    duration: flight.duration || "",
    from: flight.from || ({} as FlightLocation),
    to: flight.to || ({} as FlightLocation),
    price: flight.price || { amount: 0, currency: "EUR" },
    stops: flight.stops || 0,
    status: flight.status || "scheduled",
    type: flight.type || "direct",
  });

  const updateSegment = useCallback(
    (index: number, data: Partial<CustomFlightSegment>) => {
      const updatedSegments = segments.map((segment, i) =>
        i === index ? { ...segment, ...data } : segment
      );
      onSegmentsChange(updatedSegments);
    },
    [segments, onSegmentsChange]
  );

  const handleSearch = async (index: number) => {
    const segment = segments[index];
    try {
      await onSearch({
        from: segment.fromLocation || null,
        to: segment.toLocation || null,
        date: segment.date || null,
        segmentIndex: index,
      });
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleDateChange = useCallback(
    (index: number, date: string | null) => {
      const updatedSegments = [...segments];
      updatedSegments[index] = {
        ...updatedSegments[index],
        date: date ? format(parseISO(date), "yyyy-MM-dd") : undefined,
      };
      onSegmentsChange(updatedSegments);
    },
    [segments, onSegmentsChange]
  );

  const handleRemoveSegment = (index: number) => {
    const updatedSegments = segments.filter((_, i) => i !== index);
    onSegmentsChange(updatedSegments);
  };

  const handleAddSegment = () => {
    const lastSegment = segments[segments.length - 1];
    const newSegment: CustomFlightSegment = {
      fromLocation: lastSegment?.toLocation,
      toLocation: undefined,
      date: undefined,
      selectedFlight: undefined,
    };
    addFlightSegment(newSegment);
  };

  const handleEdit = (index: number) => {
    handleSearch(index);
  };

  const handleRemove = (index: number) => {
    const updatedSegments = [...segments];
    updatedSegments[index] = {
      ...updatedSegments[index],
      selectedFlight: undefined,
    };
    onSegmentsChange(updatedSegments);
  };

  // Create LocationData from FlightLocation
  const createLocationData = (location: FlightLocation): LocationData => ({
    value: location.iata || "", // Keep IATA as the internal value
    label: location.name || "", // Use name for display, fallback to empty string
    description: location.city || "",
    city: location.city || "",
    name: location.name || "", // Keep name property
    dropdownLabel: formatAirportDropdownLabel({
      name: location.name,
      city: location.city,
      country: location.country,
      iata: location.iata,
      code: location.code,
    }),
  });

  // --- Validation Helper ---
  const checkMultiCityValidity = useCallback(
    (currentSegments: CustomFlightSegment[]) => {
      if (!setValidationState) {
        // Silently return - this is expected during React's double-invoke in dev mode
        return;
      }

      if (currentPhase === undefined) {
        // Silently continue with default phase behavior
        // Continue with validation using a default phase
      }

      let allSegmentsValid = false;
      if (currentSegments.length > 0) {
        allSegmentsValid = currentSegments.every((segment) => {
          const hasOrigin = !!segment.fromLocation?.code;
          const hasDestination = !!segment.toLocation?.code;
          // Use same strict date validation as search button
          const hasDepartureTime = !!(
            segment.date &&
            typeof segment.date === "string" &&
            segment.date.trim() !== "" &&
            segment.date !== "undefined" &&
            segment.date !== "null" &&
            /^\d{4}-\d{2}-\d{2}$/.test(segment.date)
          );
          const isPhase1 = currentPhase === 1 || currentPhase === undefined; // Default to phase 1 behavior if undefined
          // Use CustomFlightSegment fields for validation
          return isPhase1
            ? hasOrigin && hasDestination
            : hasOrigin && hasDestination && hasDepartureTime;
        });
      } else {
        allSegmentsValid = false; // No segments means invalid
      }

      console.log(
        `[MultiCity] Instant validation check: Phase=${currentPhase}, Segments=${currentSegments.length}, Valid=${allSegmentsValid}`
      );
      setValidationState(allSegmentsValid);
    },
    [currentPhase, setValidationState]
  );
  // --- End Validation Helper ---

  // --- Add Effect to re-validate when segments change ---
  useEffect(() => {
    console.log("[MultiCity] Segments prop changed, re-validating.", segments);
    checkMultiCityValidity(segments);
  }, [segments, checkMultiCityValidity]); // Re-run validation if segments list or validation function changes
  // --- End Effect ---

  return (
    <div className="space-y-4">
      {segments.map((segment, index) => (
        <div
          key={`segment-${index}-${segment.selectedFlight?.id || "no-flight"}`}
        >
          {/* Add a separator line for all but first segment */}
          {index > 0 && <div className="border-t border-gray-200 my-2"></div>}

          {/* Segment number indicator */}
          <div className="flex items-center mb-2">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700 text-xs font-medium mr-2">
              {index + 1}
            </div>
            <span className="text-sm text-gray-600 font-medium">
              Flight {index + 1}
            </span>
          </div>

          <div className={`flex items-center gap-4`}>
            <div className="flex-grow space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="min-w-0">
                  <AutocompleteInput
                    value={
                      segment.fromLocation
                        ? createLocationData(segment.fromLocation)
                        : null
                    }
                    onChange={(locationData) => {
                      let updatedSegments = [...segments];
                      if (locationData) {
                        // Location selected - Find/create FlightLocation
                        const flightLocation = locationDataToFlightLocation(
                          locationData,
                          locations // Pass the shared locations array
                        );
                        if (!flightLocation) return; // If creation failed, do nothing

                        updatedSegments[index] = {
                          ...updatedSegments[index],
                          fromLocation: flightLocation,
                          selectedFlight: undefined, // Keep clearing selected flight
                        };
                      } else {
                        // Location cleared - Set fromLocation to undefined
                        console.log(
                          "[MultiCity] Clearing From Location for segment:",
                          index
                        );
                        updatedSegments[index] = {
                          ...updatedSegments[index],
                          fromLocation: undefined, // Set to undefined
                          selectedFlight: undefined, // Also clear flight
                        };
                      }
                      onSegmentsChange(updatedSegments); // Update state in both cases
                      checkMultiCityValidity(updatedSegments); // << Run validation
                    }}
                    onSearch={async (term) => {
                      if (term.length < 3) return [];
                      const fetchedLocations = await searchAirports(term);

                      // --- UPDATE THE SHARED LOCATIONS LIST (if setter exists) ---
                      if (setLocations) {
                        setLocations((prevLocations = []) => {
                          // Default prevLocations to []
                          const existingIds = new Set(
                            prevLocations.map((loc) => loc.id)
                          );
                          const newUniqueLocations = fetchedLocations.filter(
                            (loc) => loc.id && !existingIds.has(loc.id)
                          );
                          if (newUniqueLocations.length > 0) {
                            console.log(
                              "[MultiCityFlight From] Updating shared locations:",
                              {
                                prevCount: prevLocations.length,
                                newFound: fetchedLocations.length,
                                newUniqueAdded: newUniqueLocations.length,
                                newTotal:
                                  prevLocations.length +
                                  newUniqueLocations.length,
                              }
                            );
                            return [...prevLocations, ...newUniqueLocations];
                          }
                          return prevLocations; // Return previous state if no new unique locations
                        });
                      }
                      // ------------------------------------------

                      // --- Use the helper function for conversion ---
                      return fetchedLocations
                        .map(flightLocationToLocationData) // Use the helper
                        .filter((loc) => loc !== null) as LocationData[];
                      // ---------------------------------------------
                    }}
                    label={t("flightSelector.labels.from", "From")}
                    leftIcon="departure"
                    disabled={disabled}
                  />
                </div>
                <div className="min-w-0">
                  <AutocompleteInput
                    value={
                      segment.toLocation
                        ? createLocationData(segment.toLocation)
                        : null
                    }
                    onChange={(locationData) => {
                      let updatedSegments = [...segments];
                      let finalSegmentsStateForValidation = updatedSegments; // Keep track of final state
                      let nextSegmentFromLocation: FlightLocation | undefined =
                        undefined;

                      if (locationData) {
                        // Location selected - Find/create FlightLocation
                        const flightLocation = locationDataToFlightLocation(
                          locationData,
                          locations // Pass the shared locations array
                        );
                        if (!flightLocation) return; // If creation failed, do nothing

                        updatedSegments[index] = {
                          ...updatedSegments[index],
                          toLocation: flightLocation,
                          selectedFlight: undefined, // Keep clearing selected flight
                        };
                        nextSegmentFromLocation = flightLocation; // Use selected location for next segment
                      } else {
                        // Location cleared - Set toLocation to undefined
                        console.log(
                          "[MultiCity] Clearing To Location for segment:",
                          index
                        );
                        updatedSegments[index] = {
                          ...updatedSegments[index],
                          toLocation: undefined, // Set to undefined
                          selectedFlight: undefined, // Also clear flight
                        };
                        nextSegmentFromLocation = undefined; // Clear next segment's from too
                      }
                      onSegmentsChange(updatedSegments); // Update current segment
                      finalSegmentsStateForValidation = updatedSegments; // Update potentially final state

                      // If this is not the last segment, update the next segment's 'from'
                      if (index < segments.length - 1) {
                        let finalSegments = [...updatedSegments]; // Use current state
                        finalSegments[index + 1] = {
                          ...finalSegments[index + 1],
                          fromLocation: nextSegmentFromLocation,
                          selectedFlight: undefined,
                        };
                        onSegmentsChange(finalSegments); // Update state including next segment
                        finalSegmentsStateForValidation = finalSegments; // This is the final state now
                      }
                      checkMultiCityValidity(finalSegmentsStateForValidation); // << Run validation on final state
                    }}
                    onSearch={async (term) => {
                      if (term.length < 3) return [];
                      const fetchedLocations = await searchAirports(term);

                      // --- UPDATE THE SHARED LOCATIONS LIST (if setter exists) ---
                      if (setLocations) {
                        setLocations((prevLocations = []) => {
                          // Default prevLocations to []
                          const existingIds = new Set(
                            prevLocations.map((loc) => loc.id)
                          );
                          const newUniqueLocations = fetchedLocations.filter(
                            (loc) => loc.id && !existingIds.has(loc.id)
                          );
                          if (newUniqueLocations.length > 0) {
                            console.log(
                              "[MultiCityFlight To] Updating shared locations:",
                              {
                                prevCount: prevLocations.length,
                                newFound: fetchedLocations.length,
                                newUniqueAdded: newUniqueLocations.length,
                                newTotal:
                                  prevLocations.length +
                                  newUniqueLocations.length,
                              }
                            );
                            return [...prevLocations, ...newUniqueLocations];
                          }
                          return prevLocations; // Return previous state if no new unique locations
                        });
                      }
                      // ------------------------------------------

                      // --- Use the helper function for conversion ---
                      return fetchedLocations
                        .map(flightLocationToLocationData) // Use the helper
                        .filter((loc) => loc !== null) as LocationData[];
                      // ---------------------------------------------
                    }}
                    label={t("flightSelector.labels.to", "To")}
                    leftIcon="arrival"
                    disabled={disabled}
                  />
                </div>
              </div>

              {/* Conditionally render DateSelector and Search Button based on phase */}
              {phase !== 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateSelector
                    selected={segment.date ? parseISO(segment.date) : null}
                    onSelect={(newDate) => {
                      console.log(
                        `[MultiCityFlight] Date changed for segment ${index}:`,
                        {
                          newDate,
                          previousDate: segment.date,
                          willSetDateTo: newDate
                            ? format(newDate, "yyyy-MM-dd")
                            : undefined,
                        }
                      );

                      const updatedSegments = [...segments];
                      const newDateValue = newDate
                        ? format(newDate, "yyyy-MM-dd")
                        : undefined;

                      updatedSegments[index] = {
                        ...updatedSegments[index],
                        date: newDateValue,
                      };

                      console.log(
                        `[MultiCityFlight] Updated segment after date change:`,
                        {
                          segmentIndex: index,
                          hasFromLocation:
                            !!updatedSegments[index].fromLocation,
                          hasToLocation: !!updatedSegments[index].toLocation,
                          hasDate: !!updatedSegments[index].date,
                          dateValue: updatedSegments[index].date,
                          updatedDateType: typeof updatedSegments[index].date,
                        }
                      );

                      // 🎯 STORE-FIRST CLEARING (2025 Best Practice)
                      // Trust Zustand store completely - no localStorage flags needed
                      if (!newDate && segment.date) {
                        console.log(
                          `[MultiCityFlight] Store-First date clearing for segment ${index}`,
                          {
                            segmentIndex: index,
                            previousDate: segment.date,
                            phase: currentPhase || phase,
                            timestamp: Date.now(),
                          }
                        );
                      }

                      console.log(
                        `[MultiCityFlight] Before onSegmentsChange - current segments prop:`,
                        {
                          segmentIndex: index,
                          currentSegmentDate: segment.date,
                          currentSegmentDateType: typeof segment.date,
                          newSegmentDate: updatedSegments[index].date,
                          newSegmentDateType:
                            typeof updatedSegments[index].date,
                        }
                      );

                      console.log(
                        `[MultiCityFlight] Calling onSegmentsChange with:`,
                        updatedSegments
                      );
                      onSegmentsChange(updatedSegments);

                      // Removed automatic search trigger on date selection
                      // Users should explicitly click the search button
                    }}
                    disabled={disabled}
                  />
                  <button
                    onClick={() => handleSearch(index)}
                    disabled={(() => {
                      // FIXED: Proper Zustand state validation with better null/undefined handling
                      const hasFromLocation = !!segment.fromLocation;
                      const hasToLocation = !!segment.toLocation;

                      // CRITICAL FIX: Handle all falsy values for date validation
                      const hasValidDate = !!(
                        (
                          segment.date &&
                          typeof segment.date === "string" &&
                          segment.date.trim() !== "" &&
                          segment.date !== "null" &&
                          segment.date !== "undefined" &&
                          // Support multiple date/datetime formats
                          (/^\d{4}-\d{2}-\d{2}$/.test(segment.date) || // YYYY-MM-DD
                            /^\d{2}\.\d{2}\.\d{4}$/.test(segment.date) || // DD.MM.YYYY
                            /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
                              segment.date
                            ) || // YYYY-MM-DD HH:MM:SS
                            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(
                              segment.date
                            ))
                        ) // ISO datetime format
                      );

                      const isDisabled =
                        !hasFromLocation ||
                        !hasToLocation ||
                        !hasValidDate ||
                        disabled;

                      console.log(
                        `[MultiCityFlight] Simple search button validation ${index}:`,
                        {
                          hasFromLocation,
                          hasToLocation,
                          hasValidDate,
                          disabled,
                          isDisabled,
                          date: segment.date,
                          dateType: typeof segment.date,
                          dateIsNull: segment.date === null,
                          dateIsUndefined: segment.date === undefined,
                          dateStringCheck:
                            segment.date && typeof segment.date === "string",
                          dateNotEmpty:
                            segment.date && segment.date.trim() !== "",
                        }
                      );

                      return isDisabled;
                    })()}
                    className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
                  >
                    {t("flightSelector.labels.searchFlights", "Search Flights")}
                  </button>
                </div>
              )}

              {(() => {
                const shouldShowPreview =
                  segment.selectedFlight &&
                  segment.selectedFlight.id &&
                  segment.fromLocation &&
                  segment.toLocation;

                console.log(
                  `[MultiCityFlight] Segment ${index} preview check:`,
                  {
                    hasSelectedFlight: !!segment.selectedFlight,
                    hasFlightId: !!segment.selectedFlight?.id,
                    hasFromLocation: !!segment.fromLocation,
                    hasToLocation: !!segment.toLocation,
                    shouldShowPreview,
                    selectedFlightInfo: segment.selectedFlight
                      ? {
                          id: segment.selectedFlight.id,
                          flightNumber: segment.selectedFlight.flightNumber,
                        }
                      : null,
                  }
                );
                return shouldShowPreview;
              })() && (
                <div className="mt-4">
                  <FlightPreviewCard
                    key={`flight-preview-${index}-${
                      segment.selectedFlight?.id || "no-flight"
                    }-${segment.selectedFlight?.flightNumber || "no-number"}`}
                    flight={{
                      id: `${segment.selectedFlight!.id}-${index}`,
                      flightNumber:
                        segment.selectedFlight!.flightNumber || "UNKNOWN",
                      airline: segment.selectedFlight!.airline,
                      from: segment.fromLocation!,
                      to: segment.toLocation!,
                      departureTime: segment.selectedFlight!.departureTime,
                      arrivalTime: segment.selectedFlight!.arrivalTime,
                      price: segment.selectedFlight!.price,
                      stops: segment.selectedFlight!.stops,
                      duration: segment.selectedFlight!.duration,
                      status: segment.selectedFlight!.status,
                      type: segment.selectedFlight!.type,
                    }}
                    index={index}
                    onEdit={() => handleSearch(index)}
                    onDelete={() => {
                      console.log(
                        `[MultiCityFlight] Deleting flight for segment ${index}`
                      );
                      console.log(
                        `[MultiCityFlight] Before deletion - segment.selectedFlight:`,
                        segment.selectedFlight
                      );

                      const updatedSegments = [...segments];
                      // Create a completely new segment object to ensure React detects the change
                      updatedSegments[index] = {
                        fromLocation: updatedSegments[index].fromLocation,
                        toLocation: updatedSegments[index].toLocation,
                        date: updatedSegments[index].date,
                        selectedFlight: undefined,
                      };
                      console.log(
                        `[MultiCityFlight] Updated segments after deletion:`,
                        updatedSegments.map((seg, i) => ({
                          index: i,
                          hasSelectedFlight: !!seg.selectedFlight,
                        }))
                      );

                      onSegmentsChange(updatedSegments);

                      // Trigger validation update after flight deletion
                      if (setValidationState) {
                        const isValid = updatedSegments.every((segment) => {
                          const hasOrigin = !!segment.fromLocation?.code;
                          const hasDestination = !!segment.toLocation?.code;
                          const hasDepartureTime = !!segment.date;
                          const isPhase1 = currentPhase === 1;
                          return isPhase1
                            ? hasOrigin && hasDestination
                            : hasOrigin && hasDestination && hasDepartureTime;
                        });
                        setValidationState(isValid);
                      }
                    }}
                    isMultiCity={true}
                    showConnectionInfo={index > 0}
                  />
                </div>
              )}
            </div>

            {/* Show delete button only for segments after the first two (index > 1) */}
            {index > 1 && (
              <button
                onClick={() => removeFlightSegment(index)}
                className="p-2 text-gray-400 hover:text-red-600 shrink-0"
                aria-label={`Remove flight segment ${index + 1}`}
                title={`Remove flight segment ${index + 1}`}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}

      {segments.length < 4 && (
        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              const newSegment: CustomFlightSegment = {
                fromLocation: undefined,
                toLocation: undefined,
                date: undefined,
                selectedFlight: undefined,
              };
              addFlightSegment(newSegment);
            }}
            className="w-full min-h-[3rem] border-2 border-dashed border-gray-300 rounded-lg hover:border-[#F54538] hover:text-[#F54538] transition-colors flex items-center justify-center px-4 py-2 text-sm sm:text-base"
          >
            <svg
              className="w-5 h-5 mr-2 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="whitespace-normal text-center">
              {t("common.addFlight", "Add another flight")}
            </span>
          </button>
        </div>
      )}

      {/* Add "Flight not listed?" button at the bottom */}
      {phase !== 1 && currentPhase !== 1 && setIsFlightNotListedOpen && (
        <button
          onClick={() => {
            // Open the Flight Not Listed modal
            setIsFlightNotListedOpen(true);
          }}
          className="mt-3 w-full py-3 px-4 flex items-center justify-center gap-2 text-[#F54538] bg-white border border-[#F54538] rounded-xl hover:bg-[#FFF5F5] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] transition-colors"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
          <span className="font-medium">
            {t(
              "flightSelector.flightNotListed.button",
              "Flug nicht aufgeführt?"
            )}
          </span>
        </button>
      )}
    </div>
  );
};

export default MultiCityFlight;
