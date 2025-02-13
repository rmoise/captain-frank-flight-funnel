'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, getLanguageAwareUrl } from '@/lib/state/store';
import { useFlightStore } from '@/lib/state/flightStore';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import type { LocationData } from '@/types/store';
import { useTranslation } from '@/hooks/useTranslation';
import type { FlightSegment } from '@/lib/state/store';

type RouteInfo = {
  departureCity: string;
  arrivalCity: string;
  departure: string;
  arrival: string;
};

// Extract city name from airport description
const extractCityName = async (
  desc: string | undefined | null
): Promise<string | null> => {
  if (!desc?.trim()) {
    return null;
  }

  try {
    console.log('Extracting city name from:', {
      code: desc,
      timestamp: new Date().toISOString(),
    });

    // Clean up the input - remove any extra spaces and convert to uppercase for comparison
    const cleanInput = desc.trim().toUpperCase();

    // Handle common airport codes directly
    const commonAirports: Record<string, string> = {
      MUC: 'Munich',
      BER: 'Berlin',
      FRA: 'Frankfurt',
      HAM: 'Hamburg',
      DUS: 'Düsseldorf',
      TXL: 'Berlin',
      CGN: 'Cologne',
    };

    // First check if the input matches a common airport code exactly
    if (commonAirports[cleanInput]) {
      console.log('Found exact airport code match:', {
        code: cleanInput,
        city: commonAirports[cleanInput],
      });
      return commonAirports[cleanInput];
    }

    // Then check if the input contains a common airport code
    for (const [code, city] of Object.entries(commonAirports)) {
      if (cleanInput.includes(code)) {
        console.log('Found airport code within string:', {
          code,
          city,
          original: desc,
        });
        return city;
      }
    }

    // If no direct match, try the API
    const response = await fetch(
      `/.netlify/functions/searchAirports?${new URLSearchParams({
        term: desc,
        lang: 'en',
      })}`
    );

    if (!response.ok) {
      console.warn('Airport API response not ok:', {
        status: response.status,
        statusText: response.statusText,
      });
      // Clean up the input string to get just the city name
      return desc.split(/[,\(]/)[0].trim();
    }

    const airports = await response.json();

    if (Array.isArray(airports) && airports.length > 0) {
      // Use the city from the first matching airport
      if (airports[0].city) {
        console.log('Found city name from API:', airports[0].city);
        return airports[0].city;
      }
      // If no city, try to extract it from the airport name
      if (airports[0].name) {
        // Remove "International Airport" and similar suffixes
        const cityName = airports[0].name
          .split(/[,\(]/)[0] // Split on comma or opening parenthesis
          .replace(/\b(international|airport|flughafen)\b/gi, '') // Remove common airport words
          .trim();
        console.log('Extracted city name from airport name:', cityName);
        return cityName;
      }
    }

    // If no results found, clean up the input string
    console.log(
      'No airports found in API response, using cleaned input as fallback'
    );
    return desc
      .split(/[,\(]/)[0] // Split on comma or opening parenthesis
      .replace(/\b(international|airport|flughafen)\b/gi, '') // Remove common airport words
      .trim();
  } catch (error) {
    console.error('Error fetching airport data:', {
      error,
      code: desc,
      timestamp: new Date().toISOString(),
    });
    // Return cleaned input as fallback
    return desc
      .split(/[,\(]/)[0]
      .replace(/\b(international|airport|flughafen)\b/gi, '')
      .trim();
  }
};

// For the direct flight section, create a new component to handle async city display
const AsyncCityName: React.FC<{
  cityData: {
    selectedFlightCity?: string | null;
    locationDesc?: string | null;
    dropdownLabel?: string | null;
    locationCity?: string | null;
    arrival?: string | null;
    departure?: string | null;
    value?: string | null;
  };
  fallback: string;
}> = ({ cityData, fallback }) => {
  const [cityName, setCityName] = useState<string>(fallback);

  useEffect(() => {
    const loadCityName = async () => {
      // Try each source in order of preference
      if (cityData.locationCity) {
        setCityName(cityData.locationCity);
        return;
      }

      if (cityData.selectedFlightCity) {
        setCityName(cityData.selectedFlightCity);
        return;
      }

      // Try to get city name from description or IATA code
      const desc = cityData.locationDesc || cityData.value;
      if (desc) {
        const extractedCity = await extractCityName(desc);
        if (extractedCity) {
          setCityName(extractedCity);
          return;
        }
      }

      // Try dropdown label as last resort
      if (cityData.dropdownLabel) {
        const extractedCity = await extractCityName(cityData.dropdownLabel);
        if (extractedCity) {
          setCityName(extractedCity);
          return;
        }
      }

      // Use arrival/departure or fallback
      setCityName(cityData.arrival || cityData.departure || fallback);
    };

    loadCityName();
  }, [cityData, fallback]);

  return <p className="font-medium">{cityName}</p>;
};

export default function CompensationEstimatePage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const flightStore = useFlightStore();

  const {
    personalDetails,
    fromLocation,
    toLocation,
    setCurrentPhase,
    completePhase,
    compensationAmount,
    compensationLoading,
    compensationError,
    setCompensationAmount,
    setCompensationLoading,
    setCompensationError,
    selectedType,
    selectedFlights,
    shouldRecalculateCompensation,
    compensationCache,
    directFlight,
    flightSegments,
    currentPhase,
    completedPhases,
    setSelectedFlights,
    updateValidationState,
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const isInitialized = useRef(false);
  const initializationLock = useRef(false);

  // Helper functions for comparing flight data
  const hasDirectFlightDataChanged = (
    newFlight: { fromLocation?: any; toLocation?: any } | null | undefined,
    cachedFlight: { fromLocation?: any; toLocation?: any } | null | undefined
  ) => {
    if (!newFlight || !cachedFlight) return true;
    return (
      newFlight?.fromLocation?.value !== cachedFlight?.fromLocation?.value ||
      newFlight?.toLocation?.value !== cachedFlight?.toLocation?.value
    );
  };

  const hasMultiSegmentDataChanged = (
    newSegments: FlightSegment[] | undefined | null,
    cachedSegments: FlightSegment[] | undefined | null
  ) => {
    if (!newSegments?.length || !cachedSegments?.length) return true;
    if (newSegments.length !== cachedSegments.length) return true;

    return (
      newSegments[0]?.fromLocation?.value !==
        cachedSegments[0]?.fromLocation?.value ||
      newSegments[newSegments.length - 1]?.toLocation?.value !==
        cachedSegments[cachedSegments.length - 1]?.toLocation?.value
    );
  };

  useEffect(() => {
    // Remove initial loading state set
    if (isInitialized.current || initializationLock.current) return;
    initializationLock.current = true;

    const initializePhase = async () => {
      try {
        // First ensure we're in the correct phase
        await setCurrentPhase(2);

        // Clear any stale compensation data
        setCompensationAmount(null);
        setCompensationError(null);

        // Try to restore from phase 1 first - this should be the source of truth
        const phase1Data = localStorage.getItem('phase1FlightData');
        if (phase1Data) {
          try {
            const parsedPhase1Data = JSON.parse(phase1Data);

            // Set the flight type first
            useStore
              .getState()
              .setSelectedType(parsedPhase1Data.selectedType || 'direct');

            // Handle direct flight data
            if (parsedPhase1Data.selectedType === 'direct') {
              if (parsedPhase1Data.directFlight) {
                useStore.getState().setDirectFlight({
                  fromLocation:
                    parsedPhase1Data.directFlight.fromLocation || null,
                  toLocation: parsedPhase1Data.directFlight.toLocation || null,
                  selectedFlight:
                    parsedPhase1Data.directFlight.selectedFlight || null,
                  date: parsedPhase1Data.directFlight.date
                    ? new Date(parsedPhase1Data.directFlight.date)
                    : null,
                });
              }
              // Clear any multi-segment data
              useStore.getState().setFlightSegments([]);
            }
            // Handle multi-segment flight data
            else if (parsedPhase1Data.selectedType === 'multi') {
              if (
                Array.isArray(parsedPhase1Data.flightSegments) &&
                parsedPhase1Data.flightSegments.length > 0
              ) {
                useStore
                  .getState()
                  .setFlightSegments(parsedPhase1Data.flightSegments);
              } else {
                useStore.getState().setFlightSegments([]);
              }
              // Clear direct flight data
              useStore.getState().setDirectFlight({
                fromLocation: null,
                toLocation: null,
                selectedFlight: null,
                date: null,
              });
            }

            // Update from/to locations based on flight type
            if (parsedPhase1Data.selectedType === 'direct') {
              if (
                parsedPhase1Data.directFlight?.fromLocation &&
                parsedPhase1Data.directFlight?.toLocation
              ) {
                useStore
                  .getState()
                  .setFromLocation(parsedPhase1Data.directFlight.fromLocation);
                useStore
                  .getState()
                  .setToLocation(parsedPhase1Data.directFlight.toLocation);
              }
            } else if (
              parsedPhase1Data.selectedType === 'multi' &&
              parsedPhase1Data.flightSegments?.length > 0
            ) {
              const firstSegment = parsedPhase1Data.flightSegments[0];
              const lastSegment =
                parsedPhase1Data.flightSegments[
                  parsedPhase1Data.flightSegments.length - 1
                ];
              if (firstSegment?.fromLocation && lastSegment?.toLocation) {
                useStore.getState().setFromLocation(firstSegment.fromLocation);
                useStore.getState().setToLocation(lastSegment.toLocation);
              }
            }

            // Force compensation recalculation if needed
            if (compensationCache.amount) {
              const shouldRecalculate =
                parsedPhase1Data.selectedType === 'direct'
                  ? hasDirectFlightDataChanged(
                      parsedPhase1Data.directFlight,
                      compensationCache.flightData?.directFlight
                    )
                  : hasMultiSegmentDataChanged(
                      parsedPhase1Data.flightSegments,
                      compensationCache.flightData?.flightSegments
                    );

              if (shouldRecalculate) {
                useStore.getState().setCompensationCache({
                  amount: 0,
                  flightData: {
                    selectedType: parsedPhase1Data.selectedType,
                    directFlight: null,
                    flightSegments: [],
                    selectedFlights: [],
                  },
                });
                setCompensationAmount(0);
              }
            }

            // Start compensation calculation immediately if we have cache
            if (compensationCache.amount && !shouldRecalculateCompensation()) {
              setCompensationAmount(compensationCache.amount);
              setCompensationLoading(false);
            }

            // Try to restore from phase 1 first
            if (
              parsedPhase1Data.timestamp &&
              Date.now() - parsedPhase1Data.timestamp < 300000
            ) {
              // Process flight segments
              let processedSegments = [];
              if (parsedPhase1Data.flightSegments?.length > 0) {
                processedSegments = parsedPhase1Data.flightSegments.map(
                  (segment: FlightSegment, index: number) => {
                    let fromLocation = segment.fromLocation;
                    let toLocation = segment.toLocation;
                    let selectedFlight = segment.selectedFlight;

                    // Parse locations if they're strings
                    if (typeof fromLocation === 'string') {
                      try {
                        fromLocation = JSON.parse(fromLocation);
                        console.log(
                          `=== Successfully parsed fromLocation for segment ${index + 1} ===`,
                          fromLocation
                        );
                      } catch (e) {
                        console.error(
                          `Error parsing fromLocation for segment ${index + 1}:`,
                          e
                        );
                        // Try to use the object directly if parsing failed
                        if (
                          typeof segment.fromLocation === 'object' &&
                          segment.fromLocation !== null
                        ) {
                          fromLocation = segment.fromLocation;
                        }
                      }
                    }

                    if (typeof toLocation === 'string') {
                      try {
                        toLocation = JSON.parse(toLocation);
                        console.log(
                          `=== Successfully parsed toLocation for segment ${index + 1} ===`,
                          toLocation
                        );
                      } catch (e) {
                        console.error(
                          `Error parsing toLocation for segment ${index + 1}:`,
                          e
                        );
                        // Try to use the object directly if parsing failed
                        if (
                          typeof segment.toLocation === 'object' &&
                          segment.toLocation !== null
                        ) {
                          toLocation = segment.toLocation;
                        }
                      }
                    }

                    // If locations are still not valid objects, try to create them from selectedFlight
                    if (
                      (!fromLocation || typeof fromLocation !== 'object') &&
                      selectedFlight?.departureCity
                    ) {
                      fromLocation = {
                        value: selectedFlight.departureCity,
                        label: selectedFlight.departureCity,
                        description:
                          selectedFlight.departureAirport ||
                          selectedFlight.departureCity,
                        city: selectedFlight.departureCity,
                        dropdownLabel: selectedFlight.departureAirport
                          ? `${selectedFlight.departureAirport} (${selectedFlight.departureCity})`
                          : selectedFlight.departureCity,
                      };
                      console.log(
                        `=== Created fromLocation from selectedFlight for segment ${index + 1} ===`,
                        fromLocation
                      );
                    }

                    if (
                      (!toLocation || typeof toLocation !== 'object') &&
                      selectedFlight?.arrivalCity
                    ) {
                      toLocation = {
                        value: selectedFlight.arrivalCity,
                        label: selectedFlight.arrivalCity,
                        description:
                          selectedFlight.arrivalAirport ||
                          selectedFlight.arrivalCity,
                        city: selectedFlight.arrivalCity,
                        dropdownLabel: selectedFlight.arrivalAirport
                          ? `${selectedFlight.arrivalAirport} (${selectedFlight.arrivalCity})`
                          : selectedFlight.arrivalCity,
                      };
                      console.log(
                        `=== Created toLocation from selectedFlight for segment ${index + 1} ===`,
                        toLocation
                      );
                    }

                    // Create the processed segment
                    const processedSegment = {
                      ...segment,
                      fromLocation: fromLocation || null,
                      toLocation: toLocation || null,
                      selectedFlight: selectedFlight || null,
                      date: segment.date ? new Date(segment.date) : null,
                    };

                    console.log(
                      `=== Final Processed Segment ${index + 1} ===`,
                      {
                        fromLocation: processedSegment.fromLocation,
                        toLocation: processedSegment.toLocation,
                        selectedFlight: processedSegment.selectedFlight,
                        date: processedSegment.date,
                      }
                    );

                    return processedSegment;
                  }
                );
              }

              // Use phase 1 data
              const stateToUse = {
                selectedFlights: parsedPhase1Data.selectedFlights || [],
                flightSegments: processedSegments,
                directFlight: parsedPhase1Data.directFlight || null,
                selectedType: parsedPhase1Data.selectedType || 'direct',
                fromLocation: parsedPhase1Data.fromLocation || null,
                toLocation: parsedPhase1Data.toLocation || null,
                timestamp: Date.now(),
              };

              console.log('=== DEBUG: Processed State to Use ===', {
                selectedType: stateToUse.selectedType,
                flightSegments: stateToUse.flightSegments?.map(
                  (segment: FlightSegment) => ({
                    fromLocation: segment.fromLocation,
                    toLocation: segment.toLocation,
                    selectedFlight: segment.selectedFlight,
                  })
                ),
                timestamp: new Date().toISOString(),
              });

              // Update store with phase 1 data
              if (stateToUse.fromLocation && stateToUse.toLocation) {
                useStore.getState().setFromLocation(stateToUse.fromLocation);
                useStore.getState().setToLocation(stateToUse.toLocation);
              }
              if (stateToUse.directFlight) {
                useStore.getState().setDirectFlight(stateToUse.directFlight);
              }
              if (stateToUse.selectedFlights.length > 0) {
                useStore
                  .getState()
                  .setSelectedFlights(stateToUse.selectedFlights);
              }
              if (stateToUse.flightSegments.length > 0) {
                useStore
                  .getState()
                  .setFlightSegments(stateToUse.flightSegments);
              }
              useStore.getState().setSelectedType(stateToUse.selectedType);

              // Save as phase 2 data
              localStorage.setItem(
                'phase2FlightData',
                JSON.stringify(stateToUse)
              );
            }
          } catch (error) {
            console.error('Error restoring phase 1 data:', error);
          }
        }

        // Then try phase 2 data
        const storedFlightData = localStorage.getItem('phase2FlightData');
        if (storedFlightData) {
          try {
            const parsedData = JSON.parse(storedFlightData);
            console.log('=== DEBUG: Phase 2 Data ===', {
              fromLocation: parsedData.fromLocation,
              toLocation: parsedData.toLocation,
              directFlight: parsedData.directFlight
                ? {
                    fromLocation: parsedData.directFlight.fromLocation,
                    toLocation: parsedData.directFlight.toLocation,
                  }
                : null,
              selectedType: parsedData.selectedType,
              flightSegments: parsedData.flightSegments?.map(
                (segment: FlightSegment) => ({
                  fromLocation: segment.fromLocation,
                  toLocation: segment.toLocation,
                })
              ),
              timestamp: new Date().toISOString(),
            });

            const timestamp = parsedData.timestamp || Date.now();
            const isDataFresh = Date.now() - timestamp < 300000; // 5 minutes

            if (isDataFresh) {
              console.log(
                '=== Restoring fresh flight data from localStorage ===',
                {
                  selectedFlights: parsedData.selectedFlights || [],
                  flightSegments: parsedData.flightSegments || [],
                  directFlight: parsedData.directFlight || null,
                  selectedType: parsedData.selectedType || 'direct',
                  fromLocation: parsedData.fromLocation || null,
                  toLocation: parsedData.toLocation || null,
                  timestamp: new Date().toISOString(),
                }
              );

              // Process flight segments
              let processedSegments = [];
              if (parsedData.flightSegments?.length > 0) {
                // First parse the main from/to locations
                let mainFromLocation = null;
                let mainToLocation = null;

                try {
                  if (typeof parsedData.fromLocation === 'string') {
                    mainFromLocation = JSON.parse(parsedData.fromLocation);
                    console.log(
                      '=== Successfully parsed main fromLocation ===',
                      mainFromLocation
                    );
                  } else if (parsedData.fromLocation) {
                    mainFromLocation = parsedData.fromLocation;
                  }
                } catch (e) {
                  console.error('Error parsing main fromLocation:', e);
                  if (
                    typeof parsedData.fromLocation === 'object' &&
                    parsedData.fromLocation !== null
                  ) {
                    mainFromLocation = parsedData.fromLocation;
                  }
                }

                try {
                  if (typeof parsedData.toLocation === 'string') {
                    mainToLocation = JSON.parse(parsedData.toLocation);
                    console.log(
                      '=== Successfully parsed main toLocation ===',
                      mainToLocation
                    );
                  } else if (parsedData.toLocation) {
                    mainToLocation = parsedData.toLocation;
                  }
                } catch (e) {
                  console.error('Error parsing main toLocation:', e);
                  if (
                    typeof parsedData.toLocation === 'object' &&
                    parsedData.toLocation !== null
                  ) {
                    mainToLocation = parsedData.toLocation;
                  }
                }

                processedSegments = parsedData.flightSegments.map(
                  (segment: FlightSegment, segmentIndex: number) => {
                    let fromLocation = segment.fromLocation;
                    let toLocation = segment.toLocation;
                    let selectedFlight =
                      segment.selectedFlight ||
                      parsedData.selectedFlights?.[segmentIndex];

                    console.log(
                      `=== Processing Segment ${segmentIndex + 1} Raw Data ===`,
                      {
                        segment,
                        selectedFlight,
                        parsedData: parsedData.selectedFlights?.[segmentIndex],
                        mainFromLocation,
                        mainToLocation,
                        rawFromLocation: fromLocation,
                        rawToLocation: toLocation,
                      }
                    );

                    // For first segment, try to use main fromLocation if segment's fromLocation is not valid
                    if (
                      segmentIndex === 0 &&
                      (!fromLocation || typeof fromLocation === 'string')
                    ) {
                      fromLocation = mainFromLocation;
                      console.log(
                        '=== Using main fromLocation for first segment ===',
                        fromLocation
                      );
                    }

                    // For last segment, try to use main toLocation if segment's toLocation is not valid
                    if (
                      segmentIndex === parsedData.flightSegments.length - 1 &&
                      (!toLocation || typeof toLocation === 'string')
                    ) {
                      toLocation = mainToLocation;
                      console.log(
                        '=== Using main toLocation for last segment ===',
                        toLocation
                      );
                    }

                    // Parse locations if they're still strings
                    if (typeof fromLocation === 'string') {
                      try {
                        fromLocation = JSON.parse(fromLocation);
                        console.log(
                          `=== Parsed fromLocation for segment ${segmentIndex + 1} ===`,
                          fromLocation
                        );
                      } catch (e) {
                        console.error(
                          `Error parsing fromLocation for segment ${segmentIndex + 1}:`,
                          e
                        );
                        // Try to get directly from the object if parsing failed
                        if (
                          typeof segment.fromLocation === 'object' &&
                          segment.fromLocation !== null
                        ) {
                          fromLocation = segment.fromLocation;
                        }
                      }
                    }

                    if (typeof toLocation === 'string') {
                      try {
                        toLocation = JSON.parse(toLocation);
                        console.log(
                          `=== Parsed toLocation for segment ${segmentIndex + 1} ===`,
                          toLocation
                        );
                      } catch (e) {
                        console.error(
                          `Error parsing toLocation for segment ${segmentIndex + 1}:`,
                          e
                        );
                        // Try to get directly from the object if parsing failed
                        if (
                          typeof segment.toLocation === 'object' &&
                          segment.toLocation !== null
                        ) {
                          toLocation = segment.toLocation;
                        }
                      }
                    }

                    // If locations are still not valid objects, try to create them from selectedFlight
                    if (
                      (!fromLocation || typeof fromLocation !== 'object') &&
                      selectedFlight?.departureCity
                    ) {
                      fromLocation = {
                        value: selectedFlight.departureCity,
                        label: selectedFlight.departureCity,
                        description:
                          selectedFlight.departureAirport ||
                          selectedFlight.departureCity,
                        city: selectedFlight.departureCity,
                        dropdownLabel: selectedFlight.departureAirport
                          ? `${selectedFlight.departureAirport} (${selectedFlight.departureCity})`
                          : selectedFlight.departureCity,
                      };
                      console.log(
                        `=== Created fromLocation from selectedFlight for segment ${segmentIndex + 1} ===`,
                        fromLocation
                      );
                    }

                    if (
                      (!toLocation || typeof toLocation !== 'object') &&
                      selectedFlight?.arrivalCity
                    ) {
                      toLocation = {
                        value: selectedFlight.arrivalCity,
                        label: selectedFlight.arrivalCity,
                        description:
                          selectedFlight.arrivalAirport ||
                          selectedFlight.arrivalCity,
                        city: selectedFlight.arrivalCity,
                        dropdownLabel: selectedFlight.arrivalAirport
                          ? `${selectedFlight.arrivalAirport} (${selectedFlight.arrivalCity})`
                          : selectedFlight.arrivalCity,
                      };
                      console.log(
                        `=== Created toLocation from selectedFlight for segment ${segmentIndex + 1} ===`,
                        toLocation
                      );
                    }

                    // If still not found, try to get from selectedFlights array
                    if (
                      (!fromLocation || typeof fromLocation !== 'object') &&
                      parsedData.selectedFlights?.length > segmentIndex
                    ) {
                      const flightFromArray =
                        parsedData.selectedFlights[segmentIndex];
                      if (flightFromArray?.departureCity) {
                        fromLocation = {
                          value: flightFromArray.departureCity,
                          label: flightFromArray.departureCity,
                          description:
                            flightFromArray.departureAirport ||
                            flightFromArray.departureCity,
                          city: flightFromArray.departureCity,
                          dropdownLabel: flightFromArray.departureAirport
                            ? `${flightFromArray.departureAirport} (${flightFromArray.departureCity})`
                            : flightFromArray.departureCity,
                        };
                        console.log(
                          `=== Created fromLocation from selectedFlights array for segment ${segmentIndex + 1} ===`,
                          fromLocation
                        );
                      }
                    }

                    if (
                      (!toLocation || typeof toLocation !== 'object') &&
                      parsedData.selectedFlights?.length > segmentIndex
                    ) {
                      const flightFromArray =
                        parsedData.selectedFlights[segmentIndex];
                      if (flightFromArray?.arrivalCity) {
                        toLocation = {
                          value: flightFromArray.arrivalCity,
                          label: flightFromArray.arrivalCity,
                          description:
                            flightFromArray.arrivalAirport ||
                            flightFromArray.arrivalCity,
                          city: flightFromArray.arrivalCity,
                          dropdownLabel: flightFromArray.arrivalAirport
                            ? `${flightFromArray.arrivalAirport} (${flightFromArray.arrivalCity})`
                            : flightFromArray.arrivalCity,
                        };
                        console.log(
                          `=== Created toLocation from selectedFlights array for segment ${segmentIndex + 1} ===`,
                          toLocation
                        );
                      }
                    }

                    // Create the processed segment
                    const processedSegment = {
                      ...segment,
                      fromLocation: fromLocation || null,
                      toLocation: toLocation || null,
                      selectedFlight: selectedFlight || null,
                      date: segment.date ? new Date(segment.date) : null,
                    };

                    console.log(
                      `=== Final Processed Segment ${segmentIndex + 1} ===`,
                      {
                        fromLocation: processedSegment.fromLocation,
                        toLocation: processedSegment.toLocation,
                        selectedFlight: processedSegment.selectedFlight,
                        date: processedSegment.date,
                        rawFromLocation: segment.fromLocation,
                        rawToLocation: segment.toLocation,
                      }
                    );

                    return processedSegment;
                  }
                );
              }

              // Prepare all state updates
              const stateUpdates = [];

              // Update flight selections if available
              if (parsedData.selectedFlights?.length > 0) {
                stateUpdates.push(
                  flightStore.setSelectedFlights(parsedData.selectedFlights),
                  flightStore.setOriginalFlights(parsedData.selectedFlights),
                  setSelectedFlights(parsedData.selectedFlights)
                );
              }

              // Update flight segments if available
              if (processedSegments.length > 0) {
                stateUpdates.push(
                  new Promise<void>((resolve) => {
                    useStore.setState((state) => {
                      // Get phase 1 data first
                      const phase1Data =
                        localStorage.getItem('phase1FlightData');
                      let phase1Segments = [];
                      let phase1Flights = [];

                      if (phase1Data) {
                        try {
                          const parsedPhase1 = JSON.parse(phase1Data);
                          phase1Segments = parsedPhase1.flightSegments || [];
                          phase1Flights = parsedPhase1.selectedFlights || [];
                          console.log('=== Retrieved Phase 1 Data ===', {
                            segments: phase1Segments.length,
                            flights: phase1Flights.length,
                            timestamp: new Date().toISOString(),
                          });
                        } catch (e) {
                          console.error('Error parsing phase 1 data:', e);
                        }
                      }

                      // Process each segment with phase 1 data
                      const updatedSegments = processedSegments.map(
                        (segment: FlightSegment, index: number) => {
                          // Get corresponding phase 1 segment and flight
                          const phase1Segment = phase1Segments[index];
                          const phase1Flight = phase1Flights[index];

                          console.log(
                            `=== Processing Segment ${index + 1} with Phase 1 Data ===`,
                            {
                              phase1Segment: phase1Segment
                                ? 'exists'
                                : 'missing',
                              phase1Flight: phase1Flight ? 'exists' : 'missing',
                              currentSegment: segment ? 'exists' : 'missing',
                            }
                          );

                          // Parse locations if they're strings
                          let fromLocation = segment.fromLocation;
                          let toLocation = segment.toLocation;

                          // Try phase 1 segment locations first
                          if (phase1Segment) {
                            if (!fromLocation && phase1Segment.fromLocation) {
                              try {
                                fromLocation =
                                  typeof phase1Segment.fromLocation === 'string'
                                    ? JSON.parse(phase1Segment.fromLocation)
                                    : phase1Segment.fromLocation;
                                console.log(
                                  `=== Using Phase 1 fromLocation for Segment ${index + 1} ===`,
                                  fromLocation
                                );
                              } catch (e) {
                                console.error(
                                  `Error parsing phase 1 fromLocation for segment ${index + 1}:`,
                                  e
                                );
                              }
                            }

                            if (!toLocation && phase1Segment.toLocation) {
                              try {
                                toLocation =
                                  typeof phase1Segment.toLocation === 'string'
                                    ? JSON.parse(phase1Segment.toLocation)
                                    : phase1Segment.toLocation;
                                console.log(
                                  `=== Using Phase 1 toLocation for Segment ${index + 1} ===`,
                                  toLocation
                                );
                              } catch (e) {
                                console.error(
                                  `Error parsing phase 1 toLocation for segment ${index + 1}:`,
                                  e
                                );
                              }
                            }
                          }

                          // If still not found, try phase 1 flight data
                          if (phase1Flight) {
                            if (!fromLocation && phase1Flight.departureCity) {
                              fromLocation = {
                                value: phase1Flight.departureCity,
                                label: phase1Flight.departureCity,
                                description:
                                  phase1Flight.departureAirport ||
                                  phase1Flight.departureCity,
                                city: phase1Flight.departureCity,
                                dropdownLabel: phase1Flight.departureAirport
                                  ? `${phase1Flight.departureAirport} (${phase1Flight.departureCity})`
                                  : phase1Flight.departureCity,
                              };
                              console.log(
                                `=== Created fromLocation from Phase 1 Flight for Segment ${index + 1} ===`,
                                fromLocation
                              );
                            }

                            if (!toLocation && phase1Flight.arrivalCity) {
                              toLocation = {
                                value: phase1Flight.arrivalCity,
                                label: phase1Flight.arrivalCity,
                                description:
                                  phase1Flight.arrivalAirport ||
                                  phase1Flight.arrivalCity,
                                city: phase1Flight.arrivalCity,
                                dropdownLabel: phase1Flight.arrivalAirport
                                  ? `${phase1Flight.arrivalAirport} (${phase1Flight.arrivalCity})`
                                  : phase1Flight.arrivalCity,
                              };
                              console.log(
                                `=== Created toLocation from Phase 1 Flight for Segment ${index + 1} ===`,
                                toLocation
                              );
                            }
                          }

                          // Create final segment with all available data
                          const finalSegment = {
                            ...segment,
                            fromLocation:
                              fromLocation || segment.fromLocation || null,
                            toLocation:
                              toLocation || segment.toLocation || null,
                            selectedFlight:
                              segment.selectedFlight || phase1Flight || null,
                            date:
                              segment.date ||
                              (phase1Segment?.date
                                ? new Date(phase1Segment.date)
                                : null),
                          };

                          console.log(
                            `=== Final Processed Segment ${index + 1} ===`,
                            {
                              fromLocation: finalSegment.fromLocation
                                ? 'exists'
                                : 'missing',
                              toLocation: finalSegment.toLocation
                                ? 'exists'
                                : 'missing',
                              selectedFlight: finalSegment.selectedFlight
                                ? 'exists'
                                : 'missing',
                              date: finalSegment.date,
                            }
                          );

                          return finalSegment;
                        }
                      );

                      return {
                        ...state,
                        flightSegments: updatedSegments,
                        selectedType: parsedData.selectedType || 'direct',
                      };
                    });
                    resolve();
                  })
                );
              }

              // Update direct flight if available
              if (parsedData.directFlight) {
                let fromLocation = parsedData.directFlight.fromLocation;
                let toLocation = parsedData.directFlight.toLocation;

                // Parse locations if they're strings
                if (typeof fromLocation === 'string') {
                  try {
                    fromLocation = JSON.parse(fromLocation);
                  } catch (e) {
                    console.error(
                      'Error parsing directFlight fromLocation:',
                      e
                    );
                    // Try to get from phase 1
                    const phase1Data = localStorage.getItem('phase1FlightData');
                    if (phase1Data) {
                      try {
                        const parsedPhase1 = JSON.parse(phase1Data);
                        if (parsedPhase1.directFlight?.fromLocation) {
                          fromLocation =
                            typeof parsedPhase1.directFlight.fromLocation ===
                            'string'
                              ? JSON.parse(
                                  parsedPhase1.directFlight.fromLocation
                                )
                              : parsedPhase1.directFlight.fromLocation;
                        }
                      } catch (e) {
                        console.error('Error getting phase 1 fromLocation:', e);
                      }
                    }
                  }
                }

                if (typeof toLocation === 'string') {
                  try {
                    toLocation = JSON.parse(toLocation);
                  } catch (e) {
                    console.error('Error parsing directFlight toLocation:', e);
                    // Try to get from phase 1
                    const phase1Data = localStorage.getItem('phase1FlightData');
                    if (phase1Data) {
                      try {
                        const parsedPhase1 = JSON.parse(phase1Data);
                        if (parsedPhase1.directFlight?.toLocation) {
                          toLocation =
                            typeof parsedPhase1.directFlight.toLocation ===
                            'string'
                              ? JSON.parse(parsedPhase1.directFlight.toLocation)
                              : parsedPhase1.directFlight.toLocation;
                        }
                      } catch (e) {
                        console.error('Error getting phase 1 toLocation:', e);
                      }
                    }
                  }
                }

                stateUpdates.push(
                  new Promise<void>((resolve) => {
                    useStore.setState((state) => ({
                      ...state,
                      directFlight: {
                        ...parsedData.directFlight,
                        fromLocation,
                        toLocation,
                      },
                    }));
                    resolve();
                  })
                );
              }

              // Update from/to locations
              if (parsedData.fromLocation || parsedData.toLocation) {
                let fromLocation = parsedData.fromLocation;
                let toLocation = parsedData.toLocation;

                // Parse locations if they're strings
                if (typeof fromLocation === 'string') {
                  try {
                    fromLocation = JSON.parse(fromLocation);
                  } catch (e) {
                    console.error('Error parsing fromLocation:', e);
                  }
                }
                if (typeof toLocation === 'string') {
                  try {
                    toLocation = JSON.parse(toLocation);
                  } catch (e) {
                    console.error('Error parsing toLocation:', e);
                  }
                }

                stateUpdates.push(
                  new Promise<void>((resolve) => {
                    useStore.setState((state) => ({
                      ...state,
                      fromLocation,
                      toLocation,
                    }));
                    resolve();
                  })
                );
              }

              // Execute all updates atomically
              await Promise.all(stateUpdates);

              // Update validation state after all updates
              const updatedState = useStore.getState();
              const isFlightValid = validateFlightData(updatedState);

              updateValidationState({
                ...updatedState.validationState,
                isFlightValid,
                stepValidation: {
                  ...updatedState.validationState.stepValidation,
                  2: isFlightValid,
                },
                2: isFlightValid,
                _timestamp: Date.now(),
              });

              setMounted(true);
              isInitialized.current = true;
              return;
            }
          } catch (error) {
            console.error('Error restoring flight data:', error);
          }
        }

        // If we get here, use current state
        const updatedState = useStore.getState();
        console.log('=== Using store state ===', {
          selectedType: updatedState.selectedType,
          directFlight: updatedState.directFlight
            ? {
                selectedFlight: updatedState.directFlight.selectedFlight,
                fromLocation: updatedState.directFlight.fromLocation,
                toLocation: updatedState.directFlight.toLocation,
              }
            : null,
          flightSegments: updatedState.flightSegments?.length || 0,
        });

        // Save current state
        const stateToSave = {
          selectedFlights: updatedState.selectedFlights || [],
          directFlight: updatedState.directFlight
            ? {
                selectedFlight: updatedState.directFlight.selectedFlight,
                fromLocation: updatedState.directFlight.fromLocation,
                toLocation: updatedState.directFlight.toLocation,
              }
            : null,
          selectedType: updatedState.selectedType,
          flightSegments: updatedState.flightSegments || [],
          fromLocation:
            updatedState.directFlight?.fromLocation ||
            updatedState.flightSegments?.[0]?.fromLocation ||
            null,
          toLocation:
            updatedState.directFlight?.toLocation ||
            updatedState.flightSegments?.[0]?.toLocation ||
            null,
          timestamp: Date.now(),
        };

        localStorage.setItem('phase2FlightData', JSON.stringify(stateToSave));

        const isFlightValid = validateFlightData(updatedState);
        updateValidationState({
          ...updatedState.validationState,
          isFlightValid,
          stepValidation: {
            ...updatedState.validationState.stepValidation,
            2: isFlightValid,
          },
          2: isFlightValid,
          _timestamp: Date.now(),
        });

        setMounted(true);
        isInitialized.current = true;
      } finally {
        initializationLock.current = false;
      }
    };

    initializePhase().catch((error) => {
      console.error('Error during phase initialization:', error);
      initializationLock.current = false;
    });
  }, [
    isInitialized,
    flightStore,
    setSelectedFlights,
    setCurrentPhase,
    updateValidationState,
  ]);

  // Helper function to validate flight data
  const validateFlightData = (state: any) => {
    if (state.selectedType === 'direct') {
      const hasValidDirectFlight =
        state.directFlight &&
        state.directFlight.fromLocation &&
        state.directFlight.toLocation;

      const hasValidSelectedFlights =
        state.selectedFlights &&
        state.selectedFlights.length > 0 &&
        state.selectedFlights.every(
          (flight: any) =>
            flight &&
            flight.airline &&
            flight.flightNumber &&
            flight.departureCity &&
            flight.arrivalCity &&
            flight.date
        );

      return hasValidDirectFlight || hasValidSelectedFlights;
    } else {
      return (
        state.flightSegments?.length > 0 &&
        state.flightSegments.every(
          (segment: any) =>
            segment &&
            segment.fromLocation &&
            segment.toLocation &&
            segment.selectedFlight
        )
      );
    }
  };

  useEffect(() => {
    if (!fromLocation || !toLocation) return;

    try {
      const from =
        typeof fromLocation === 'string'
          ? JSON.parse(fromLocation)
          : fromLocation;
      const to =
        typeof toLocation === 'string' ? JSON.parse(toLocation) : toLocation;

      const fromCity =
        from.city || from.dropdownLabel?.split('(')[0]?.trim() || from.value;
      const toCity =
        to.city || to.dropdownLabel?.split('(')[0]?.trim() || to.value;

      const newRouteInfo = {
        departure: from.value,
        arrival: to.value,
        departureCity: fromCity,
        arrivalCity: toCity,
      };

      // Only update route info if it has changed
      if (
        !routeInfo ||
        routeInfo.departure !== newRouteInfo.departure ||
        routeInfo.arrival !== newRouteInfo.arrival
      ) {
        setRouteInfo(newRouteInfo);

        // Clear compensation cache only if locations have actually changed
        useStore.getState().setCompensationCache({
          amount: 0,
          flightData: {
            selectedType: selectedType,
            directFlight: null,
            flightSegments: [],
            selectedFlights: [],
          },
        });
        setCompensationAmount(0);
        setCompensationError(null);

        // Trigger calculation only if we have valid flight data
        const hasMultiSegmentData =
          selectedType === 'multi' &&
          flightSegments?.length > 0 &&
          flightSegments[0]?.fromLocation?.value &&
          flightSegments[flightSegments.length - 1]?.toLocation?.value;

        const hasDirectFlightData =
          selectedType === 'direct' &&
          ((selectedFlights?.length > 0 && selectedFlights[0] !== null) ||
            (directFlight?.fromLocation?.value &&
              directFlight?.toLocation?.value));

        if (hasMultiSegmentData || hasDirectFlightData) {
          setCompensationLoading(true);
          const event = new Event('calculatecompensation');
          window.dispatchEvent(event);
        }
      }
    } catch (error) {
      console.error('Error parsing location data:', error);
    }
  }, [
    fromLocation,
    toLocation,
    selectedType,
    flightSegments,
    directFlight,
    selectedFlights,
    routeInfo,
  ]);

  useEffect(() => {
    const calculateCompensation = async () => {
      try {
        // Always get fresh phase 1 data first
        const phase1Data = localStorage.getItem('phase1FlightData');
        let currentFromIata, currentToIata;

        if (phase1Data) {
          const parsedPhase1 = JSON.parse(phase1Data);

          if (
            parsedPhase1.selectedType === 'multi' &&
            parsedPhase1.flightSegments?.length > 0
          ) {
            currentFromIata =
              parsedPhase1.flightSegments[0]?.fromLocation?.value;
            currentToIata =
              parsedPhase1.flightSegments[
                parsedPhase1.flightSegments.length - 1
              ]?.toLocation?.value;
          } else if (
            parsedPhase1.selectedType === 'direct' &&
            parsedPhase1.directFlight
          ) {
            currentFromIata = parsedPhase1.directFlight.fromLocation?.value;
            currentToIata = parsedPhase1.directFlight.toLocation?.value;
          }
        }

        // If we couldn't get from phase 1, try current state
        if (!currentFromIata || !currentToIata) {
          if (selectedType === 'multi' && flightSegments?.length > 0) {
            currentFromIata = flightSegments[0]?.fromLocation?.value;
            currentToIata =
              flightSegments[flightSegments.length - 1]?.toLocation?.value;
          } else if (selectedType === 'direct') {
            currentFromIata = directFlight?.fromLocation?.value;
            currentToIata = directFlight?.toLocation?.value;
          }
        }

        // Clear compensation if locations are missing
        if (!currentFromIata || !currentToIata) {
          setCompensationAmount(0);
          setCompensationError('Missing flight location data');
          setCompensationLoading(false);
          return;
        }

        // Check if locations have changed from cache
        const hasLocationsChanged =
          !compensationCache.flightData ||
          (selectedType === 'multi' &&
            (currentFromIata !==
              compensationCache.flightData.flightSegments?.[0]?.fromLocation
                ?.value ||
              currentToIata !==
                compensationCache.flightData.flightSegments?.[
                  compensationCache.flightData.flightSegments.length - 1
                ]?.toLocation?.value)) ||
          (selectedType === 'direct' &&
            (currentFromIata !==
              compensationCache.flightData.directFlight?.fromLocation?.value ||
              currentToIata !==
                compensationCache.flightData.directFlight?.toLocation?.value));

        // Clear cache if locations changed
        if (hasLocationsChanged) {
          useStore.getState().setCompensationCache({
            amount: 0,
            flightData: {
              selectedType,
              directFlight: null,
              flightSegments: [],
              selectedFlights: [],
            },
          });
          setCompensationAmount(0);
        }

        // Only show loading if we don't have data yet
        if (!compensationAmount) {
          setCompensationLoading(true);
        }

        const queryParams = new URLSearchParams({
          from_iata: currentFromIata,
          to_iata: currentToIata,
        });

        const response = await fetch(
          `/.netlify/functions/calculateCompensation?${queryParams}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to calculate compensation');
        }

        const data = await response.json();

        if (data.amount === 0 || data.amount === null) {
          throw new Error('No compensation amount available');
        }

        console.log('=== DEBUG: Compensation Calculation ===', {
          calculatedAmount: data.amount,
          timestamp: new Date().toISOString(),
        });

        // Update store with the compensation amount
        useStore.setState({ compensationAmount: data.amount });

        // Update cache with the latest flight data
        useStore.getState().setCompensationCache({
          amount: data.amount,
          flightData: {
            selectedType,
            directFlight: selectedType === 'direct' ? directFlight : null,
            flightSegments: selectedType === 'multi' ? flightSegments : [],
            selectedFlights,
          },
        });

        setCompensationAmount(data.amount);

        // Save to localStorage
        localStorage.setItem('compensationAmount', data.amount.toString());

        console.log('=== DEBUG: After Compensation Update ===', {
          storeAmount: useStore.getState().compensationAmount,
          localStorageAmount: localStorage.getItem('compensationAmount'),
          stateAmount: data.amount,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error calculating compensation:', error);
        setCompensationError(
          error instanceof Error
            ? error.message
            : 'Failed to calculate compensation'
        );
      } finally {
        setCompensationLoading(false);
      }
    };

    calculateCompensation();
  }, [selectedType, flightSegments, directFlight, selectedFlights]);

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Wait for any pending compensation calculations
      if (compensationLoading) {
        await new Promise((resolve) => {
          const checkLoading = setInterval(() => {
            if (!compensationLoading) {
              clearInterval(checkLoading);
              resolve(true);
            }
          }, 100);
        });
      }

      // Get the latest compensation amount from the store
      const compensationAmount = useStore.getState().compensationAmount;

      // Validate we have a compensation amount
      if (!compensationAmount) {
        console.error('No compensation amount available');
        throw new Error('No compensation amount available');
      }

      const dealId = sessionStorage.getItem('hubspot_deal_id');
      const personalDetails = useStore.getState().personalDetails;

      if (dealId) {
        console.log('Updating HubSpot deal with compensation:', {
          dealId,
          amount: compensationAmount,
          stage: '1173731568',
          personalDetails,
          timestamp: new Date().toISOString(),
        });

        try {
          const updateResponse = await fetch(
            '/.netlify/functions/hubspot-integration/deal',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId: sessionStorage.getItem('hubspot_contact_id'),
                dealId,
                amount: compensationAmount,
                action: 'update',
                stage: '1173731568',
                personalDetails,
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error('Failed to update deal amount:', errorText);
            throw new Error(`Failed to update deal: ${errorText}`);
          }

          const updateResult = await updateResponse.json();
          console.log('Successfully updated HubSpot deal:', updateResult);
        } catch (error) {
          console.error('Error updating HubSpot deal:', error);
          throw error;
        }
      }

      // Rest of your existing handleContinue code...
      const phase1Data = localStorage.getItem('phase1FlightData');
      let latestFromLocation = fromLocation;
      let latestToLocation = toLocation;
      let latestDirectFlight = directFlight;
      let latestSelectedType = selectedType;
      let latestFlightSegments = flightSegments;

      if (phase1Data) {
        try {
          const parsedPhase1Data = JSON.parse(phase1Data);
          if (parsedPhase1Data.fromLocation && parsedPhase1Data.toLocation) {
            latestFromLocation = parsedPhase1Data.fromLocation;
            latestToLocation = parsedPhase1Data.toLocation;
            latestDirectFlight = parsedPhase1Data.directFlight || null;
            latestSelectedType = parsedPhase1Data.selectedType || 'direct';
            latestFlightSegments = parsedPhase1Data.flightSegments || [];
          }
        } catch (e) {
          console.error('Error parsing phase 1 data:', e);
        }
      }

      // Process locations for phase 3 using the latest data
      const parsedLocationData = {
        fromLocation:
          typeof latestFromLocation === 'string'
            ? JSON.parse(latestFromLocation)
            : latestFromLocation,
        toLocation:
          typeof latestToLocation === 'string'
            ? JSON.parse(latestToLocation)
            : latestToLocation,
      };

      // Complete the current phase
      await completePhase(2);

      // Clear any stale data from localStorage
      localStorage.removeItem('phase3State');
      localStorage.removeItem('phase3FlightData');

      // Update store with latest data
      useStore.setState((state) => {
        const updatedSegments = latestFlightSegments.map((segment) => ({
          ...segment,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
          selectedFlight: segment.selectedFlight || null,
          date: segment.date || null,
        }));

        // Create new state with latest data
        const newState = {
          ...state,
          fromLocation: parsedLocationData.fromLocation,
          toLocation: parsedLocationData.toLocation,
          directFlight: latestDirectFlight,
          selectedType: latestSelectedType,
          flightSegments: updatedSegments,
          phase: 3,
          validationState: {
            ...state.validationState,
            isFlightValid: true,
            stepValidation: {
              ...state.validationState.stepValidation,
              2: true,
            },
            2: true,
            _timestamp: Date.now(),
          },
        };

        // Save both states with compensation amount
        localStorage.setItem(
          'phase2State',
          JSON.stringify({
            ...newState,
            phase: 2,
            compensationAmount,
          })
        );

        localStorage.setItem(
          'phase3State',
          JSON.stringify({
            ...newState,
            phase: 3,
            compensationAmount,
            validationState: {
              isFlightValid: true,
              stepValidation: {
                1: true,
                2: true,
              },
              1: true,
              2: true,
              _timestamp: Date.now(),
            },
          })
        );

        return newState;
      });

      // After state is updated, set the phase and navigate
      await setCurrentPhase(3);
      router.push(getLanguageAwareUrl('/phases/flight-details', lang));
      return;
    } catch (e) {
      console.error('Error during phase transition:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    const previousUrl = '/phases/initial-assessment';
    await setCurrentPhase(1);
    router.push(getLanguageAwareUrl(previousUrl, lang));
  };

  const getCityData = useCallback(
    async (segment: FlightSegment, index: number) => {
      if (!segment) {
        console.error(`=== Invalid segment data for index ${index} ===`);
        return {
          departureCity:
            t.phases.compensationEstimate.flightSummary.noFlightDetails,
          arrivalCity:
            t.phases.compensationEstimate.flightSummary.noFlightDetails,
        };
      }

      const fromDesc = segment.fromLocation?.description;
      const toDesc = segment.toLocation?.description;

      const [departureCity, arrivalCity] = await Promise.all([
        extractCityName(fromDesc).then(
          (city) =>
            city ||
            selectedFlights?.[index]?.departureCity ||
            t.phases.compensationEstimate.flightSummary.noFlightDetails
        ),
        extractCityName(toDesc).then(
          (city) =>
            city ||
            selectedFlights?.[index]?.arrivalCity ||
            t.phases.compensationEstimate.flightSummary.noFlightDetails
        ),
      ]);

      return { departureCity, arrivalCity };
    },
    [t.phases.compensationEstimate.flightSummary.noFlightDetails]
  );

  // Update the memoized city data to handle async
  const [cityData, setCityData] = useState<
    Array<{
      departureCity: string;
      arrivalCity: string;
    }>
  >([]);

  useEffect(() => {
    const loadCityData = async () => {
      const cityDataPromises = flightSegments.map((segment, index) =>
        getCityData(segment, index)
      );
      const resolvedCityData = await Promise.all(cityDataPromises);
      setCityData(resolvedCityData);
    };

    loadCityData();
  }, [flightSegments, getCityData]);

  if (!mounted) {
    return null;
  }

  return (
    <PhaseGuard phase={2}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation
          currentPhase={currentPhase}
          completedPhases={completedPhases}
        />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message={t.phases.compensationEstimate.description} />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.flightSummary.title}
              </h2>
              <div className="space-y-4">
                {personalDetails && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-gray-600">
                      {t.phases.compensationEstimate.flightSummary.passenger}
                    </p>
                    <p className="font-medium">
                      {personalDetails.firstName} {personalDetails.lastName}
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  {selectedType === 'direct' ? (
                    <>
                      <div>
                        <p className="text-gray-600">
                          {t.phases.compensationEstimate.flightSummary.from}
                        </p>
                        <AsyncCityName
                          cityData={{
                            selectedFlightCity:
                              directFlight?.selectedFlight?.departureCity,
                            locationDesc: (
                              directFlight?.fromLocation as LocationData
                            )?.description,
                            dropdownLabel: (
                              directFlight?.fromLocation as LocationData
                            )?.dropdownLabel,
                            locationCity: (
                              directFlight?.fromLocation as LocationData
                            )?.city,
                            departure: directFlight?.selectedFlight?.departure,
                            value: (directFlight?.fromLocation as LocationData)
                              ?.value,
                          }}
                          fallback={
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails
                          }
                        />
                      </div>
                      <div>
                        <p className="text-gray-600">
                          {t.phases.compensationEstimate.flightSummary.to}
                        </p>
                        <AsyncCityName
                          cityData={{
                            selectedFlightCity:
                              directFlight?.selectedFlight?.arrivalCity,
                            locationDesc: (
                              directFlight?.toLocation as LocationData
                            )?.description,
                            dropdownLabel: (
                              directFlight?.toLocation as LocationData
                            )?.dropdownLabel,
                            locationCity: (
                              directFlight?.toLocation as LocationData
                            )?.city,
                            arrival: directFlight?.selectedFlight?.arrival,
                            value: (directFlight?.toLocation as LocationData)
                              ?.value,
                          }}
                          fallback={
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails
                          }
                        />
                      </div>
                    </>
                  ) : selectedType === 'multi' ? (
                    flightSegments.map(
                      (segment: FlightSegment, segmentIndex: number) => {
                        if (!segment) return null;

                        const { departureCity, arrivalCity } = cityData[
                          segmentIndex
                        ] || {
                          departureCity:
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails,
                          arrivalCity:
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails,
                        };

                        return (
                          <div
                            key={segmentIndex}
                            className="pb-4 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-gray-600 font-medium mb-2">
                              {
                                t.phases.compensationEstimate.flightSummary
                                  .flight
                              }{' '}
                              {segmentIndex + 1}
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-gray-600">
                                  {
                                    t.phases.compensationEstimate.flightSummary
                                      .from
                                  }
                                </p>
                                <p className="font-medium">{departureCity}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  {
                                    t.phases.compensationEstimate.flightSummary
                                      .to
                                  }
                                </p>
                                <p className="font-medium">{arrivalCity}</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    )
                  ) : (
                    <p>
                      {
                        t.phases.compensationEstimate.flightSummary
                          .noFlightDetails
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.estimatedCompensation.title}
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {compensationLoading
                  ? t.phases.compensationEstimate.estimatedCompensation
                      .calculating
                  : compensationError
                    ? compensationError
                    : typeof compensationAmount === 'number'
                      ? `€${compensationAmount}`
                      : t.phases.compensationEstimate.flightSummary
                          .noFlightDetails}
              </div>
              <p className="text-gray-600 mt-2">
                {t.phases.compensationEstimate.estimatedCompensation.disclaimer}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                {t.phases.compensationEstimate.nextSteps.title}
              </h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      {t.phases.compensationEstimate.nextSteps.step1.title}
                    </h3>
                    <p className="text-gray-600">
                      {
                        t.phases.compensationEstimate.nextSteps.step1
                          .description
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      {t.phases.compensationEstimate.nextSteps.step2.title}
                    </h3>
                    <p className="text-gray-600">
                      {
                        t.phases.compensationEstimate.nextSteps.step2
                          .description
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      {t.phases.compensationEstimate.nextSteps.step3.title}
                    </h3>
                    <p className="text-gray-600">
                      {
                        t.phases.compensationEstimate.nextSteps.step3
                          .description
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <BackButton
                onClick={handleBack}
                text={t.phases.compensationEstimate.navigation.back}
              />
              <ContinueButton
                onClick={handleContinue}
                isLoading={isLoading}
                text={t.phases.compensationEstimate.navigation.continue}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
