'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
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

  useEffect(() => {
    if (isInitialized.current || initializationLock.current) return;
    initializationLock.current = true;

    const initializePhase = async () => {
      try {
        // First ensure we're in the correct phase
        await setCurrentPhase(2);

        // Try to restore from phase 1 first
        const phase1Data = localStorage.getItem('phase1FlightData');
        if (phase1Data) {
          try {
            const parsedPhase1Data = JSON.parse(phase1Data);
            console.log('=== DEBUG: Phase 1 Data ===', {
              fromLocation: parsedPhase1Data.fromLocation,
              toLocation: parsedPhase1Data.toLocation,
              directFlight: parsedPhase1Data.directFlight,
              selectedType: parsedPhase1Data.selectedType,
              flightSegments: parsedPhase1Data.flightSegments,
              timestamp: new Date().toISOString(),
            });

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

      setRouteInfo({
        departure: from.value,
        arrival: to.value,
        departureCity: fromCity,
        arrivalCity: toCity,
      });
    } catch (error) {}
  }, [fromLocation, toLocation]);

  useEffect(() => {
    const calculateCompensation = async () => {
      console.log('=== DEBUG: Calculate Compensation Start ===', {
        fromLocation,
        toLocation,
        directFlight: directFlight
          ? {
              fromLocation: directFlight.fromLocation,
              toLocation: directFlight.toLocation,
            }
          : null,
        selectedType,
        timestamp: new Date().toISOString(),
      });

      // First try to get location data
      let currentFromIata, currentToIata;

      if (selectedType === 'direct') {
        try {
          // First try to get location from directFlight
          let fromLocationData = directFlight?.fromLocation;
          let toLocationData = directFlight?.toLocation;

          // If not in directFlight, try parsing from stored location
          if (!fromLocationData && fromLocation) {
            try {
              fromLocationData =
                typeof fromLocation === 'string'
                  ? JSON.parse(fromLocation)
                  : fromLocation;
            } catch (e) {
              console.error('Error parsing fromLocation:', e);
              if (typeof fromLocation === 'object' && fromLocation !== null) {
                fromLocationData = fromLocation;
              }
            }
          }
          if (!toLocationData && toLocation) {
            try {
              toLocationData =
                typeof toLocation === 'string'
                  ? JSON.parse(toLocation)
                  : toLocation;
            } catch (e) {
              console.error('Error parsing toLocation:', e);
              if (typeof toLocation === 'object' && toLocation !== null) {
                toLocationData = toLocation;
              }
            }
          }

          // Get IATA codes from location data
          currentFromIata = fromLocationData?.value;
          currentToIata = toLocationData?.value;

          // If we still don't have IATA codes, try getting them from the flight data
          if (!currentFromIata && selectedFlights?.length > 0) {
            currentFromIata = selectedFlights[0].departureCity;
          }
          if (!currentToIata && selectedFlights?.length > 0) {
            currentToIata = selectedFlights[0].arrivalCity;
          }
        } catch (error) {
          console.error('Error parsing location data:', error);
        }
      } else {
        // Multi-segment flight
        try {
          if (flightSegments?.length > 0) {
            const firstSegment = flightSegments[0];
            const lastSegment = flightSegments[flightSegments.length - 1];

            // Get origin from first segment
            if (firstSegment?.fromLocation) {
              try {
                const fromLocationData =
                  typeof firstSegment.fromLocation === 'string'
                    ? JSON.parse(firstSegment.fromLocation)
                    : firstSegment.fromLocation;

                // Try multiple ways to get the IATA code
                currentFromIata = fromLocationData?.value;

                // If still not found, try getting from city data
                if (!currentFromIata && fromLocationData?.city) {
                  currentFromIata = fromLocationData.city;
                }

                console.log('=== DEBUG: First Segment From Location ===', {
                  fromLocationData,
                  parsedIata: currentFromIata,
                  raw: firstSegment.fromLocation,
                });
              } catch (e) {
                console.error('Error parsing first segment fromLocation:', e);
                // Try to get directly from the object if parsing failed
                if (
                  typeof firstSegment.fromLocation === 'object' &&
                  firstSegment.fromLocation !== null
                ) {
                  currentFromIata = firstSegment.fromLocation.value;
                }
              }
            }

            // Get destination from last segment
            if (lastSegment?.toLocation) {
              try {
                const toLocationData =
                  typeof lastSegment.toLocation === 'string'
                    ? JSON.parse(lastSegment.toLocation)
                    : lastSegment.toLocation;

                // Try multiple ways to get the IATA code
                currentToIata = toLocationData?.value;

                // If still not found, try getting from city data
                if (!currentToIata && toLocationData?.city) {
                  currentToIata = toLocationData.city;
                }

                console.log('=== DEBUG: Last Segment To Location ===', {
                  toLocationData,
                  parsedIata: currentToIata,
                  raw: lastSegment.toLocation,
                });
              } catch (e) {
                console.error('Error parsing last segment toLocation:', e);
                // Try to get directly from the object if parsing failed
                if (
                  typeof lastSegment.toLocation === 'object' &&
                  lastSegment.toLocation !== null
                ) {
                  currentToIata = lastSegment.toLocation.value;
                }
              }
            }

            // If still not found, try using fromLocation/toLocation from the state
            if (!currentFromIata && fromLocation) {
              try {
                const fromLocationData =
                  typeof fromLocation === 'string'
                    ? JSON.parse(fromLocation)
                    : fromLocation;
                currentFromIata = fromLocationData?.value;
              } catch (e) {
                console.error('Error parsing fromLocation fallback:', e);
              }
            }

            if (!currentToIata && toLocation) {
              try {
                const toLocationData =
                  typeof toLocation === 'string'
                    ? JSON.parse(toLocation)
                    : toLocation;
                currentToIata = toLocationData?.value;
              } catch (e) {
                console.error('Error parsing toLocation fallback:', e);
              }
            }

            // Try to get from selected flights if still not found
            if (!currentFromIata && selectedFlights?.length > 0) {
              currentFromIata = selectedFlights[0].departureCity;
            }
            if (!currentToIata && selectedFlights?.length > 0) {
              currentToIata =
                selectedFlights[selectedFlights.length - 1].arrivalCity;
            }

            console.log('=== DEBUG: Multi-segment Location Data ===', {
              firstSegment: {
                fromLocation: firstSegment.fromLocation,
              },
              lastSegment: {
                toLocation: lastSegment.toLocation,
              },
              timestamp: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('Error handling multi-segment location data:', error);
        }
      }

      console.log('=== DEBUG: Final Location Data for Compensation ===', {
        selectedType,
        currentFromIata,
        currentToIata,
        flightSegments:
          flightSegments?.length > 0
            ? {
                firstSegment: {
                  fromLocation: flightSegments[0].fromLocation,
                },
                lastSegment: {
                  toLocation:
                    flightSegments[flightSegments.length - 1].toLocation,
                },
              }
            : null,
        timestamp: new Date().toISOString(),
      });

      // Check if we have a valid cache for these locations
      if (
        !shouldRecalculateCompensation() &&
        compensationCache.amount !== null &&
        compensationCache.flightData &&
        currentFromIata &&
        currentToIata
      ) {
        // For direct flights, check if the cached locations match
        if (
          selectedType === 'direct' &&
          compensationCache.flightData.directFlight
        ) {
          const cachedFromIata =
            compensationCache.flightData.directFlight.fromLocation?.value;
          const cachedToIata =
            compensationCache.flightData.directFlight.toLocation?.value;

          if (
            cachedFromIata === currentFromIata &&
            cachedToIata === currentToIata
          ) {
            console.log('=== Using Cached Compensation (Direct) ===', {
              amount: compensationCache.amount,
              fromIata: cachedFromIata,
              toIata: cachedToIata,
            });
            setCompensationAmount(compensationCache.amount);
            return;
          }
        }

        // For multi-segment flights, check if the cached locations match
        if (
          selectedType === 'multi' &&
          compensationCache.flightData.flightSegments.length > 0
        ) {
          const cachedFromIata =
            compensationCache.flightData.flightSegments[0]?.fromLocation?.value;
          const cachedToIata =
            compensationCache.flightData.flightSegments[
              compensationCache.flightData.flightSegments.length - 1
            ]?.toLocation?.value;

          if (
            cachedFromIata === currentFromIata &&
            cachedToIata === currentToIata
          ) {
            console.log('=== Using Cached Compensation (Multi) ===', {
              amount: compensationCache.amount,
              fromIata: cachedFromIata,
              toIata: cachedToIata,
            });
            setCompensationAmount(compensationCache.amount);
            return;
          }
        }
      }

      setCompensationLoading(true);
      setCompensationError(null);

      try {
        if (!currentFromIata || !currentToIata) {
          throw new Error(
            'Missing origin or destination for compensation calculation'
          );
        }

        const flightData = {
          from_iata: currentFromIata,
          to_iata: currentToIata,
          date:
            selectedType === 'direct'
              ? directFlight?.date
              : flightSegments[0]?.date,
        };

        console.log('=== Calculating New Compensation ===', flightData);

        const queryParams = new URLSearchParams({
          from_iata: flightData.from_iata,
          to_iata: flightData.to_iata,
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

        useStore.getState().setCompensationCache({
          amount: data.amount,
          flightData: {
            selectedType,
            directFlight:
              selectedType === 'direct'
                ? {
                    fromLocation: directFlight?.fromLocation || null,
                    toLocation: directFlight?.toLocation || null,
                    date: directFlight?.date || null,
                    selectedFlight: directFlight?.selectedFlight || null,
                  }
                : null,
            flightSegments:
              selectedType === 'multi'
                ? flightSegments.map((segment) => ({
                    fromLocation: segment.fromLocation,
                    toLocation: segment.toLocation,
                    date: segment.date,
                    selectedFlight: segment.selectedFlight,
                  }))
                : [],
            selectedFlights,
          },
        });

        setCompensationAmount(data.amount);
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

    const hasMultiSegmentData =
      selectedType === 'multi' &&
      flightSegments?.length > 0 &&
      flightSegments[0]?.fromLocation?.value &&
      flightSegments[flightSegments.length - 1]?.toLocation?.value;

    const hasDirectFlightData =
      selectedType === 'direct' &&
      ((selectedFlights?.length > 0 && selectedFlights[0] !== null) ||
        (directFlight?.fromLocation?.value && directFlight?.toLocation?.value));

    if (hasMultiSegmentData || hasDirectFlightData || routeInfo) {
      calculateCompensation();
    }
  }, [
    selectedFlights,
    selectedType,
    routeInfo,
    directFlight,
    flightSegments,
    setCompensationAmount,
    setCompensationLoading,
    setCompensationError,
    shouldRecalculateCompensation,
    compensationCache.amount,
  ]);

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Process locations for phase 3
      const parsedLocationData = {
        fromLocation:
          typeof fromLocation === 'string'
            ? JSON.parse(fromLocation)
            : fromLocation,
        toLocation:
          typeof toLocation === 'string' ? JSON.parse(toLocation) : toLocation,
      };

      // First complete the current phase
      await completePhase(2);

      // Update store with parsed data and processed segments
      useStore.setState((state) => {
        const updatedSegments = flightSegments.map((segment) => ({
          ...segment,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
          selectedFlight: segment.selectedFlight || null,
          date: segment.date || null,
        }));

        // Save the current state before phase transition
        const currentState = {
          ...state,
          flightSegments: updatedSegments,
          fromLocation: parsedLocationData.fromLocation,
          toLocation: parsedLocationData.toLocation,
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

        // Save to localStorage before phase transition
        localStorage.setItem('phase2State', JSON.stringify(currentState));

        // Save the current state to phase 3 initial state
        const phase3InitialState = {
          ...currentState,
          phase: 3,
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
        };

        localStorage.setItem('phase3State', JSON.stringify(phase3InitialState));

        return currentState;
      });

      // After state is updated, set the phase and navigate
      await setCurrentPhase(3);
      router.push(getLanguageAwareUrl('/phases/flight-details', lang));
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
    (segment: FlightSegment, index: number) => {
      // First try to get from phase 1 data
      const phase1Data = localStorage.getItem('phase1FlightData');
      const phase1State = localStorage.getItem('phase1State');
      let phase1Segment = null;
      let phase1Flight = null;

      if (!segment) {
        console.error(`=== Invalid segment data for index ${index} ===`);
        return {
          departureCity:
            t.phases.compensationEstimate.flightSummary.noFlightDetails,
          arrivalCity:
            t.phases.compensationEstimate.flightSummary.noFlightDetails,
        };
      }

      console.log(`=== Getting City Data for Segment ${index + 1} ===`, {
        rawSegment: segment,
        phase1DataExists: !!phase1Data,
        phase1StateExists: !!phase1State,
      });

      // Try to get data from phase1State first
      if (phase1State) {
        try {
          const parsedPhase1State = JSON.parse(phase1State);
          if (parsedPhase1State.flightSegments?.length > index) {
            phase1Segment = parsedPhase1State.flightSegments[index];
            console.log(
              `=== Found Phase 1 State Segment ${index + 1} ===`,
              phase1Segment
            );
          }
          if (parsedPhase1State.selectedFlights?.length > index) {
            phase1Flight = parsedPhase1State.selectedFlights[index];
            console.log(
              `=== Found Phase 1 State Flight ${index + 1} ===`,
              phase1Flight
            );
          }
        } catch (e) {
          console.error('Error parsing phase 1 state:', e);
        }
      }

      // If not found in phase1State, try phase1FlightData
      if (!phase1Segment && !phase1Flight && phase1Data) {
        try {
          const parsedPhase1 = JSON.parse(phase1Data);
          if (parsedPhase1.flightSegments?.length > index) {
            phase1Segment = parsedPhase1.flightSegments[index];
            console.log(
              `=== Found Phase 1 Data Segment ${index + 1} ===`,
              phase1Segment
            );
          }
          if (parsedPhase1.selectedFlights?.length > index) {
            phase1Flight = parsedPhase1.selectedFlights[index];
            console.log(
              `=== Found Phase 1 Data Flight ${index + 1} ===`,
              phase1Flight
            );
          }
        } catch (e) {
          console.error('Error parsing phase 1 data:', e);
        }
      }

      // Process locations with better error handling
      let fromLocation = segment.fromLocation;
      let toLocation = segment.toLocation;
      let selectedFlight = segment.selectedFlight;

      // Try phase 1 segment locations first
      if (phase1Segment) {
        if (!fromLocation && phase1Segment.fromLocation) {
          try {
            fromLocation =
              typeof phase1Segment.fromLocation === 'string'
                ? JSON.parse(phase1Segment.fromLocation)
                : phase1Segment.fromLocation;
            console.log(
              `=== Parsed Phase 1 fromLocation for Segment ${index + 1} ===`,
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
              `=== Parsed Phase 1 toLocation for Segment ${index + 1} ===`,
              toLocation
            );
          } catch (e) {
            console.error(
              `Error parsing phase 1 toLocation for segment ${index + 1}:`,
              e
            );
          }
        }

        if (!selectedFlight && phase1Segment.selectedFlight) {
          selectedFlight = phase1Segment.selectedFlight;
          console.log(
            `=== Using Phase 1 selectedFlight for Segment ${index + 1} ===`,
            selectedFlight
          );
        }
      }

      // If still not found, try phase 1 flight data
      if (phase1Flight) {
        if (!fromLocation && phase1Flight.departureCity) {
          fromLocation = {
            value: phase1Flight.departureCity,
            label: phase1Flight.departureCity,
            description:
              phase1Flight.departureAirport || phase1Flight.departureCity,
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
              phase1Flight.arrivalAirport || phase1Flight.arrivalCity,
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

      // Parse locations if they're strings
      if (typeof fromLocation === 'string') {
        try {
          fromLocation = JSON.parse(fromLocation);
          console.log(
            `=== Parsed fromLocation string for Segment ${index + 1} ===`,
            fromLocation
          );
        } catch (e) {
          console.error(
            `Error parsing fromLocation string for segment ${index + 1}:`,
            e
          );
        }
      }

      if (typeof toLocation === 'string') {
        try {
          toLocation = JSON.parse(toLocation);
          console.log(
            `=== Parsed toLocation string for Segment ${index + 1} ===`,
            toLocation
          );
        } catch (e) {
          console.error(
            `Error parsing toLocation string for segment ${index + 1}:`,
            e
          );
        }
      }

      // Extract city names with better fallback handling
      const extractCityName = (location: any) => {
        if (!location) return null;

        // Try different ways to get the city name
        const cityName =
          location.city ||
          (location.description &&
            location.description
              .replace(/ International Airport| Airport/g, '')
              .trim()) ||
          (location.dropdownLabel &&
            location.dropdownLabel.split('(')[0].trim()) ||
          location.label ||
          location.value;

        console.log(`=== Extracted City Name for Segment ${index + 1} ===`, {
          location,
          extractedName: cityName,
        });

        return cityName;
      };

      const departureCity =
        extractCityName(fromLocation) ||
        selectedFlight?.departureCity ||
        t.phases.compensationEstimate.flightSummary.noFlightDetails;

      const arrivalCity =
        extractCityName(toLocation) ||
        selectedFlight?.arrivalCity ||
        t.phases.compensationEstimate.flightSummary.noFlightDetails;

      console.log(`=== Final City Data for Segment ${index + 1} ===`, {
        departureCity,
        arrivalCity,
        fromLocation,
        toLocation,
        selectedFlight,
      });

      return { departureCity, arrivalCity };
    },
    [t.phases.compensationEstimate.flightSummary.noFlightDetails]
  );

  // Memoize the city data for each segment
  const memoizedCityData = useMemo(() => {
    return flightSegments.map((segment, index) => getCityData(segment, index));
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
                        {(() => {
                          const fromCityData = {
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
                          };

                          console.log('=== From City Data ===', fromCityData);

                          // Extract city name from airport description
                          const extractCityName = (desc: string) => {
                            if (!desc) return null;
                            // Remove "International Airport" and similar suffixes
                            return desc
                              .replace(/ International Airport| Airport/g, '')
                              .trim();
                          };

                          // Try to get city name from description first if it exists
                          const cityName = fromCityData.locationDesc
                            ? extractCityName(fromCityData.locationDesc)
                            : fromCityData.dropdownLabel
                              ? extractCityName(
                                  fromCityData.dropdownLabel
                                    .split('(')[0]
                                    .trim()
                                )
                              : fromCityData.selectedFlightCity ||
                                  fromCityData.locationCity
                                ? fromCityData.locationCity
                                : fromCityData.departure ||
                                  t.phases.compensationEstimate.flightSummary
                                    .noFlightDetails;

                          return <p className="font-medium">{cityName}</p>;
                        })()}
                      </div>
                      <div>
                        <p className="text-gray-600">
                          {t.phases.compensationEstimate.flightSummary.to}
                        </p>
                        {(() => {
                          const toCityData = {
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
                          };

                          console.log('=== To City Data ===', toCityData);

                          // Extract city name from airport description
                          const extractCityName = (desc: string) => {
                            if (!desc) return null;
                            // Remove "International Airport" and similar suffixes
                            return desc
                              .replace(/ International Airport| Airport/g, '')
                              .trim();
                          };

                          // Try to get city name from description first if it exists
                          const cityName = toCityData.locationDesc
                            ? extractCityName(toCityData.locationDesc)
                            : toCityData.dropdownLabel
                              ? extractCityName(toCityData.dropdownLabel)
                              : toCityData.selectedFlightCity ||
                                toCityData.locationCity ||
                                toCityData.arrival ||
                                t.phases.compensationEstimate.flightSummary
                                  .noFlightDetails;

                          return <p className="font-medium">{cityName}</p>;
                        })()}
                      </div>
                    </>
                  ) : selectedType === 'multi' ? (
                    flightSegments.map(
                      (segment: FlightSegment, segmentIndex: number) => {
                        if (!segment) return null;

                        const { departureCity, arrivalCity } =
                          memoizedCityData[segmentIndex];

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
