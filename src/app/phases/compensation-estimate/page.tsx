"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PhaseNavigation } from "@/components/shared/navigation/PhaseNavigation";
import { SpeechBubble } from "@/components/ui/display/SpeechBubble";
import { BackButton } from "@/components/ui/button/BackButton";
import { ContinueButton } from "@/components/ui/button/ContinueButton";
import { PhaseGuard } from "@/components/shared/PhaseGuard";
import { useTranslation } from "@/hooks/useTranslation";
import useStore from "@/store/index";
import { getLanguageAwareUrl } from "@/utils/url";
import { useUniversalNavigation } from "@/utils/navigation";
import { ValidationPhase } from "@/types/shared/validation";
import { Card } from "@/components/ui/layout/Card";
import { formatCurrency } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import Image from "next/image";
import { processLocation } from "@/utils/locationUtils";
import { getAirportCitySync } from "@/utils/locationUtils";
import type { FlightLocation } from "@/types/shared/flight";
import type { FlightSegment } from "@/store/types";
import { heebo } from "@/fonts"; // Import the font

// Remove conflicting module declaration
/*
declare module "@/types/shared/flight" {
  interface FlightSegment {
    origin?: any;
    destination?: any;
    date?: string | null;
    selectedFlight?: any | null;
  }
}
*/

// Remove redundant local interface
/*
interface StoreFlightSegment {
  origin: any;
  destination: any;
  date?: string | null;
  selectedFlight?: any | null;
}
*/

// Remove LocationData type
/*
type LocationData = {
  value: string;
  label: string;
  city: string;
  description?: string;
  dropdownLabel?: string;
};
*/

// Simplify LocationType
type LocationType = FlightLocation | null;

type NavigationStateWithFlag = {
  _navigationInitiated?: boolean;
  [key: string]: any;
};

const clearNavigationFlags = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("navigation_in_progress");
    localStorage.removeItem("navigation_initiated");
    localStorage.removeItem("navigating_to_phase3");
    console.log("=== Cleared navigation flags ===", {
      timestamp: new Date().toISOString(),
    });
  }
};

