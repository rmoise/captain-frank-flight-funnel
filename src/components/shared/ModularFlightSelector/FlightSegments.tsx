import React, {
  useCallback,
  useState,
  useEffect,
  useRef,
  Fragment,
  ReactElement,
  useMemo,
} from "react";
import { AutocompleteInput } from "@/components/ui/input/AutocompleteInput";
import { CustomDateInput } from "@/components/ui/date/DateSelector";
import { useTranslation } from "@/hooks/useTranslation";
import { FlightPreviewCard } from "./FlightPreviewCard";
import type { FlightSegmentsProps } from "@/types/shared/components";
import { TrashIcon } from "@heroicons/react/24/outline";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, parseISO, isValid } from "date-fns";
import "./FlightSegments.css";
import { FlightSearchBottomSheet } from "./FlightSearchBottomSheet";
import useStore from "@/store";
import type { Store } from "@/store/types";
import type {
  Flight,
  FlightSegment,
  FlightType,
  SelectedFlight,
  Airline,
  FlightStatus,
} from "@/store/types";
import type { BaseLocation } from "@/types/shared/location";
import type { FlightLocation } from "@/types/shared/flight";
import { DirectFlight } from "./DirectFlight";
import { MultiCityFlight } from "./MultiCityFlight";
import { processLocation } from "@/utils/locationUtils";
import type { DirectFlightProps } from "@/types/shared/components";
import { usePhase4 } from "@/store/hooks/usePhase4";
import type { Phase4FlightSegment } from "@/store/slices/phase4Slice";

// --- REINSTATE LOCAL CustomFlightSegment type definition ---
// Define CustomFlightSegment type (assuming it's needed for MultiCityFlight)
type CustomFlightSegment = {
  fromLocation?: FlightLocation | null;
  toLocation?: FlightLocation | null;
  date?: string | null;
  selectedFlight?: SelectedFlight | null; // Assuming SelectedFlight type exists
};
// -----------------------------------------------------------

// --- Helper functions moved to top ---
const createPlaceholderLocation = (idSuffix: string): FlightLocation => ({
  id: `placeholder-loc-${idSuffix}`,
  name: "",
  code: "",
  city: "",
  country: "",
  timezone: "",
  type: "airport",
});

const createPlaceholderAirline = (): Airline => ({
  name: "",
  code: "",
});

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

// Function to convert FlightSegment to CustomFlightSegment
const flightSegmentToCustom = (segment: FlightSegment): CustomFlightSegment => {
  // 🔍 DEBUG: Check what's actually in the store segment
  console.log("🔍 [flightSegmentToCustom] Store segment data:", {
    segmentId: segment.id,
    departureTime: segment.departureTime,
    departureTimeType: typeof segment.departureTime,
    departureTimeIsUndefined: segment.departureTime === undefined,
    departureTimeIsNull: segment.departureTime === null,
    departureTimeIsEmptyString: segment.departureTime === "",
    departureTimeTruthy: !!segment.departureTime,
    // Check if this is a Phase 4 segment with date property
    hasDateProperty: "date" in segment,
    dateProperty: (segment as any).date,
    datePropertyType: typeof (segment as any).date,
    wholeSegment: segment,
    timestamp: new Date().toISOString(),
  });

  // For Phase 4 segments, prioritize the date property over departureTime
  let dateValue: string | null = null;

  // FIXED: Check Phase 4 date property first (including null values), then fallback to departureTime
  if ("date" in segment) {
    // Phase4 segment - use the date property even if it's null (means "no date selected yet")
    dateValue = (segment as any).date;
    console.log("🔍 [flightSegmentToCustom] Using Phase 4 date property:", {
      dateValue,
      isNull: dateValue === null,
      isUndefined: dateValue === undefined,
      type: typeof dateValue,
    });
  } else if (segment.departureTime && segment.departureTime.trim() !== "") {
    dateValue = segment.departureTime;
    console.log("🔍 [flightSegmentToCustom] Using departureTime:", dateValue);
  } else {
    console.log("🔍 [flightSegmentToCustom] No valid date found, using null");
  }

  console.log("🔍 [flightSegmentToCustom] Final date value:", {
    dateValue,
    dateValueType: typeof dateValue,
    dateValueTruthy: !!dateValue,
  });

  // Handle both Phase4FlightSegment and FlightSegment formats
  const isPhase4Segment = "fromLocation" in segment || "toLocation" in segment;

  // Extract locations based on segment type
  const fromLocation = isPhase4Segment
    ? (segment as any).fromLocation
    : segment.origin;
  const toLocation = isPhase4Segment
    ? (segment as any).toLocation
    : segment.destination;

  console.log("🔍 [flightSegmentToCustom] Location extraction:", {
    isPhase4Segment,
    fromLocation: fromLocation?.code || "none",
    toLocation: toLocation?.code || "none",
    originalSegmentType: isPhase4Segment
      ? "Phase4FlightSegment"
      : "FlightSegment",
  });

  // Handle selectedFlight for both Phase4FlightSegment and FlightSegment formats
  let selectedFlight: any = undefined;

  if (isPhase4Segment && (segment as any).selectedFlight) {
    // Phase4 segments store selectedFlight directly
    selectedFlight = (segment as any).selectedFlight;
    console.log("🔍 [flightSegmentToCustom] Using Phase4 selectedFlight:", {
      flightNumber: selectedFlight?.flightNumber,
      flightId: selectedFlight?.id,
      hasSelectedFlight: !!selectedFlight,
    });
  } else if (segment.flightNumber) {
    // Legacy FlightSegment format - reconstruct selectedFlight from segment properties
    // ENHANCED: Log flight timing data before validation
    console.log("🔍 [flightSegmentToCustom] Analyzing flight timing data:", {
      segmentId: segment.id,
      flightNumber: segment.flightNumber,
      departureTime: segment.departureTime,
      arrivalTime: segment.arrivalTime,
      departureTimeType: typeof segment.departureTime,
      arrivalTimeType: typeof segment.arrivalTime,
      departureTimeIsDate:
        segment.departureTime?.match(/^\d{4}-\d{2}-\d{2}$/) ||
        segment.departureTime?.match(/^\d{2}\.\d{2}\.\d{4}$/),
      arrivalTimeIsDate:
        segment.arrivalTime?.match(/^\d{4}-\d{2}-\d{2}$/) ||
        segment.arrivalTime?.match(/^\d{2}\.\d{2}\.\d{4}$/),
      hasStoredSelectedFlight: !!(segment as any).selectedFlight,
      storedFlightTiming: (segment as any).selectedFlight
        ? {
            departureTime: (segment as any).selectedFlight.departureTime,
            arrivalTime: (segment as any).selectedFlight.arrivalTime,
          }
        : null,
    });

    // CRITICAL FIX: Use actual flight timing from stored selectedFlight if available
    // Otherwise reconstruct from segment data
    const hasFlightData =
      segment.flightNumber && segment.departureTime && segment.arrivalTime;

    if (hasFlightData) {
      // Check if we have a stored selectedFlight with actual timing data
      const storedSelectedFlight = (segment as any).selectedFlight;

      selectedFlight = {
        id: segment.id || `temp-${Date.now()}`,
        flightNumber: segment.flightNumber,
        airline: segment.airline,
        // CRITICAL: Use actual flight timing from stored selectedFlight if available
        departureTime:
          storedSelectedFlight?.departureTime || segment.departureTime,
        arrivalTime: storedSelectedFlight?.arrivalTime || segment.arrivalTime,
        duration: segment.duration,
        from: fromLocation,
        to: toLocation,
        price: segment.price || { amount: 0, currency: "EUR" },
        stops: segment.stops,
        status: "scheduled",
        type: "direct",
      };

      console.log(
        "🔍 [flightSegmentToCustom] Reconstructed selectedFlight with ACTUAL timing:",
        {
          flightNumber: selectedFlight?.flightNumber,
          flightId: selectedFlight?.id,
          departureTime: selectedFlight?.departureTime,
          arrivalTime: selectedFlight?.arrivalTime,
          reconstructed: true,
          usedStoredTiming: !!storedSelectedFlight,
          timingSource: storedSelectedFlight
            ? "stored selectedFlight"
            : "segment data",
        }
      );
    } else {
      console.log(
        "🔍 [flightSegmentToCustom] Skipping selectedFlight reconstruction - missing essential flight data:",
        {
          flightNumber: segment.flightNumber,
          departureTime: segment.departureTime,
          arrivalTime: segment.arrivalTime,
          hasFlightData,
        }
      );
      selectedFlight = undefined;
    }
  } else {
    console.log(
      "🔍 [flightSegmentToCustom] No selectedFlight data available:",
      {
        isPhase4Segment,
        hasSelectedFlightProperty: !!(segment as any).selectedFlight,
        hasFlightNumber: !!segment.flightNumber,
        segmentId: segment.id,
      }
    );
  }

  // 🎯 SIMPLE: Trust Zustand store completely - no restoration logic needed
  return {
    fromLocation,
    toLocation,
    date: dateValue,
    selectedFlight,
  };
};

