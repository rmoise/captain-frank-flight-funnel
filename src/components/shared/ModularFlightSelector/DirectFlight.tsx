import React, { useState, useCallback, useEffect, useMemo } from "react";
import { FlightPreviewCard } from "./FlightPreviewCard";
import { AutocompleteInput } from "@/components/ui/input/AutocompleteInput";
import { DateSelector } from "@/components/ui/date/DateSelector";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  Flight,
  FlightSegment,
  FlightLocation,
  Airline,
} from "@/types/shared/flight";
import { parseISO, format } from "date-fns";
import type { DirectFlightProps } from "@/types/shared/components";
import type { Option } from "@/types/shared/input";
import type {
  LocationData,
  AutocompleteLocationOption,
} from "@/types/shared/location";
import { SecondaryButton } from "@/components/ui/button/SecondaryButton";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { usePhase4 } from "@/store";
import { formatAirportDropdownLabel } from "@/utils/locationUtils";

// --- Helper Functions for Type Conversion ---

// Convert FlightLocation to LocationData (for AutocompleteInput value)
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

// Convert LocationData back to FlightLocation (from AutocompleteInput onChange)
const locationDataToFlightLocation = (
  data: LocationData | null,
  existingLocations: FlightLocation[] // Need the list to find the full object
): FlightLocation | null => {
  if (!data) return null;

  console.log("[DirectFlight] locationDataToFlightLocation called with:", {
    data,
    existingLocationsCount: existingLocations.length,
  });

  // First try to find the original FlightLocation based on the value (iata/code)
  const existingLocation = existingLocations.find(
    (loc) => loc.iata === data.value || loc.code === data.value
  );

  if (existingLocation) {
    console.log(
      "[DirectFlight] Found existing location with full data:",
      existingLocation
    );
    return existingLocation;
  }

  // Log all existing locations for debugging
  console.log(
    "[DirectFlight] Available existing locations:",
    existingLocations.map((loc) => ({
      id: loc.id,
      code: loc.code,
      iata: loc.iata,
      name: loc.name,
    }))
  );

  // If not found in existing locations, check if the LocationData has extended properties
  // The search results should include country data in the dropdownLabel or other fields
  const createLocationFromData = (): FlightLocation => {
    console.log(
      "[DirectFlight] Creating new FlightLocation from LocationData:",
      data
    );

    // Try to extract country from dropdownLabel if available
    // Format should be "Name, City, Country (CODE)"
    let extractedCountry = "";
    if (data.dropdownLabel) {
      const match = data.dropdownLabel.match(/,\s*([^,]+)\s*\([A-Z]{3}\)$/);
      if (match) {
        extractedCountry = match[1];
      }
    }

    return {
      id: data.value, // Use value (IATA/code) as ID
      name: data.name || data.label || "", // Airport name (try both name and label)
      code: data.value, // Use value as code
      city: data.city || data.description || "", // City name from search
      country: extractedCountry, // Try to extract from dropdownLabel
      timezone: "", // No timezone in LocationData
      type: "airport", // Default to airport
      iata: data.value, // Use value as IATA
    };
  };

  const newLocation = createLocationFromData();
  console.log("[DirectFlight] Created new FlightLocation:", newLocation);

  return newLocation;
};

// ----------------------------------------

// Add a helper function to create an empty placeholder location
const createEmptyLocation = (idSuffix: string): FlightLocation => ({
  id: `empty-${idSuffix}-${Date.now()}`, // Unique ID
  name: "",
  code: "",
  city: "",
  country: "",
  timezone: "",
  type: "airport",
});

// Helper functions
const createPlaceholderLocation = (idSuffix: string): FlightLocation => ({
  id: `placeholder-${idSuffix}`,
  code: "",
  name: "",
  city: "",
  country: "",
  iata: "",
  type: "airport",
  timezone: "",
});

const createPlaceholderAirline = (): Airline => ({
  name: "",
  code: "", // use code instead of iata
});