export default function CompensationEstimatePage() {
  console.log(
    "[CompensationEstimatePage] Component rendering, Font variable:",
    heebo.variable
  ); // Log font variable
  const router = useRouter();
  const { t, lang } = useTranslation();
  const { navigateToPhase } = useUniversalNavigation();
  const [isClient, setIsClient] = useState(false);
  const store = useStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [cityData, setCityData] = useState<
    Array<{ departureCity: string; arrivalCity: string }>
  >([]);
  const initializationRef = React.useRef(false);
  const [airportData, setAirportData] = useState<
    Record<string, { city: string; name: string; iata_code: string }>
  >({});
  const [isContinueClicked, setIsContinueClicked] = useState<boolean>(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Moved this useEffect hook to the top level of the component
  useEffect(() => {
    console.log(
      "[CompensationEstimatePage] Unmount effect, Font variable:",
      heebo.variable
    ); // Log font variable for unmount
    // No cleanup needed here, but good practice to have a return function for cleanup
    return () => {
      // Perform any cleanup if necessary
      console.log(
        "[CompensationEstimatePage] Component unmounting, Font variable:",
        heebo.variable
      );
    };
  }, []); // Empty dependency array means this runs once on mount and once on unmount

  // Access store slices
  const flightState = store.flight;
  const navigation = store.navigation;
  const validation = store.validation;
  const userState = store.user;

  // Access actions
  const {
    flight: flightActions,
    navigation: navigationActions,
    validation: validationActions,
  } = store.actions;

  // Extract data from store (Ensure correct type)
  const flightSegments: FlightSegment[] = flightState.segments || [];
  const selectedType = flightState.type || "direct";
  const currentPhase = navigation.currentPhase;
  const completedPhases = navigation.completedPhases;
  const personalDetails = userState.details;

  // Get departure and destination FlightLocation objects from the segments
  // Handle both Phase 4 format (fromLocation/toLocation) and standard format (origin/destination)
  const originLocation: FlightLocation | null = (() => {
    if (flightSegments.length === 0) return null;
    const segment = flightSegments[0] as any;
    return segment.origin || segment.fromLocation || null;
  })();

  // For direct flights, use the first segment's destination
  // For multi-stop flights, use the last segment's destination
  const destinationLocation: FlightLocation | null = (() => {
    if (flightSegments.length === 0) return null;
    const segment = flightSegments[flightSegments.length - 1] as any;
    return segment.destination || segment.toLocation || null;
  })();

  // Temporary state for compensation until store implementation is complete
  const [compensationAmount, setCompensationAmount] = useState<number | null>(
    null
  );
  const [compensationLoading, setCompensationLoading] = useState(false);
  const [compensationError, setCompensationError] = useState<string | null>(
    null
  );

  // Clear any stale navigation locks on component mount
  useEffect(() => {
    console.log(
      "[CompensationEstimatePage] Component mounted, Font variable:",
      heebo.variable
    ); // Log font variable
    if (typeof window !== "undefined") {
      // Check if there's a stale navigation lock
      if (localStorage.getItem("navigation_in_progress") === "true") {
        console.log(
          "=== CompensationEstimatePage - Clearing stale navigation lock ===",
          {
            timestamp: new Date().toISOString(),
          }
        );
        clearNavigationFlags();
      }
    }
  }, []);

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch airport data for all locations on mount
  useEffect(() => {
    const fetchAirportData = async () => {
      if (!isClient) return;

      const airportCodes = new Set<string>();

      // Use originLocation and destinationLocation (which are FlightLocation | null)
      const originCode = originLocation?.code; // Directly access code
      const destinationCode = destinationLocation?.code; // Directly access code

      if (originCode && /^[A-Z]{3}$/.test(originCode)) {
        airportCodes.add(originCode);
      }

      if (destinationCode && /^[A-Z]{3}$/.test(destinationCode)) {
        airportCodes.add(destinationCode);
      }

      // Add segment locations (access nested origin/destination codes)
      // Handle both Phase 4 format (fromLocation/toLocation) and standard format (origin/destination)
      flightSegments.forEach((segment: FlightSegment) => {
        const segmentAny = segment as any;
        
        // Check origin/fromLocation
        const origin = segment.origin || segmentAny.fromLocation;
        if (origin?.code && /^[A-Z]{3}$/.test(origin.code)) {
          airportCodes.add(origin.code);
        }
        
        // Check destination/toLocation
        const destination = segment.destination || segmentAny.toLocation;
        if (destination?.code && /^[A-Z]{3}$/.test(destination.code)) {
          airportCodes.add(destination.code);
        }
      });

      // First, prepare a map with location data we already have
      const airportDetailsMap: Record<
        string,
        { city: string; name: string; iata_code: string }
      > = {};

      // Use the exact names from the locations in previous phases
      if (originCode && originLocation?.name) {
        airportDetailsMap[originCode] = {
          iata_code: originCode,
          name: originLocation.name,
          city: originLocation.city || "",
        };
      }

      if (destinationCode && destinationLocation?.name) {
        airportDetailsMap[destinationCode] = {
          iata_code: destinationCode,
          name: destinationLocation.name,
          city: destinationLocation.city || "",
        };
      }

      // Also get names from segments if available
      // Handle both Phase 4 format (fromLocation/toLocation) and standard format (origin/destination)
      flightSegments.forEach((segment: FlightSegment) => {
        const segmentAny = segment as any;
        
        // Check origin/fromLocation
        const origin = segment.origin || segmentAny.fromLocation;
        if (origin?.code && origin?.name) {
          airportDetailsMap[origin.code] = {
            iata_code: origin.code,
            name: origin.name,
            city: origin.city || "",
          };
        }
        
        // Check destination/toLocation
        const destination = segment.destination || segmentAny.toLocation;
        if (destination?.code && destination?.name) {
          airportDetailsMap[destination.code] = {
            iata_code: destination.code,
            name: destination.name,
            city: destination.city || "",
          };
        }
      });

      // Only fetch data for airports we don't already have information about
      const airportCodestoFetch = Array.from(airportCodes).filter(
        (code) => !airportDetailsMap[code]
      );

      // Create promises for all remaining airport code fetches
      const fetchPromises = airportCodestoFetch.map(async (code) => {
        try {
          console.log(
            `=== Fetching airport data for code: ${code}, lang: ${lang} ===`
          ); // Log lang value
          const response = await fetch(
            `/${lang}/api/searchairportsbyterm?term=${code}&lang=${lang}`
          );
          console.log(
            `=== Response for ${code} - Status: ${response.status}, OK: ${response.ok} ===`
          );
          if (response.ok) {
            const data = await response.json();
            console.log(
              `=== Response JSON data for ${code}:`,
              JSON.stringify(data)
            );
            // Check if data is an array and has at least one element
            if (Array.isArray(data) && data.length > 0) {
              // Look for exact match by IATA code
              const exactMatch = data.find(
                (airport) => airport.iata_code === code
              );

              if (exactMatch) {
                // Use exact match if found
                airportDetailsMap[code] = exactMatch;
                console.log(
                  `Found exact match for ${code}: ${exactMatch.name}`
                );
              } else {
                // Use the airport code as is - no fallbacks
                console.log(
                  `No exact match found for airport ${code} - using original code`
                );
                airportDetailsMap[code] = {
                  iata_code: code,
                  name: code,
                  city: "",
                };
              }

              // Cache the result
              try {
                const cacheKey = `airport_${code}_${lang || "en"}`;
                localStorage.setItem(
                  cacheKey,
                  JSON.stringify(airportDetailsMap[code])
                );
              } catch (e) {
                console.error("Error saving airport to cache:", e);
              }
            } else {
              // Just use the code - no fallbacks
              console.log(
                `No results from API for ${code} - using original code`
              );
              airportDetailsMap[code] = {
                iata_code: code,
                name: code,
                city: "",
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching details for airport ${code}:`, error);
          // Use the code on error - no fallbacks
          airportDetailsMap[code] = {
            iata_code: code,
            name: code,
            city: "",
          };
        }
      });

      // Wait for all fetches to complete
      await Promise.all(fetchPromises);

      // Update state with all the airport data
      setAirportData(airportDetailsMap);
      console.log("=== Fetched Airport Data ===", {
        airportCount: Object.keys(airportDetailsMap).length,
        airports: Object.keys(airportDetailsMap),
        timestamp: new Date().toISOString(),
      });
    };

    if (isClient) {
      fetchAirportData();
    }
  }, [isClient, originLocation, destinationLocation, flightSegments, lang]);

  const getLocationValue = (location: LocationType): string | null => {
    // Expects FlightLocation | null
    return location?.code ?? null;
  };

  const getLocationCity = (
    location: LocationType, // Expects FlightLocation | null
    lang: string
  ): string | null => {
    if (!location?.code) return null;
    return getAirportCitySync(location.code, lang);
  };

  const getLocationFullName = (location: LocationType): string | null => {
    console.log(
      `getLocationFullName called for code: ${
        location?.code
      }, airportData keys: ${Object.keys(airportData)}`
    );

    // First priority: Use the name directly from the location object
    // This is the data that was used in previous phases
    if (location?.name && location.name.trim() !== "") {
      return location.name;
    }

    // Second priority: Use the airport data from our API fetch
    if (location?.code && airportData[location.code]) {
      return airportData[location.code].name;
    }

    // Last resort: fall back to the IATA code
    if (location?.code) {
      return location.code;
    }

    return null;
  };

  // Initialize phase and calculate compensation
  useEffect(() => {
    const initializePhase = async () => {
      // Prevent multiple initializations
      if (initializationRef.current) return;
      initializationRef.current = true;

      // Log the exact location data for debugging
      console.log("=== CompensationEstimatePage - Location Data ===", {
        flightType: selectedType,
        segmentCount: flightSegments.length,
        origin: {
          code: originLocation?.code,
          name: originLocation?.name,
          city: originLocation?.city,
        },
        destination: {
          code: destinationLocation?.code,
          name: destinationLocation?.name,
          city: destinationLocation?.city,
        },
        segments: flightSegments.map((segment, index) => ({
          segmentNumber: index + 1,
          origin: {
            code: segment.origin?.code,
            name: segment.origin?.name,
            city: segment.origin?.city,
          },
          destination: {
            code: segment.destination?.code,
            name: segment.destination?.name,
            city: segment.destination?.city,
          },
        })),
      });

      // ENHANCED DEBUG: Log the exact segments data structure
      console.log(
        "=== CompensationEstimatePage - Detailed Segments Debug ===",
        {
          segmentsLength: flightSegments.length,
          rawSegments: flightSegments,
          firstSegmentOriginCode: flightSegments[0]?.origin?.code || "MISSING",
          firstSegmentDestinationCode:
            flightSegments[0]?.destination?.code || "MISSING",
          calculatedOriginLocation: originLocation,
          calculatedDestinationLocation: destinationLocation,
          originLocationCode: originLocation?.code || "MISSING",
          destinationLocationCode: destinationLocation?.code || "MISSING",
          timestamp: new Date().toISOString(),
        }
      );

      console.log("=== CompensationEstimatePage - Initializing ===", {
        originLocation,
        destinationLocation,
        isInitialized: initializationRef.current,
        flightSegments: JSON.stringify(flightSegments), // Log segments for debugging
        timestamp: new Date().toISOString(),
      });

      try {
        // Mark phase as completed in navigation state
        navigationActions.setCurrentPhase(
          ValidationPhase.COMPENSATION_ESTIMATE
        );
        navigationActions.addCompletedPhase(ValidationPhase.INITIAL_ASSESSMENT);

        // Save phase data - Use codes directly
        const fromValue = getLocationValue(originLocation);
        const toValue = getLocationValue(destinationLocation);

        // Calculate compensation if needed
        if (
          fromValue &&
          toValue &&
          !compensationAmount &&
          !compensationLoading
        ) {
          const fromIata = fromValue.toUpperCase().trim();
          const toIata = toValue.toUpperCase().trim();

          if (fromIata.length === 3 && toIata.length === 3) {
            try {
              setCompensationLoading(true);
              // Simulate API call
              const response = await fetch(
                `/api/calculatecompensationbyfromiatatoiata?from_iata=${fromIata}&to_iata=${toIata}`
              );

              if (response.ok) {
                const data = await response.json();
                if (typeof data.amount === "number") {
                  setCompensationAmount(data.amount);
                } else {
                  console.error("Invalid response format:", data);
                  setCompensationError("Invalid compensation data format");
                }
              } else {
                try {
                  const errorData = await response.json();
                  console.error("API error response:", errorData);
                  setCompensationError(errorData.error || "Failed to calculate compensation");
                } catch {
                  setCompensationError("Failed to calculate compensation");
                }
              }
              setCompensationLoading(false);
            } catch (error) {
              console.error("Error calculating compensation:", error);
              setCompensationError(
                error instanceof Error
                  ? error.message
                  : "Failed to calculate compensation"
              );
              setCompensationLoading(false);
            }
          }
        }

        // Mark step as validated
        validationActions.setStepValidation(
          ValidationPhase.INITIAL_ASSESSMENT,
          true
        );
        validationActions.setStepCompleted(
          ValidationPhase.INITIAL_ASSESSMENT,
          true
        );
        validationActions.setStepInteraction(
          ValidationPhase.COMPENSATION_ESTIMATE,
          true
        );

        // Set initialized after all operations are complete
        setIsInitialized(true);
        console.log("=== Phase 2 Initialization Complete ===", {
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error initializing phase:", error);
        router.push("/phases/flight-details");
      }
    };

    if (!isInitialized && !initializationRef.current) {
      initializePhase();
    }
  }, [
    isInitialized,
    router,
    lang,
    originLocation,
    destinationLocation,
    flightSegments,
    compensationAmount,
    compensationLoading,
    navigation,
    navigationActions,
    validationActions,
    currentPhase,
    completedPhases,
  ]);

  // Effect to monitor compensation calculation status
  useEffect(() => {
    if (compensationLoading) {
      console.log("=== Compensation Calculation in Progress ===", {
        timestamp: new Date().toISOString(),
      });
    } else if (compensationError) {
      console.error("=== Compensation Calculation Error ===", {
        error: compensationError,
        originLocation,
        destinationLocation,
        timestamp: new Date().toISOString(),
      });
    } else if (compensationAmount !== null) {
      console.log("=== Compensation Calculation Complete ===", {
        amount: compensationAmount,
        originLocation,
        destinationLocation,
        timestamp: new Date().toISOString(),
      });
    }
  }, [
    compensationLoading,
    compensationError,
    compensationAmount,
    originLocation,
    destinationLocation,
  ]);

  // Effect to recalculate compensation when locations change
  useEffect(() => {
    if (!isInitialized || compensationLoading) return;

    const recalculateCompensation = async () => {
      // Use originLocation and destinationLocation codes
      const departureCode = originLocation?.code;
      const arrivalCode = destinationLocation?.code;

      console.log("=== Location Change Detected ===", {
        departureCode,
        arrivalCode,
        timestamp: new Date().toISOString(),
      });

      if (!departureCode || !arrivalCode) return;

      // Clear any existing error
      if (compensationError) {
        setCompensationError(null);
      }

      // Ensure we have valid IATA codes
      const fromIata = departureCode.toUpperCase().trim();
      const toIata = arrivalCode.toUpperCase().trim();

      if (fromIata.length === 3 && toIata.length === 3) {
        console.log("=== Recalculating Compensation ===", {
          fromIata,
          toIata,
          timestamp: new Date().toISOString(),
        });

        try {
          setCompensationLoading(true);
          // Make API call to calculate compensation
          const response = await fetch(
            `/api/calculatecompensationbyfromiatatoiata?from_iata=${fromIata}&to_iata=${toIata}`
          );

          console.log("API response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("API response:", data);

            if (data && typeof data.amount === "number") {
              console.log("Setting compensation amount:", data.amount);
              setCompensationAmount(data.amount);
            } else {
              console.error("Invalid response format:", data);
              setCompensationError("Invalid response format from API");
            }
          } else {
            try {
              const errorData = await response.json();
              console.error("API error response:", errorData);
              setCompensationError(errorData.error || "Failed to calculate compensation");
            } catch {
              console.error(
                "Error response:",
                response.status,
                response.statusText
              );
              setCompensationError("Failed to calculate compensation");
            }
          }
          setCompensationLoading(false);
        } catch (error) {
          console.error("Error calculating compensation:", error);
          setCompensationError(
            error instanceof Error
              ? error.message
              : "Failed to calculate compensation - please try again"
          );
          setCompensationLoading(false);
        }
      } else {
        console.error("Invalid IATA codes:", { departureCode, arrivalCode });
        setCompensationError("Invalid airport codes provided");
      }
    };

    recalculateCompensation();
  }, [isInitialized, originLocation, destinationLocation]);

  const handleContinue = () => {
    console.log("=== Handle Continue START ===");

    // Check if navigation is already in progress
    if (localStorage.getItem("navigation_in_progress") === "true") {
      console.log("=== Navigation already in progress, ignoring click ===");
      return;
    }

    // Check if compensation is loading or not available
    if (compensationLoading || !compensationAmount) {
      console.log(
        "=== Cannot continue - compensation loading or not available ==="
      );
      return;
    }

    // Set component state to disable button
    setIsNavigating(true);

    // Clear any stale navigation locks first
    localStorage.removeItem("navigation_in_progress");

    // Set navigation lock to prevent duplicate clicks
    localStorage.setItem("navigation_in_progress", "true");

    // Mark phase as completed
    navigationActions.addCompletedPhase(ValidationPhase.COMPENSATION_ESTIMATE);
    validationActions.setStepCompleted(
      ValidationPhase.COMPENSATION_ESTIMATE,
      true
    );
    validationActions.setStepValidation(
      ValidationPhase.COMPENSATION_ESTIMATE,
      true
    );

    // Add a small delay to ensure state updates are processed before navigating
    setTimeout(() => {
      console.log("=== Navigating to flight details ===");
      // Use language-aware navigation via universal navigation system
      navigateToPhase(ValidationPhase.FLIGHT_DETAILS);
    }, 100);

    // Set a safety timeout to clear the navigation lock if navigation fails
    setTimeout(() => {
      localStorage.removeItem("navigation_in_progress");
    }, 5000);
  };

  const handleBack = () => {
    navigationActions.setCurrentPhase(ValidationPhase.INITIAL_ASSESSMENT);
    navigateToPhase(ValidationPhase.INITIAL_ASSESSMENT);
  };

  // Don't render until properly initialized
  if (!isClient || !isInitialized || !personalDetails) {
    return (
      <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#F54538] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
          <p className="text-sm text-gray-500 mt-2">
            {!isInitialized ? "Initializing..." : "Finalizing..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PhaseGuard phase={2}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation
          phase={ValidationPhase.COMPENSATION_ESTIMATE}
          translations={{
            title: "Compensation Estimate",
            description: "Estimate your potential compensation",
            back: "Back",
            continue: "Continue",
          }}
        />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble
              message={t("phases.compensationEstimate.description")}
            />

            {/* Flight Summary Card - New Format */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t(
                  "phases.compensationEstimate.flightSummary.title",
                  "Flugzusammenfassung"
                )}
              </h2>
              <div className="space-y-4">
                {/* Passenger Information */}
                <div className="pb-4 border-b border-gray-100">
                  <p className="text-gray-600">
                    {t("common.passenger", "Passagier")}
                  </p>
                  <p className="font-medium">
                    {personalDetails?.firstName
                      ? `${personalDetails.firstName} ${personalDetails.lastName}`
                      : t("common.noPassengerDetails", "Keine Passagierdaten")}
                  </p>
                </div>

                {/* Flight Segments */}
                <div className="space-y-4">
                  {selectedType === "direct" ? (
                    <div className="pb-4 border-b border-gray-100 last:border-b-0">
                      <p className="text-gray-600 font-medium mb-2">
                        {t("common.flight", "Flug")} 1
                      </p>
                      <div className="space-y-2">
                        <div>
                          <p className="text-gray-600">
                            {t(
                              "phases.compensationEstimate.flightSummary.from",
                              "Von"
                            )}
                          </p>
                          <p className="font-medium">
                            {/* Add a proper fallback for empty locations */}
                            {originLocation
                              ? getLocationFullName(originLocation) ||
                                originLocation.code ||
                                t(
                                  "phases.compensationEstimate.flightSummary.noFlightDetails",
                                  "Keine Flugdetails"
                                )
                              : t(
                                  "phases.compensationEstimate.flightSummary.noFlightDetails",
                                  "Keine Flugdetails"
                                )}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">
                            {t(
                              "phases.compensationEstimate.flightSummary.to",
                              "Nach"
                            )}
                          </p>
                          <p className="font-medium">
                            {/* Add a proper fallback for empty locations */}
                            {destinationLocation
                              ? getLocationFullName(destinationLocation) ||
                                destinationLocation.code ||
                                t(
                                  "phases.compensationEstimate.flightSummary.noFlightDetails",
                                  "Keine Flugdetails"
                                )
                              : t(
                                  "phases.compensationEstimate.flightSummary.noFlightDetails",
                                  "Keine Flugdetails"
                                )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Multi-city flights
                    flightSegments.map((segment, index) => (
                      <div
                        key={segment.id || index}
                        className="pb-4 border-b border-gray-100 last:border-b-0"
                      >
                        <p className="text-gray-600 font-medium mb-2">
                          {t("common.flight", "Flug")} {index + 1}
                        </p>
                        <div className="space-y-2">
                          <div>
                            <p className="text-gray-600">
                              {t(
                                "phases.compensationEstimate.flightSummary.from",
                                "Von"
                              )}
                            </p>
                            <p className="font-medium">
                              {/* Add a proper fallback for empty locations */}
                              {segment.origin
                                ? getLocationFullName(segment.origin) ||
                                  segment.origin.code ||
                                  t(
                                    "phases.compensationEstimate.flightSummary.noFlightDetails",
                                    "Keine Flugdetails"
                                  )
                                : t(
                                    "phases.compensationEstimate.flightSummary.noFlightDetails",
                                    "Keine Flugdetails"
                                  )}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">
                              {t(
                                "phases.compensationEstimate.flightSummary.to",
                                "Nach"
                              )}
                            </p>
                            <p className="font-medium">
                              {/* Add a proper fallback for empty locations */}
                              {segment.destination
                                ? getLocationFullName(segment.destination) ||
                                  segment.destination.code ||
                                  t(
                                    "phases.compensationEstimate.flightSummary.noFlightDetails",
                                    "Keine Flugdetails"
                                  )
                                : t(
                                    "phases.compensationEstimate.flightSummary.noFlightDetails",
                                    "Keine Flugdetails"
                                  )}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Compensation Amount Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t("phases.compensationEstimate.estimatedCompensation.title")}
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {compensationLoading
                  ? t(
                      "phases.compensationEstimate.estimatedCompensation.calculating"
                    )
                  : compensationError
                  ? compensationError
                  : typeof compensationAmount === "number"
                  ? `€${compensationAmount}`
                  : t(
                      "phases.compensationEstimate.flightSummary.noFlightDetails"
                    )}
              </div>
              <p className="text-gray-600 mt-2">
                {t(
                  "phases.compensationEstimate.estimatedCompensation.disclaimer"
                )}
              </p>
            </div>

            {/* Next Steps Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t("phases.compensationEstimate.nextSteps.title")}
              </h2>
              <div className="space-y-4">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                      {step}
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">
                        {t(
                          `phases.compensationEstimate.nextSteps.step${step}.title`
                        )}
                      </h3>
                      <p className="text-gray-600">
                        {t(
                          `phases.compensationEstimate.nextSteps.step${step}.description`
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mt-12 pt-8">
              <ContinueButton
                onClick={handleContinue}
                isLoading={compensationLoading || isNavigating}
                disabled={isNavigating}
                text={
                  isNavigating
                    ? "Navigating..."
                    : t("phases.compensationEstimate.navigation.continue")
                }
              />
              <BackButton
                useUniversalNav={true}
                navigateToPhase={ValidationPhase.INITIAL_ASSESSMENT}
                text={t("phases.compensationEstimate.navigation.back")}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