// Add setLocations to the props if it's passed down, otherwise handle internally
interface ExtendedFlightSegmentsProps
  extends Omit<FlightSegmentsProps, "currentPhase" | "segments"> {
  setLocations?: React.Dispatch<React.SetStateAction<FlightLocation[]>>;
  setValidationState?: (isValid: boolean) => void;
  currentPhase?: number; // Make it optional in the extended props
  initialSegmentsData: FlightSegment[]; // Add explicit prop for segments
  flightType: FlightType | null; // Add flightType prop
  // Rename to avoid conflict with base type prop signature
  onSingleSegmentUpdate: (
    index: number,
    segment: Partial<FlightSegment>
  ) => void;
  onAddSegment: () => void;
  onRemoveSegment: (index: number) => void;
}

// Add explicit return type including null
export const FlightSegments = ({
  phase,
  showFlightSearch = false,
  showFlightDetails = false,
  disabled = false,
  onInteract,
  stepNumber,
  setValidationState,
  setIsFlightNotListedOpen,
  currentPhase,
  setLocations: setLocationsProp,
  initialSegmentsData, // Destructure new prop
  flightType, // Destructure new prop
  onSingleSegmentUpdate, // Destructure renamed action prop
  onAddSegment, // Destructure existing action prop
  onRemoveSegment, // Destructure existing action prop
}: ExtendedFlightSegmentsProps): ReactElement | null => {
  const { t, lang } = useTranslation();

  // Check if we're in Phase 4 and add extra safety
  const isPhase4 = phase === 4 || currentPhase === 4;

  // Get Phase 4 store at the top level (hooks can only be called at top level)
  const phase4Store = usePhase4();

  // State for internal management
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Flight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const isInitializedRef = useRef(false);
  const [internalLocations, setInternalLocations] = useState<FlightLocation[]>(
    []
  );
  const [selectedFlightIndex, setSelectedFlightIndex] = useState(0);

  // Determine which setter and state to use - moved up before hooks that need it
  const locations = useMemo(
    () => (setLocationsProp ? [] : internalLocations),
    [setLocationsProp, internalLocations]
  );

  const setLocations = useMemo(
    () => setLocationsProp || setInternalLocations,
    [setLocationsProp]
  );

  // Helper functions to handle both segment formats
  const getOriginCode = (segment: any): string => {
    return segment?.origin?.code || segment?.fromLocation?.code || "";
  };

  const getDestinationCode = (segment: any): string => {
    return segment?.destination?.code || segment?.toLocation?.code || "";
  };

  const getDepartureTime = (segment: any): string => {
    return segment?.departureTime || segment?.date || "";
  };

  // --- IMPORTANT: Define all hooks first, before any conditional returns ---
  // --- Moved useMemo hook to top level ---
  const directSegment = useMemo(() => {
    if (!initialSegmentsData || initialSegmentsData.length === 0) {
      return createPlaceholderSegment("direct-initial");
    }

    const firstSegment = initialSegmentsData[0];

    // For Phase 4, DirectFlight expects fromLocation/toLocation structure
    if (currentPhase === 4) {
      // Phase 4 segments already have fromLocation/toLocation structure
      // Just return the segment as-is, but ensure it has the right ID
      return {
        ...firstSegment,
        id: firstSegment.id || "phase4-direct",
      };
    }

    // For other phases, return the FlightSegment format
    return firstSegment;
  }, [initialSegmentsData, currentPhase]);

  // ✅ Better: Derive state directly from Zustand without local caching
  const multiCityCustomSegments = useMemo(() => {
    if (!initialSegmentsData) return [];
    return initialSegmentsData.map(flightSegmentToCustom);
  }, [initialSegmentsData]);

  // Memoize handlers
  const handleSetIsFlightNotListedOpen = useCallback(() => {
    setIsFlightNotListedOpen?.(true);
  }, [setIsFlightNotListedOpen]);

  const handleSearch = useCallback(
    async (params: {
      from: FlightLocation | null;
      to: FlightLocation | null;
      date: string | null;
    }) => {
      // Validate params before proceeding
      if (!params || typeof params !== "object") {
        console.warn("Invalid search parameters provided:", params);
        return;
      }

      // Open the bottom sheet immediately when search starts
      setIsBottomSheetOpen(true);
      setIsSearching(true);
      setSearchError(null); // Clear any previous errors

      try {
        // Extract required parameters from the provided data
        const fromIata = params.from?.iata || params.from?.code || "";
        const toIata = params.to?.iata || params.to?.code || "";

        // Improved date handling
        let flightDate = "";
        if (params.date) {
          // Check if date is in dd.mm.yyyy format (German/European format)
          if (params.date.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            const [day, month, year] = params.date.split(".").map(Number);

            // Log original values for debugging
            console.log("Date parsing DD.MM.YYYY format:", {
              original: params.date,
              day,
              month,
              year,
            });

            // Convert to yyyy-MM-dd format (ensuring day and month are correctly interpreted)
            flightDate = `${year}-${month.toString().padStart(2, "0")}-${day
              .toString()
              .padStart(2, "0")}`;

            console.log("Converted date from DD.MM.YYYY format:", {
              original: params.date,
              converted: flightDate,
              formattedForAPI: true,
            });
          }
          // Check if date is an ISO string (contains T)
          else if (params.date.includes("T")) {
            // For ISO strings with timezone info (e.g., 2025-01-04T23:00:00.000Z)
            // We need to handle timezone properly to avoid date mismatch
            const dateObj = new Date(params.date);
            if (!isNaN(dateObj.getTime())) {
              // Use the local date parts to create the date string
              const year = dateObj.getFullYear();
              const month = dateObj.getMonth() + 1; // getMonth() is 0-based
              const day = dateObj.getDate();

              flightDate = `${year}-${month.toString().padStart(2, "0")}-${day
                .toString()
                .padStart(2, "0")}`;
              console.log(
                "Extracted date from ISO string with timezone consideration:",
                {
                  original: params.date,
                  dateObj: dateObj.toString(),
                  localDate: dateObj.toLocaleDateString(),
                  extracted: flightDate,
                }
              );
            } else {
              // Fallback to simple splitting if Date creation fails
              flightDate = params.date.split("T")[0];
              console.log("Extracted date from ISO string by splitting:", {
                original: params.date,
                extracted: flightDate,
              });
            }
          }
          // Just use the date as is if it's already in yyyy-MM-dd format
          else if (params.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            flightDate = params.date;
            console.log(
              "Using date as is (already in yyyy-MM-dd format):",
              flightDate
            );
          }
          // For any other format, try to parse using Date object
          else {
            try {
              const dateObj = new Date(params.date);
              if (isNaN(dateObj.getTime())) {
                throw new Error("Invalid date");
              }
              flightDate = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1)
                .toString()
                .padStart(2, "0")}-${dateObj
                .getDate()
                .toString()
                .padStart(2, "0")}`;
              console.log("Parsed date using Date object:", {
                original: params.date,
                parsed: flightDate,
              });
            } catch (error) {
              console.error("Failed to parse date:", params.date, error);
              // Fallback to original behavior
              flightDate = params.date;
            }
          }
        }

        if (!fromIata || !toIata || !flightDate) {
          console.warn("Missing required search parameters", {
            fromIata,
            toIata,
            flightDate,
            hasFrom: !!params.from,
            hasTo: !!params.to,
            hasDate: !!params.date,
          });
          setSearchResults([]);
          setSearchError(t("flightSelector.errors.noFlightsRoute"));
          setIsSearching(false);
          setIsBottomSheetOpen(false);
          return;
        }

        console.log("Final search parameters:", {
          fromIata,
          toIata,
          flightDate,
        });

        // Call the API to search for flights using the correct Netlify function
        const searchParams = new URLSearchParams({
          from_iata: fromIata,
          to_iata: toIata,
          date: flightDate, // Use 'date' as expected by the function (not 'flight_date')
        });

        // Use the correct Netlify function endpoint
        const response = await fetch(
          `/.netlify/functions/searchFlights?${searchParams.toString()}`
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("Flight search failed:", response.status, errorText);
          setSearchResults([]);
          setSearchError(
            `Flight search failed (${response.status}): ${errorText.slice(
              0,
              100
            )}`
          );
          return;
        }

        const responseData = await response.json();
        console.log("Flight search API response:", responseData);

        // Handle the API response structure which includes data in a nested property
        const flightResults = responseData.data || [];

        if (!Array.isArray(flightResults) || flightResults.length === 0) {
          console.log("No flights found");
          setSearchResults([]);
          setSearchError(t("flightSelector.errors.noFlightsRoute"));
          return;
        }

        // Convert API response to Flight objects
        const flights: Flight[] = flightResults.map((flight: any) => {
          // Preserve existing location data if already in our locations array
          const existingOrigin = internalLocations.find(
            (loc) =>
              loc.iata === flight.dep_iata || loc.code === flight.dep_iata
          );

          const existingDestination = internalLocations.find(
            (loc) =>
              loc.iata === flight.arr_iata || loc.code === flight.arr_iata
          );

          // Create origin and destination locations
          const origin: FlightLocation = {
            id: flight.dep_iata || "",
            name:
              existingOrigin?.name || flight.dep_name || `${flight.dep_iata}`,
            code: flight.dep_iata || "",
            iata: flight.dep_iata || "",
            city: flight.dep_city || existingOrigin?.city || "",
            country: flight.dep_country || existingOrigin?.country || "",
            timezone: existingOrigin?.timezone || "",
            type: "airport",
          };

          const destination: FlightLocation = {
            id: flight.arr_iata || "",
            name:
              existingDestination?.name ||
              flight.arr_name ||
              `${flight.arr_iata}`,
            code: flight.arr_iata || "",
            iata: flight.arr_iata || "",
            city: flight.arr_city || existingDestination?.city || "",
            country: flight.arr_country || existingDestination?.country || "",
            timezone: existingDestination?.timezone || "",
            type: "airport",
          };

          // Add the locations to our shared list if they're not already there (for future reference)
          if (!existingOrigin && origin.name !== origin.iata) {
            setLocations((prev) => [...prev, origin]);
          }

          if (!existingDestination && destination.name !== destination.iata) {
            setLocations((prev) => [...prev, destination]);
          }

          // Extract airline code from flight number
          const airlineCode = flight.flightnumber_iata?.slice(0, 2) || "";

          // Calculate duration if not provided by API
          let duration = flight.duration || "";
          if (!duration && flight.dep_time_sched && flight.arr_time_sched) {
            try {
              // Parse departure and arrival times
              const departureTime = parseISO(`${flight.dep_time_sched}`);
              const arrivalTime = parseISO(`${flight.arr_time_sched}`);

              // Calculate duration in minutes
              const durationMs =
                arrivalTime.getTime() - departureTime.getTime();
              const hours = Math.floor(durationMs / (1000 * 60 * 60));
              const minutes = Math.floor(
                (durationMs % (1000 * 60 * 60)) / (1000 * 60)
              );

              // Format as "1h 15m"
              duration = `${hours}h ${minutes}m`;
              console.log("Calculated duration:", {
                departure: flight.dep_time_sched,
                arrival: flight.arr_time_sched,
                calculatedDuration: duration,
              });
            } catch (error) {
              console.error("Failed to calculate duration:", error);
            }
          }

          return {
            id:
              flight.id?.toString() ||
              `flight-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            flightNumber: flight.flightnumber_iata || "",
            airline: {
              code: airlineCode,
              name: flight.airline_name || airlineCode,
            },
            departureTime: flight.dep_time_sched || "",
            arrivalTime: flight.arr_time_sched || "",
            duration: duration,
            from: origin,
            to: destination,
            price: { amount: 0, currency: "EUR" },
            stops: flight.stops || 0,
            status: flight.status || "scheduled",
            type: "direct",
          };
        });

        setSearchResults(flights);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        setSearchError(t("errors.general"));
      } finally {
        setIsSearching(false);
      }
    },
    [setIsBottomSheetOpen, internalLocations, setLocations, t]
  );

  const handleSegmentChange = useCallback(
    (index: number, updatedPartialSegment: Partial<FlightSegment>) => {
      // Call the store action to update the segment
      onSingleSegmentUpdate(index, updatedPartialSegment);
    },
    [onSingleSegmentUpdate]
  );

  // Handle direct flight segment changes
  const handleDirectSegmentChange = useCallback(
    (segmentData: Partial<FlightSegment>) => {
      const segmentKey = 0; // Direct flight always uses the first segment
      console.log(
        "[FlightSegments] Handling direct segment change for segment key",
        segmentKey,
        "with data:",
        segmentData
      );

      // --- Step 1: Always update the store ---
      handleSegmentChange(segmentKey, segmentData);

      // --- Step 1.5: For Phase 4, also update the Phase 4 store ---
      if (currentPhase === 4) {
        console.log(
          "[FlightSegments] Updating Phase 4 store with flight data:",
          segmentData
        );

        // Get current Phase 4 direct flight data
        const currentDirectFlight = phase4Store.directFlight;

        // Build the updated Phase 4 flight segment
        const updatedPhase4Flight: Phase4FlightSegment = {
          fromLocation: currentDirectFlight.fromLocation,
          toLocation: currentDirectFlight.toLocation,
          date: currentDirectFlight.date,
          selectedFlight: null, // Default to null
        };

        // If the segment data contains flight information, create the selectedFlight
        if (
          segmentData.flightNumber &&
          segmentData.airline &&
          segmentData.departureTime &&
          segmentData.arrivalTime
        ) {
          // Convert Location to FlightLocation if needed
          const convertLocationToFlightLocation = (
            location: any
          ): FlightLocation => {
            if (!location) return createPlaceholderLocation("default");

            // If it's already a FlightLocation, return as is
            if ("city" in location && "timezone" in location) {
              return location as FlightLocation;
            }

            // Convert Location to FlightLocation
            return {
              id: location.id || location.code || "",
              name: location.name || "",
              code: location.code || location.iata || "",
              city: location.city || "",
              country: location.country || "",
              timezone: location.timezone || "",
              type: "airport" as const,
              iata: location.iata || location.code || "",
            };
          };

          const selectedFlight: Flight = {
            id: segmentData.id || "",
            flightNumber: segmentData.flightNumber,
            airline: segmentData.airline,
            from: convertLocationToFlightLocation(
              segmentData.origin || currentDirectFlight.fromLocation
            ),
            to: convertLocationToFlightLocation(
              segmentData.destination || currentDirectFlight.toLocation
            ),
            departureTime: segmentData.departureTime,
            arrivalTime: segmentData.arrivalTime,
            duration: segmentData.duration || "",
            stops: segmentData.stops || 0,
            price: segmentData.price || { amount: 0, currency: "EUR" },
            status: "scheduled" as FlightStatus,
            type: "direct",
          };

          updatedPhase4Flight.selectedFlight = selectedFlight;

          console.log(
            "[FlightSegments] Created selectedFlight for Phase 4:",
            selectedFlight
          );
        }

        // Update the Phase 4 store
        phase4Store.setDirectFlight(updatedPhase4Flight);
      }

      // --- Step 2: Check for completeness ---
      // Get current state of the segment after update
      const existingOrigin =
        segmentData.origin || initialSegmentsData?.[segmentKey]?.origin;
      const existingDestination =
        segmentData.destination ||
        initialSegmentsData?.[segmentKey]?.destination;
      const existingDepartureTime =
        segmentData.departureTime ||
        initialSegmentsData?.[segmentKey]?.departureTime;

      // Check if all required fields are present and valid
      const hasOrigin = !!(existingOrigin && existingOrigin.code);
      const hasDestination = !!(
        existingDestination && existingDestination.code
      );
      const hasDepartureTime = !!existingDepartureTime;

      console.log("[FlightSegments] Complete check details:", {
        segmentKey,
        origin: existingOrigin,
        destination: existingDestination,
        departureTime: existingDepartureTime,
        hasOrigin,
        hasDestination,
        hasDepartureTime,
      });

      // Determine if the segment is now complete
      const isComplete = hasOrigin && hasDestination && hasDepartureTime;

      console.log(
        "[FlightSegments] handleDirectSegmentChange complete check:",
        `origin=${hasOrigin}`,
        `destination=${hasDestination}`,
        `departureTime=${hasDepartureTime}`,
        `isComplete=${isComplete}`,
        `phase=${phase}`,
        `currentPhase=${currentPhase}`
      );

      // --- Step 3: If everything is complete and the form is now valid, notify parent ---
      if (isComplete && setValidationState) {
        console.log(
          "[FlightSegments] Setting validation state to TRUE because segment is complete"
        );
        setValidationState(true);
      }

      // Update the segment in the store
      handleSegmentChange(segmentKey, segmentData);

      // Log what was passed to the handler for debugging
      console.log(
        "[FlightSegments] Flight data sent to handleDirectSegmentChange:",
        {
          flightSegment: segmentData,
          hasSelectedFlight: !!(
            segmentData.flightNumber &&
            segmentData.airline &&
            segmentData.departureTime &&
            segmentData.arrivalTime
          ),
          convertedToSegment: true,
        }
      );
    },
    [
      handleSegmentChange,
      initialSegmentsData,
      setValidationState,
      phase,
      currentPhase,
      onSingleSegmentUpdate,
    ]
  );

  // Handle location search
  const searchAirports = useCallback(
    async (term: string) => {
      try {
        console.log(`Searching for airports with term: ${term}`);

        // Skip API call for very short terms (API requires at least 3 characters)
        if (!term || term.length < 3) {
          console.log("Search term too short, minimum 3 characters required");
          return [];
        }

        // Use the Netlify function directly with language parameter
        const response = await fetch(
          `/.netlify/functions/searchAirports?term=${encodeURIComponent(
            term
          )}&lang=${lang}`
        );

        if (!response.ok) {
          console.error("Airport search failed:", response.status);
          return [];
        }

        const airports = await response.json();
        console.log(`Airport search results for lang=${lang}:`, airports);

        if (!Array.isArray(airports) || airports.length === 0) {
          console.log("No airports found for term:", term);
          return [];
        }

        // Convert API response format to FlightLocation - handle actual API structure
        // API only provides: name, iata_code, lat, lng
        const locations: FlightLocation[] = airports.map((airport: any) => ({
          id: airport.iata_code || airport.code || airport.id || "",
          name: airport.name || airport.airport || "",
          code: airport.iata_code || airport.code || "",
          city: "", // API doesn't provide city - set to empty
          country: "", // API doesn't provide country - set to empty
          iata: airport.iata_code || airport.code || "",
          timezone: "", // API doesn't provide timezone
          type: "airport",
        }));

        console.log(`Converted locations for lang=${lang}:`, locations);

        // Update the locations state with distinct values
        setLocations((prev) => {
          const newLocations = [
            ...prev,
            ...locations.filter(
              (newLoc) =>
                newLoc.id &&
                !prev.some((existingLoc) => existingLoc.id === newLoc.id)
            ),
          ];

          // Sort alphabetically by name
          return newLocations.sort((a, b) => a.name.localeCompare(b.name));
        });

        return locations;
      } catch (error) {
        console.error("Error searching airports:", error);
        return [];
      }
    },
    [lang]
  );

  // --- Define MultiCity handlers at top level ---
  const handleMultiSegmentsChange = useCallback(
    (newSegments: FlightSegment[]) => {
      // TODO: Implement logic to update the store with the full new array.
      // This might need a new store action like `setSegments(newSegments)`
      // For now, just log.
      console.log("[FlightSegments] MultiCity segments changed:", newSegments);
    },
    [] // Remove onSingleSegmentUpdate from dependencies
  );

  // Handler to convert CustomFlightSegment[] back to FlightSegment[] format
  const handleCustomSegmentsChange = useCallback(
    (newCustomSegments: CustomFlightSegment[]) => {
      console.log(
        "[FlightSegments] handleCustomSegmentsChange called with:",
        newCustomSegments.length,
        "segments"
      );

      // Convert CustomFlightSegment[] back to FlightSegment[] before updating the store
      newCustomSegments.forEach((customSegment, index) => {
        const currentStoreSegment = initialSegmentsData[index];

        // Build update object with only changed fields
        const updatedPartialSegment: Partial<FlightSegment> = {};

        // Handle location updates
        if (customSegment.fromLocation !== currentStoreSegment?.origin) {
          updatedPartialSegment.origin =
            customSegment.fromLocation || undefined;
        }

        if (customSegment.toLocation !== currentStoreSegment?.destination) {
          updatedPartialSegment.destination =
            customSegment.toLocation || undefined;
        }

        // FIXED: Handle date updates with better null/undefined handling
        // CRITICAL: Check the correct date field based on segment type
        const isPhase4StoreSegment =
          "fromLocation" in (currentStoreSegment || {}) ||
          "toLocation" in (currentStoreSegment || {});
        const currentDate = isPhase4StoreSegment
          ? (currentStoreSegment as any)?.date // Phase 4 uses date property
          : currentStoreSegment?.departureTime; // Legacy uses departureTime
        const newDate = customSegment.date;

        console.log(`[FlightSegments] Date comparison for segment ${index}:`, {
          isPhase4StoreSegment,
          currentDate,
          newDate,
          currentDateType: typeof currentDate,
          newDateType: typeof newDate,
          segmentType: isPhase4StoreSegment ? "Phase4" : "Legacy",
        });

        // Only update if there's a meaningful change
        // Treat null and undefined as equivalent (both mean "no date")
        const currentDateNormalized = currentDate || null;
        const newDateNormalized = newDate || null;

        // CRITICAL FIX: Don't overwrite flight timing data with segment date
        // The segment date is for user selection validation, but flight departureTime should remain as actual flight timing
        // Only update departureTime if we're clearing a flight (no selected flight) - then use segment date
        if (newDateNormalized !== currentDateNormalized) {
          // CRITICAL: Always update departureTime when date changes, even for flight-selected segments
          // This ensures that date clearing is properly propagated to the store
          updatedPartialSegment.departureTime = newDate || undefined;

          if (!customSegment.selectedFlight) {
            // No flight selected - use segment date for departureTime (this becomes the placeholder)
            console.log(
              `[FlightSegments] Date update for segment ${index} (no flight selected):`,
              {
                from: currentDate,
                to: newDate,
                willSet: updatedPartialSegment.departureTime,
                meaningfulChange: true,
                reason:
                  "No selected flight - using segment date as placeholder",
              }
            );
          } else {
            // Flight is selected - still update departureTime but note it's for date validation
            console.log(
              `[FlightSegments] Date update for segment ${index} (flight selected):`,
              {
                segmentDate: newDate,
                flightDepartureTime: customSegment.selectedFlight.departureTime,
                willUpdateDepartureTime: updatedPartialSegment.departureTime,
                reason:
                  "Date changed - updating departureTime for Phase 4 validation",
                note: "Flight timing preserved in selectedFlight object",
              }
            );
          }
        } else {
          console.log(`[FlightSegments] No date change for segment ${index}:`, {
            current: currentDate,
            new: newDate,
            meaningfulChange: false,
          });
        }

        // Handle flight selection updates - FIXED: Use ID comparison instead of object reference
        const customFlightId = customSegment.selectedFlight?.id;
        const currentFlightId = currentStoreSegment?.selectedFlight?.id;

        // Compare by ID instead of object reference to avoid false positives
        const flightChanged = customFlightId !== currentFlightId;

        console.log(
          `[FlightSegments] Flight comparison for segment ${index}:`,
          {
            customFlightId,
            currentFlightId,
            flightChanged,
            customFlightNumber: customSegment.selectedFlight?.flightNumber,
            currentFlightNumber:
              currentStoreSegment?.selectedFlight?.flightNumber,
          }
        );

        if (flightChanged) {
          if (
            customSegment.selectedFlight === undefined ||
            customSegment.selectedFlight === null
          ) {
            // Clear flight data
            updatedPartialSegment.id = undefined;
            updatedPartialSegment.flightNumber = "";
            updatedPartialSegment.airline = undefined;
            // CRITICAL FIX: Reset departureTime to segment date (not flight datetime)
            updatedPartialSegment.departureTime = newDate || ""; // Reset to segment date only
            updatedPartialSegment.arrivalTime = "";
            updatedPartialSegment.duration = "";
            updatedPartialSegment.price = undefined;
            updatedPartialSegment.stops = 0;
            updatedPartialSegment.selectedFlight = undefined;
            console.log(
              `[FlightSegments] Clearing flight data for segment ${index}`,
              {
                resetDepartureTime: newDate,
                clearedFields: [
                  "id",
                  "flightNumber",
                  "airline",
                  "arrivalTime",
                  "duration",
                  "price",
                  "selectedFlight",
                ],
              }
            );
          } else {
            // Set flight data
            const selectedFlight = customSegment.selectedFlight;
            updatedPartialSegment.id = selectedFlight?.id;
            updatedPartialSegment.flightNumber = selectedFlight?.flightNumber;
            updatedPartialSegment.airline = selectedFlight?.airline;
            // CRITICAL: Keep departureTime as segment date for UI validation, NOT flight datetime
            // The actual flight timing is preserved in selectedFlight object
            updatedPartialSegment.departureTime = newDate || ""; // Keep as segment date
            updatedPartialSegment.arrivalTime = selectedFlight?.arrivalTime;
            updatedPartialSegment.duration = selectedFlight?.duration;
            updatedPartialSegment.price = selectedFlight?.price;
            updatedPartialSegment.stops = selectedFlight?.stops || 0;
            updatedPartialSegment.selectedFlight = selectedFlight;

            console.log(
              `[FlightSegments] Setting flight data for segment ${index}: {flightNumber: '${selectedFlight?.flightNumber}', flightId: '${selectedFlight?.id}', actualDepartureTime: '${selectedFlight?.departureTime}', actualArrivalTime: '${selectedFlight?.arrivalTime}', segmentDate: '${newDate}', note: 'departureTime field kept as segment date for UI validation'}`
            );
            console.log(
              `[FlightSegments] Flight timing vs segment date for segment ${index}: {segmentDate: '${newDate}', flightDepartureTime: '${selectedFlight?.departureTime}', flightArrivalTime: '${selectedFlight?.arrivalTime}', note: 'Segment date is for UI validation, flight times are for connection validation'}`
            );
          }
        } else {
          console.log(
            `[FlightSegments] No flight change for segment ${index}, keeping existing flight`
          );
        }

        // Apply updates if any changes exist
        if (Object.keys(updatedPartialSegment).length > 0) {
          if (onSingleSegmentUpdate) {
            console.log(
              `[FlightSegments] Updating segment ${index} with:`,
              updatedPartialSegment
            );
            onSingleSegmentUpdate(index, updatedPartialSegment);
          } else {
            console.warn(
              "[FlightSegments] onSingleSegmentUpdate not available"
            );
          }
        } else {
          console.log(
            `[FlightSegments] No changes for segment ${index}, skipping update`
          );
        }
      });
    },
    [onSingleSegmentUpdate, initialSegmentsData]
  );

  // Handler for adding a segment in the CustomFlightSegment format
  const handleAddCustomSegment = useCallback(
    (customSegment: CustomFlightSegment) => {
      // Convert CustomFlightSegment to FlightSegment before adding
      const newFlightSegment: FlightSegment = {
        // Generate a unique ID or use a placeholder
        id: customSegment.selectedFlight?.id || `new-seg-${Date.now()}`,
        origin:
          customSegment.fromLocation || createPlaceholderLocation("origin-new"),
        destination:
          customSegment.toLocation || createPlaceholderLocation("dest-new"),
        // FIXED: Don't set departureTime to segment date - use actual flight timing
        departureTime: customSegment.selectedFlight?.departureTime || "",
        arrivalTime: customSegment.selectedFlight?.arrivalTime || "",
        flightNumber: customSegment.selectedFlight?.flightNumber || "",
        airline:
          customSegment.selectedFlight?.airline || createPlaceholderAirline(),
        duration: customSegment.selectedFlight?.duration || "",
        stops: customSegment.selectedFlight?.stops ?? 0,
        price: customSegment.selectedFlight?.price || {
          amount: 0,
          currency: "EUR",
        },
        // Add other required FlightSegment fields with defaults
      };

      console.log("[FlightSegments] Creating new flight segment:", {
        customSegmentDate: customSegment.date,
        selectedFlightDepartureTime:
          customSegment.selectedFlight?.departureTime,
        newSegmentDepartureTime: newFlightSegment.departureTime,
        avoidingDateOnlyIssue: true,
      });

      // Check if addFlightSegment is available
      if (onAddSegment) {
        // Use the addFlightSegment action from the store
        onAddSegment();
      } else {
        console.warn(
          "[FlightSegments] addFlightSegment is not available in handleAddCustomSegment"
        );
      }
    },
    [onAddSegment] // Depend on the actions object
  );

  // Handler for removing a segment in the CustomFlightSegment format
  const handleRemoveCustomSegment = useCallback(
    (index: number) => {
      console.log(
        `[FlightSegments] handleRemoveCustomSegment called for index: ${index}`
      );
      // Directly call the store action via useStore
      try {
        onRemoveSegment(index);
        console.log(
          `[FlightSegments] Called removeFlightSegment store action for index: ${index}`
        );
      } catch (error) {
        console.error(
          "[FlightSegments] Error calling removeFlightSegment action:",
          error
        );
      }
    },
    [onRemoveSegment] // Remove dependency on multiCityCustomSegments
  );

  // Handler for selecting a location in the MultiCityFlight
  const handleFromLocationSelect = useCallback(
    (index: number, location: FlightLocation) => {
      // Update the location in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      updatedSegments[index].fromLocation = location;
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleToLocationSelect = useCallback(
    (index: number, location: FlightLocation) => {
      // Update the location in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      updatedSegments[index].toLocation = location;
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleDateSelect = useCallback(
    (index: number, date: string) => {
      // Update the date in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      updatedSegments[index].date = date;
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleFlightSelect = useCallback(
    (index: number, flight: Flight) => {
      // Update the flight in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      updatedSegments[index].selectedFlight = flight;
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleFlightNumberChange = useCallback(
    (index: number, flightNumber: string) => {
      // Update the flight number in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      const prevSelectedFlight = updatedSegments[index].selectedFlight;
      updatedSegments[index].selectedFlight = {
        ...prevSelectedFlight,
        id: prevSelectedFlight?.id || "", // Ensure id is always a string
        flightNumber: flightNumber || "", // Ensure flightNumber is always a string
        airline: prevSelectedFlight?.airline || createPlaceholderAirline(), // Ensure airline is always present
        departureTime: prevSelectedFlight?.departureTime || "", // Ensure departureTime is always a string
        arrivalTime: prevSelectedFlight?.arrivalTime || "", // Ensure arrivalTime is always a string
        from:
          prevSelectedFlight?.from ||
          createPlaceholderLocation("from-selected-flight"), // Ensure from is always a FlightLocation
        to:
          prevSelectedFlight?.to ||
          createPlaceholderLocation("to-selected-flight"), // Ensure to is always a FlightLocation
        price: prevSelectedFlight?.price || { amount: 0, currency: "EUR" }, // Ensure price is always present
        duration: prevSelectedFlight?.duration || "", // Ensure duration is always a string
        stops: prevSelectedFlight?.stops ?? 0, // Ensure stops is always a number
        status: prevSelectedFlight?.status || "scheduled", // Ensure status is always present
        type: prevSelectedFlight?.type || "direct", // Ensure type is always present
      };
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleSelectedAirlineChange = useCallback(
    (index: number, airline: Airline) => {
      // Update the airline in the MultiCityFlight
      const updatedSegments = [...multiCityCustomSegments];
      const prevSelectedFlight = updatedSegments[index].selectedFlight;
      updatedSegments[index].selectedFlight = {
        ...prevSelectedFlight,
        id: prevSelectedFlight?.id || "", // Ensure id is always a string
        flightNumber: prevSelectedFlight?.flightNumber || "", // Ensure flightNumber is always a string
        airline: airline || createPlaceholderAirline(), // Ensure airline is always present
        departureTime: prevSelectedFlight?.departureTime || "", // Ensure departureTime is always a string
        arrivalTime: prevSelectedFlight?.arrivalTime || "", // Ensure arrivalTime is always a string
        from:
          prevSelectedFlight?.from ||
          createPlaceholderLocation("from-selected-flight"), // Ensure from is always a FlightLocation
        to:
          prevSelectedFlight?.to ||
          createPlaceholderLocation("to-selected-flight"), // Ensure to is always a FlightLocation
        price: prevSelectedFlight?.price || { amount: 0, currency: "EUR" }, // Ensure price is always present
        duration: prevSelectedFlight?.duration || "", // Ensure duration is always a string
        stops: prevSelectedFlight?.stops ?? 0, // Ensure stops is always a number
        status: prevSelectedFlight?.status || "scheduled", // Ensure status is always present
        type: prevSelectedFlight?.type || "direct", // Ensure type is always present
      };
      handleCustomSegmentsChange(updatedSegments);
    },
    [multiCityCustomSegments, handleCustomSegmentsChange]
  );

  const handleLocationSearch = useCallback(
    (term: string) => {
      // Handle location search in the MultiCityFlight
      searchAirports(term);
    },
    [searchAirports]
  );

  // Handle flight selection from bottom sheet
  const handleFlightSelectFromSheet = useCallback(
    (flight: Flight) => {
      console.log(
        "[FlightSegments] Flight selected from bottom sheet:",
        flight
      );

      // --- START: Log the flight object selected directly from the bottom sheet ---
      console.log(
        "[FlightSegments] Flight selected from bottom sheet (raw object):",
        JSON.stringify(flight, null, 2)
      );
      console.log(
        "[FlightSegments] Flight selected - ID:",
        flight.id,
        "Date:",
        flight.departureTime,
        "Number:",
        flight.flightNumber,
        "From:",
        flight.from?.code,
        "To:",
        flight.to?.code
      );
      // --- END: Log the flight object selected directly from the bottom sheet ---

      // For direct flights
      if (flightType === "direct") {
        // Get the current segment to preserve location data
        const currentSegment = directSegment as any;

        console.log("[FlightSegments] Preserving existing locations:", {
          existingOrigin: currentSegment.origin,
          existingDestination: currentSegment.destination,
          flightFromCode: flight.from?.code,
          flightToCode: flight.to?.code,
        });

        // Convert Flight to FlightSegment with PRESERVED locations (DO NOT overwrite)
        // Only update flight-specific data, keep the original user-selected locations
        const flightSegment: Partial<FlightSegment> = {
          id: flight.id,
          flightNumber: flight.flightNumber,
          airline: flight.airline,
          departureTime: flight.departureTime,
          arrivalTime: flight.arrivalTime,
          duration: flight.duration,
          // CRITICAL FIX: DO NOT update origin and destination with flight data
          // This preserves the user's selected locations
          // origin: currentSegment.origin, // Keep existing
          // destination: currentSegment.destination, // Keep existing
          stops: flight.stops || 0,
        };

        console.log(
          "[FlightSegments] Flight segment data (locations preserved):",
          {
            flightSegment,
            preservedOrigin: currentSegment.origin,
            preservedDestination: currentSegment.destination,
          }
        );

        // --- Update selectedFlights record in the store ---
        console.log(
          `[FlightSegments] Updating selectedFlights record for index 0 with flight ID: ${flight.id}`
        );
        useStore.getState().actions.flight.setCurrentSegmentIndex(0);
        useStore.getState().actions.flight.setSelectedFlights([flight]);
        // --------------------------------------------------

        // Update the segment in the store
        handleDirectSegmentChange(flightSegment);
      } else {
        // For multi-city flights - keep original location data if possible
        const updatedSegments = [...multiCityCustomSegments];
        const currentSegment = updatedSegments[selectedFlightIndex];

        // Only replace the flight data, not the location data if possible
        const selectedFlight = {
          ...flight,
          from:
            currentSegment.fromLocation?.id === flight.from.id
              ? currentSegment.fromLocation
              : flight.from,
          to:
            currentSegment.toLocation?.id === flight.to.id
              ? currentSegment.toLocation
              : flight.to,
        };

        // CRITICAL: Always preserve the existing date when adding the selected flight
        const preservedDate = updatedSegments[selectedFlightIndex].date;
        console.log(
          `[FlightSegments] Before flight selection - preserving date:`,
          preservedDate
        );

        updatedSegments[selectedFlightIndex] = {
          ...updatedSegments[selectedFlightIndex],
          selectedFlight: selectedFlight,
          // CRITICAL: Preserve the original date format, don't use flight's departureTime
          // The flight's departureTime includes time (e.g., '2025-01-07 07:40:00')
          // but validation expects just date (e.g., '2025-01-07')
          date: preservedDate || currentSegment.date,
        };

        console.log(
          `[FlightSegments] After flight selection - segment date:`,
          updatedSegments[selectedFlightIndex].date
        );

        // --- Update selectedFlights record in the store for multi-city ---
        const allSelectedFlights = updatedSegments
          .map((seg) => seg.selectedFlight)
          .filter((f): f is Flight => !!f); // Get all currently selected flights

        console.log(
          `[FlightSegments] Updating selectedFlights record for index ${selectedFlightIndex} (Multi-City)`
        );
        // We might need a different action here if setSelectedFlights always uses currentSegmentIndex
        // For now, let's assume we update the whole record based on the derived list.
        // This needs verification based on how setSelectedFlights is intended for multi-city.
        // A potential better action: `setSelectedFlightForSegment(index, flight)`

        // Workaround: Update the specific index in the existing record directly (less ideal)
        const currentSelectedFlights =
          useStore.getState().flight.selectedFlights;
        currentSelectedFlights[selectedFlightIndex] = [flight]; // Assuming one flight per segment
        // This direct mutation is NOT recommended with Zustand, shows need for better action

        // Safer approach: call setSelectedFlights multiple times (if it uses currentSegmentIndex)
        useStore
          .getState()
          .actions.flight.setCurrentSegmentIndex(selectedFlightIndex);
        useStore.getState().actions.flight.setSelectedFlights([flight]);

        // ---------------------------------------------------------

        handleCustomSegmentsChange(updatedSegments);
      }

      // Close the bottom sheet
      setIsBottomSheetOpen(false);
    },
    [
      flightType,
      handleDirectSegmentChange,
      multiCityCustomSegments,
      handleCustomSegmentsChange,
      selectedFlightIndex,
      directSegment,
      internalLocations,
    ]
  );

  // --- Update useEffect for validation based on store segments ---
  useEffect(() => {
    // Use the destructured flightType prop directly
    const currentFlightType = flightType || "direct";

    if (!setValidationState || !stepNumber || !initialSegmentsData) return; // Guard against missing props

    let allSegmentsValid = false;
    const flightSegments = initialSegmentsData;
    const isPhase3 = phase === 3 || currentPhase === 3;

    if (isPhase3) {
      // For phase 3, require both location and flight details
      if (currentFlightType === "direct") {
        const segment = flightSegments[0];
        if (segment) {
          const hasOrigin = !!segment.origin?.code;
          const hasDestination = !!segment.destination?.code;
          const hasFlightDetails =
            !!segment.flightNumber &&
            !!segment.departureTime &&
            !!segment.arrivalTime;

          allSegmentsValid = hasOrigin && hasDestination && hasFlightDetails;
        }
      } else if (currentFlightType === "multi") {
        if (flightSegments.length > 1) {
          // Ensure at least 2 segments for multi
          allSegmentsValid = flightSegments.every((segment) => {
            const hasOrigin = !!segment.origin?.code;
            const hasDestination = !!segment.destination?.code;
            const hasFlightDetails =
              !!segment.flightNumber &&
              !!segment.departureTime &&
              !!segment.arrivalTime;

            return hasOrigin && hasDestination && hasFlightDetails;
          });
        } else {
          allSegmentsValid = false;
        }
      }
    } else {
      // FIXED: For other phases, require origin, destination, AND date for search functionality
      // The search button needs all three fields to work properly
      if (currentFlightType === "direct") {
        const segment = flightSegments[0];
        if (segment) {
          const hasOrigin = !!segment.origin?.code;
          const hasDestination = !!segment.destination?.code;
          const hasDate = !!segment.departureTime; // Date is required for search
          allSegmentsValid = hasOrigin && hasDestination && hasDate;

          console.log(`[FlightSegments Validation] Direct flight validation:`, {
            hasOrigin,
            hasDestination,
            hasDate,
            departureTime: segment.departureTime,
            allSegmentsValid,
            phase: currentPhase || phase,
          });
        }
      } else if (currentFlightType === "multi") {
        if (flightSegments.length > 0) {
          allSegmentsValid = flightSegments.every((segment, index) => {
            const hasOrigin = !!segment.origin?.code;
            const hasDestination = !!segment.destination?.code;
            const hasDate = !!segment.departureTime; // Date is required for search

            const segmentValid = hasOrigin && hasDestination && hasDate;

            console.log(
              `[FlightSegments Validation] Multi-city segment ${index} validation:`,
              {
                hasOrigin,
                hasDestination,
                hasDate,
                departureTime: segment.departureTime,
                segmentValid,
              }
            );

            return segmentValid;
          });
        } else {
          allSegmentsValid = false;
        }
      }
    }

    console.log(
      `[FlightSegments Validation Effect] Phase: ${phase}, Step: ${stepNumber}, FlightType: ${currentFlightType}, All Segments Valid: ${allSegmentsValid}`
    );

    setValidationState(allSegmentsValid);
  }, [
    initialSegmentsData,
    phase,
    currentPhase,
    setValidationState,
    stepNumber,
    flightType,
  ]);

  // Add extra validation for store prop to prevent errors - placed after all hook definitions
  if (!initialSegmentsData) {
    console.error("[FlightSegments] No segments provided, unable to render");
    return null;
  }

  // Get state from store with proper validation
  const flightSegments = initialSegmentsData;
  const segments = flightSegments; // Use store segments directly

  console.log(
    `[FlightSegments] Rendering with flight type: ${flightType}, phase: ${phase}, isPhase4: ${isPhase4}`,
    flightSegments
  );

  const shouldShowDateAndSearch = currentPhase !== 1;
  const shouldShowAddMoreFlights = currentPhase !== 1;

  return (
    <div className="flight-segments-container">
      {/* ... FlightTypeSelector ... */}

      {flightType === "direct" ? (
        <DirectFlight
          segment={directSegment as any}
          onSegmentChange={handleDirectSegmentChange}
          onSearch={(params) => {
            setSelectedFlightIndex(0);
            return handleSearch(params);
          }}
          searchResults={searchResults}
          isSearching={isSearching}
          disabled={disabled}
          setIsFlightNotListedOpen={handleSetIsFlightNotListedOpen}
          currentPhase={currentPhase}
          lang={lang}
          locations={locations}
          setLocations={setLocations}
          errors={undefined}
          showDateAndSearch={shouldShowDateAndSearch}
        />
      ) : (
        <MultiCityFlight
          phase={phase}
          segments={multiCityCustomSegments as any}
          onSegmentsChange={handleCustomSegmentsChange}
          addFlightSegment={handleAddCustomSegment}
          removeFlightSegment={handleRemoveCustomSegment}
          onSearch={(params) => {
            setSelectedFlightIndex(params.segmentIndex || 0);
            return handleSearch({
              from: params.from,
              to: params.to,
              date: params.date,
            });
          }}
          searchResults={searchResults}
          isSearching={isSearching}
          showDateAndSearch={shouldShowDateAndSearch}
          showAddMoreFlights={shouldShowAddMoreFlights}
          disabled={disabled}
          currentPhase={currentPhase}
          setIsFlightNotListedOpen={handleSetIsFlightNotListedOpen}
          searchAirports={searchAirports}
          locations={locations}
          setLocations={setLocations}
          setValidationState={setValidationState}
        />
      )}

      {/* Add the FlightSearchBottomSheet component */}
      <FlightSearchBottomSheet
        isOpen={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        onSelect={handleFlightSelectFromSheet}
        searchResults={searchResults}
        isSearching={isSearching}
        errorMessage={searchError}
        setIsFlightNotListedOpen={(isOpen: boolean) => {
          if (setIsFlightNotListedOpen) {
            setIsFlightNotListedOpen(isOpen);
          }
        }}
        currentPhase={currentPhase}
        selectedFlights={(() => {
          // Get current selected flights from store
          const currentSelectedFlights =
            useStore.getState().flight.selectedFlights;
          const allFlights: Flight[] = [];

          // Collect all selected flights from all segments
          Object.keys(currentSelectedFlights).forEach((segmentKey) => {
            const segmentFlights = currentSelectedFlights[parseInt(segmentKey)];
            if (Array.isArray(segmentFlights)) {
              allFlights.push(...segmentFlights);
            }
          });

          return allFlights;
        })()}
        segmentIndex={selectedFlightIndex}
      />
    </div>
  );
};

export default FlightSegments;