export const DirectFlight: React.FC<DirectFlightProps> = ({
  segment,
  onSegmentChange,
  onSearch,
  searchResults,
  isSearching = false,
  disabled = false,
  setIsFlightNotListedOpen,
  currentPhase,
  lang = "de",
  showDateAndSearch = true,
  locations = [],
  setLocations,
  errors,
}) => {
  const { t } = useTranslation();
  const [searchError, setSearchError] = useState<string | null>(null);
  const [fromOptions, setFromOptions] = useState<Option[]>([]);
  const [toOptions, setToOptions] = useState<Option[]>([]);
  const [isLoadingFrom, setIsLoadingFrom] = useState(false);
  const [isLoadingTo, setIsLoadingTo] = useState(false);
  const phase4Store = usePhase4();

  const handleFlightSelect = (flight: Flight) => {
    const selectedFlight: Partial<FlightSegment> = {
      id: flight.id,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      duration: flight.duration,
      stops: flight.stops || 0,
      // Removed origin and destination to prevent overwriting location data
    };

    onSegmentChange({
      ...segment,
      ...selectedFlight,
    });
    setSearchError(null);
  };

  const handleDateChange = (date: Date | null) => {
    console.log("[DirectFlight] Date changed:", date);

    // For Phase 4, use the new date persistence method
    if (currentPhase === 4) {
      console.log("[DirectFlight] Using Phase 4 date persistence");
      phase4Store.setDirectFlightDate(date);
    }

    // Update segment - handle both standard and Phase 4 formats
    const dateString = date ? date.toISOString() : "";

    if (currentPhase === 4 && "date" in segment) {
      // For Phase 4, update both departureTime and date property
      onSegmentChange({
        ...segment,
        departureTime: dateString,
        date: dateString,
      } as any);
    } else {
      // For standard phases, just update departureTime
      onSegmentChange({
        ...segment,
        departureTime: dateString,
      });
    }
  };

  const locationToOption = (
    location: FlightLocation | null | undefined
  ): Option | undefined => {
    if (!location) return undefined;

    const airportCode = location.iata || location.code || "";
    const displayName = location.name || "";
    const cityName = location.city || "";
    const countryName = location.country || "";

    // Format description based on language
    let description = "";
    if (cityName) {
      if (lang === "de") {
        // German format
        description = `${cityName}${
          countryName ? `, ${countryName}` : ""
        } (${airportCode})`;
      } else {
        // Default English format
        description = `${cityName}${
          countryName ? `, ${countryName}` : ""
        } (${airportCode})`;
      }
    } else {
      description = airportCode;
    }

    return {
      value: airportCode,
      label: displayName,
      description: description,
    };
  };

  const handleLocationSearch = async (
    term: string
  ): Promise<LocationData[]> => {
    if (term.length < 3) return [];
    try {
      console.log(`[DirectFlight] Searching for airports with term: ${term}`);

      // Use the same Netlify function approach as FlightSegments.tsx for consistency
      const response = await fetch(
        `/.netlify/functions/searchAirports?term=${encodeURIComponent(
          term
        )}&lang=${lang}`
      );

      if (!response.ok) {
        console.error("[DirectFlight] Airport search failed:", response.status);
        return [];
      }

      const airports = await response.json();
      console.log(
        `[DirectFlight] Airport search results for lang=${lang}:`,
        airports
      );

      if (!Array.isArray(airports) || airports.length === 0) {
        console.log("[DirectFlight] No airports found for term:", term);
        return [];
      }

      // Convert API response format to FlightLocation - handle actual API structure
      // API only provides: name, iata_code, lat, lng
      const flightLocations: FlightLocation[] = airports.map(
        (airport: any) => ({
          id: airport.iata_code || airport.code || airport.id || "",
          name: airport.name || airport.airport || "",
          code: airport.iata_code || airport.code || "",
          city: "", // API doesn't provide city - set to empty
          country: "", // API doesn't provide country - set to empty
          iata: airport.iata_code || airport.code || "",
          timezone: "", // API doesn't provide timezone
          type: "airport" as const,
        })
      );

      console.log(
        `[DirectFlight] Converted flight locations for lang=${lang}:`,
        flightLocations
      );

      // --- UPDATE THE SHARED LOCATIONS LIST ---
      // Use functional update to merge new locations with existing ones
      // This prevents duplicates if the same airport is searched multiple times
      if (setLocations) {
        setLocations((prevLocations) => {
          const existingIds = new Set(prevLocations.map((loc) => loc.id));
          const newUniqueLocations = flightLocations.filter(
            (loc) => loc.id && !existingIds.has(loc.id)
          );
          // Log the update
          console.log("[DirectFlight] Updating shared locations:", {
            prevCount: prevLocations.length,
            newFound: flightLocations.length,
            newUniqueAdded: newUniqueLocations.length,
            newTotal: prevLocations.length + newUniqueLocations.length,
          });
          return [...prevLocations, ...newUniqueLocations];
        });
      }
      // ------------------------------------------

      // Convert FlightLocation[] to LocationData[] for AutocompleteInput
      return flightLocations
        .map(flightLocationToLocationData)
        .filter((loc) => loc !== null) as LocationData[];
    } catch (error) {
      console.error("[DirectFlight] Error searching locations:", error);
      return [];
    }
  };

  // Handle FROM location selection
  const handleFromLocationSelect = useCallback(
    (locationData: LocationData | null) => {
      console.log(
        "[DirectFlight] handleFromLocationSelect called with data:",
        locationData
      );

      // If null data, clear the selection
      if (!locationData) {
        console.log("[DirectFlight] Clearing 'From' location");
        onSegmentChange({
          ...segment,
          origin: createEmptyLocation("origin"),
        });
        return;
      }

      // Convert to FlightLocation format
      const location = locationDataToFlightLocation(locationData, locations);
      console.log(
        "[DirectFlight] locationDataToFlightLocation result (From):",
        location
      );

      if (!location) {
        console.error(
          "[DirectFlight] Failed to create FlightLocation for selected 'From' data:",
          locationData
        );
        return;
      }

      // Set location in origin field of the segment
      const updatedSegment: FlightSegment = {
        ...segment,
        origin: location,
      };

      // Call the onSegmentChange callback to update the store
      onSegmentChange(updatedSegment);
      console.log(
        "[DirectFlight] From location selected and onSegmentChange called:",
        updatedSegment
      );

      // Log existing destination for debugging
      console.log(
        "[DirectFlight] Has destination location:",
        segment?.destination?.code || "no"
      );
    },
    [onSegmentChange, locations, segment]
  );

  // Handle TO location selection
  const handleToLocationSelect = useCallback(
    (locationData: LocationData | null) => {
      console.log(
        "[DirectFlight] handleToLocationSelect called with data:",
        locationData
      );

      // If null data, clear the selection
      if (!locationData) {
        console.log("[DirectFlight] Clearing 'To' location");
        onSegmentChange({
          ...segment,
          destination: createEmptyLocation("destination"),
        });
        return;
      }

      // Convert to FlightLocation format
      const location = locationDataToFlightLocation(locationData, locations);
      console.log(
        "[DirectFlight] locationDataToFlightLocation result (To):",
        location
      );

      if (!location) {
        console.error(
          "[DirectFlight] Failed to create FlightLocation for selected 'To' data:",
          locationData
        );
        return;
      }

      // Set location in destination field of the segment
      const updatedSegment: FlightSegment = {
        ...segment,
        destination: location,
      };

      // Call the onSegmentChange callback to update the store
      onSegmentChange(updatedSegment);
      console.log(
        "[DirectFlight] To location selected and onSegmentChange called:",
        updatedSegment
      );

      // Log existing origin for debugging
      console.log(
        "[DirectFlight] Has from location:",
        segment?.origin?.code || "no"
      );
    },
    [onSegmentChange, locations, segment]
  );

  const handleSearchClick = () => {
    // Use the same helper functions that work correctly for Phase 4
    const originCode = getOriginCode();
    const destinationCode = getDestinationCode();
    const dateValue =
      segment.departureTime ||
      ("date" in segment ? (segment as any).date : null);

    const hasValidOrigin = !!(originCode && originCode.trim() !== "");
    const hasValidDestination = !!(
      destinationCode && destinationCode.trim() !== ""
    );
    const hasValidDate = !!(dateValue && dateValue.trim() !== "");

    // Log validation status
    console.log("[DirectFlight] Search validation:", {
      hasValidOrigin,
      hasValidDestination,
      hasValidDate,
      originCode,
      destinationCode,
      dateValue,
    });

    if (!hasValidOrigin || !hasValidDestination || !hasValidDate) {
      setSearchError(t("flightSelector.errors.requiredFields"));
      return;
    }

    // Clear any search errors
    setSearchError(null);

    // Create location objects for the search
    const originLocation =
      ("fromLocation" in segment && (segment as any).fromLocation) ||
      segment.origin;
    const destinationLocation =
      ("toLocation" in segment && (segment as any).toLocation) ||
      segment.destination;

    // Pass the required parameters to onSearch which will handle the API call
    // and open the bottom sheet in the parent component
    onSearch({
      from: originLocation,
      to: destinationLocation,
      date: dateValue,
    });
  };

  // CRITICAL FIX: Handle both Phase 4 and standard segment formats for validation
  // Phase 4 segments use fromLocation/toLocation, standard segments use origin/destination
  const getOriginCode = () => {
    console.log("[DirectFlight] getOriginCode - segment analysis:", {
      hasFromLocation: "fromLocation" in segment,
      fromLocation:
        "fromLocation" in segment ? (segment as any).fromLocation : null,
      hasOrigin: !!segment.origin,
      origin: segment.origin,
      segmentKeys: Object.keys(segment),
    });

    // Check for Phase 4 format first
    if ("fromLocation" in segment && (segment as any).fromLocation) {
      const fromLoc = (segment as any).fromLocation;
      // Try different possible code properties
      const code = fromLoc.code || fromLoc.iata || fromLoc.value;
      console.log("[DirectFlight] getOriginCode - fromLocation found:", {
        fromLocation: fromLoc,
        extractedCode: code,
      });
      return code;
    }
    // Fall back to standard format
    const stdCode = segment.origin?.code;
    console.log(
      "[DirectFlight] getOriginCode - using standard format:",
      stdCode
    );
    return stdCode;
  };

  const getDestinationCode = () => {
    console.log("[DirectFlight] getDestinationCode - segment analysis:", {
      hasToLocation: "toLocation" in segment,
      toLocation: "toLocation" in segment ? (segment as any).toLocation : null,
      hasDestination: !!segment.destination,
      destination: segment.destination,
    });

    // Check for Phase 4 format first
    if ("toLocation" in segment && (segment as any).toLocation) {
      const toLoc = (segment as any).toLocation;
      // Try different possible code properties
      const code = toLoc.code || toLoc.iata || toLoc.value;
      console.log("[DirectFlight] getDestinationCode - toLocation found:", {
        toLocation: toLoc,
        extractedCode: code,
      });
      return code;
    }
    // Fall back to standard format
    const stdCode = segment.destination?.code;
    console.log(
      "[DirectFlight] getDestinationCode - using standard format:",
      stdCode
    );
    return stdCode;
  };

  // Check if all fields are filled to enable/disable the search button
  const allFieldsFilled = !!(
    getOriginCode() &&
    getDestinationCode() &&
    // CRITICAL FIX: Handle both segment.departureTime and Phase 4's date property
    (segment.departureTime || ("date" in segment && (segment as any).date)) &&
    (segment.departureTime?.trim() !== "" ||
      ("date" in segment && (segment as any).date?.trim() !== ""))
  );

  // Add additional logging to see validation status
  useEffect(() => {
    const originCode = getOriginCode();
    const destCode = getDestinationCode();
    const departureTime =
      segment.departureTime ||
      ("date" in segment ? (segment as any).date : null);

    // Log validation status whenever the segment changes
    console.log("[DirectFlight] Validation status:", {
      origin: originCode || "missing",
      destination: destCode || "missing",
      departureTime: departureTime ? "set" : "missing",
      departureTimeValue: departureTime,
      allFieldsFilled,
      segmentFormat: "fromLocation" in segment ? "Phase4" : "Standard",
      currentPhase,
      segmentType: segment.constructor?.name || typeof segment,
    });
  }, [segment, allFieldsFilled]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="min-w-0 overflow-hidden">
          <AutocompleteInput
            value={flightLocationToLocationData(
              // Handle both Phase 4 and standard formats
              ("fromLocation" in segment && (segment as any).fromLocation) ||
                segment.origin
            )}
            onSearch={handleLocationSearch}
            onChange={handleFromLocationSelect}
            leftIcon="departure"
            label={t("flightSelector.labels.from")}
          />
        </div>
        <div className="min-w-0 overflow-hidden">
          <AutocompleteInput
            value={flightLocationToLocationData(
              // Handle both Phase 4 and standard formats
              ("toLocation" in segment && (segment as any).toLocation) ||
                segment.destination
            )}
            onSearch={handleLocationSearch}
            onChange={handleToLocationSelect}
            leftIcon="arrival"
            label={t("flightSelector.labels.to")}
          />
        </div>
      </div>

      {showDateAndSearch && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DateSelector
              selected={
                // Handle both Phase 4 and standard formats
                (() => {
                  const dateValue =
                    segment.departureTime ||
                    ("date" in segment ? (segment as any).date : null);
                  return dateValue ? parseISO(dateValue) : null;
                })()
              }
              onSelect={handleDateChange}
              label={t("flightSelector.labels.departureDate")}
              disabled={disabled}
            />
            <button
              onClick={handleSearchClick}
              disabled={disabled || !allFieldsFilled}
              className="h-14 w-full text-white bg-[#F54538] rounded-xl hover:bg-[#F54538]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F54538] disabled:opacity-50 disabled:cursor-not-allowed font-sans font-medium text-base"
            >
              {t("flightSelector.labels.searchFlights")}
            </button>
          </div>

          {/* Debug log for Flight preview rendering conditions */}
          {console.log("[DirectFlight] Flight preview card render condition:", {
            // Phase 4 check - selectedFlight property
            hasSelectedFlightData: !!(
              "selectedFlight" in segment &&
              (segment as any).selectedFlight?.flightNumber &&
              (segment as any).selectedFlight?.departureTime &&
              (segment as any).selectedFlight?.arrivalTime
            ),
            // Standard phases check - flight data directly in segment
            hasDirectFlightData: !!(
              segment.flightNumber &&
              segment.departureTime &&
              segment.arrivalTime
            ),
            phase4LocationCheck: !!(
              currentPhase === 4 &&
              "fromLocation" in segment &&
              (segment as any).fromLocation?.code &&
              "toLocation" in segment &&
              (segment as any).toLocation?.code
            ),
            standardLocationCheck: !!(
              segment.origin?.code && segment.destination?.code
            ),
            currentPhase,
            segmentKeys: Object.keys(segment),
            flightNumber: segment.flightNumber,
            departureTime: segment.departureTime,
            arrivalTime: segment.arrivalTime,
            selectedFlight:
              "selectedFlight" in segment
                ? (segment as any).selectedFlight
                : null,
            fromLocation:
              "fromLocation" in segment ? (segment as any).fromLocation : null,
            toLocation:
              "toLocation" in segment ? (segment as any).toLocation : null,
            origin: segment.origin,
            destination: segment.destination,
          })}

          {/* Show the flight preview card if a flight is selected */}
          {
            // Phase 4: Check for selectedFlight property
            (("selectedFlight" in segment &&
              (segment as any).selectedFlight?.flightNumber &&
              (segment as any).selectedFlight?.departureTime &&
              (segment as any).selectedFlight?.arrivalTime) ||
              // Standard phases: Check for flight data directly in segment
              (segment.flightNumber &&
                segment.departureTime &&
                segment.arrivalTime)) &&
              // Check for valid locations - support both Phase 4 and standard formats
              ((currentPhase === 4 &&
                "fromLocation" in segment &&
                (segment as any).fromLocation?.code &&
                "toLocation" in segment &&
                (segment as any).toLocation?.code) ||
                (segment.origin?.code && segment.destination?.code)) && ( // Enhanced condition for Phase 4 with proper validation
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t("flightSelector.labels.flightData", "Flugdaten")}
                  </h3>
                  <FlightPreviewCard
                    flight={
                      // For Phase 4
                      "selectedFlight" in segment && segment.selectedFlight
                        ? (segment as any).selectedFlight
                        : // For standard phases
                          {
                            id: segment.id || "",
                            flightNumber: segment.flightNumber || "",
                            airline:
                              segment.airline || createPlaceholderAirline(),
                            departureTime: segment.departureTime || "",
                            arrivalTime: segment.arrivalTime || "",
                            duration: segment.duration || "",
                            from:
                              segment.origin ||
                              createPlaceholderLocation("from"),
                            to:
                              segment.destination ||
                              createPlaceholderLocation("to"),
                            stops: segment.stops || 0,
                            status: "scheduled",
                            price: { amount: 0, currency: "EUR" },
                            type: "direct",
                          }
                    }
                    index={0}
                    onEdit={() => handleSearchClick()}
                    onDelete={() => {
                      const updatedSegment = {
                        ...segment,
                        flightNumber: "",
                        airline: { name: "", code: "" },
                        arrivalTime: "",
                        duration: "",
                      } as FlightSegment & {
                        selectedFlight?: Flight | undefined;
                      };

                      if ("selectedFlight" in segment) {
                        updatedSegment.selectedFlight = undefined;
                      }

                      onSegmentChange(updatedSegment);

                      const hasOrigin = !!(
                        segment.origin && segment.origin.code
                      );
                      const hasDestination = !!(
                        segment.destination && segment.destination.code
                      );
                      const hasDate = !!segment.departureTime;
                      console.log(
                        "[DirectFlight] After deletion, validation:",
                        {
                          hasOrigin,
                          hasDestination,
                          hasDate,
                          isValid: hasOrigin && hasDestination && hasDate,
                        }
                      );

                      if (currentPhase === 4) {
                        // Clear the selected flight from phase4Store while preserving locations and date
                        // Use the correct property names for Phase 4
                        const phase4Segment = segment as any;
                        phase4Store.setDirectFlight({
                          fromLocation: phase4Segment.fromLocation || null,
                          toLocation: phase4Segment.toLocation || null,
                          date: phase4Segment.date || null,
                          selectedFlight: null,
                        });
                      }
                    }}
                  />
                </div>
              )
          }

          {currentPhase !== 1 && setIsFlightNotListedOpen && (
            <button
              onClick={() => {
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
      )}

      {searchError && <div className="text-red-500 text-sm">{searchError}</div>}
    </div>
  );
};
