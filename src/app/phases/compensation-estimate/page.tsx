'use client';

import React, { useState, useEffect, useRef } from 'react';
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

        // Get initial state
        const currentState = useStore.getState();
        console.log('=== Compensation Estimate Page Initialization ===', {
          bookingNumber: currentState.bookingNumber,
          selectedFlights: currentState.selectedFlights.length,
          flightStoreFlights: flightStore.selectedFlights.length,
          mainStoreState: {
            selectedType: currentState.selectedType,
            directFlight: currentState.directFlight
              ? {
                  selectedFlight: currentState.directFlight.selectedFlight,
                  fromLocation: currentState.directFlight.fromLocation,
                  toLocation: currentState.directFlight.toLocation,
                }
              : null,
            flightSegments: currentState.flightSegments?.length || 0,
          },
        });

        // First try to restore from phase 1
        const phase1Data = localStorage.getItem('phase1FlightData');
        if (phase1Data) {
          try {
            const parsedPhase1Data = JSON.parse(phase1Data);
            if (
              parsedPhase1Data.timestamp &&
              Date.now() - parsedPhase1Data.timestamp < 300000
            ) {
              // Use phase 1 data as fallback
              const stateToUse = {
                selectedFlights: parsedPhase1Data.selectedFlights || [],
                flightSegments: parsedPhase1Data.flightSegments || [],
                directFlight: parsedPhase1Data.directFlight || null,
                selectedType: parsedPhase1Data.selectedType || 'direct',
                fromLocation: parsedPhase1Data.fromLocation || null,
                toLocation: parsedPhase1Data.toLocation || null,
                timestamp: Date.now(),
              };

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
            const timestamp = parsedData.timestamp || Date.now();
            const isDataFresh = Date.now() - timestamp < 300000; // 5 minutes

            if (isDataFresh) {
              console.log(
                '=== Restoring fresh flight data from localStorage ===',
                {
                  ...parsedData,
                  directFlightDetails: parsedData.directFlight
                    ? {
                        selectedFlight: parsedData.directFlight.selectedFlight,
                        fromLocation: parsedData.directFlight.fromLocation,
                        toLocation: parsedData.directFlight.toLocation,
                      }
                    : null,
                  selectedFlightsCount: parsedData.selectedFlights?.length || 0,
                }
              );

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
              if (parsedData.flightSegments?.length > 0) {
                const processedSegments = parsedData.flightSegments.map(
                  (segment: FlightSegment) => ({
                    ...segment,
                    fromLocation: segment.fromLocation || null,
                    toLocation: segment.toLocation || null,
                    date: segment.date ? new Date(segment.date) : null,
                    selectedFlight: segment.selectedFlight || null,
                  })
                );

                stateUpdates.push(
                  new Promise<void>((resolve) => {
                    useStore.setState((state) => ({
                      ...state,
                      flightSegments: processedSegments,
                    }));
                    resolve();
                  })
                );
              }

              // Update direct flight if available
              if (parsedData.directFlight?.selectedFlight) {
                stateUpdates.push(
                  new Promise<void>((resolve) => {
                    useStore.setState((state) => ({
                      ...state,
                      directFlight: {
                        ...parsedData.directFlight,
                        fromLocation: parsedData.directFlight.fromLocation,
                        toLocation: parsedData.directFlight.toLocation,
                      },
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
      console.log('=== Calculating Compensation ===', {
        selectedType,
        directFlight,
        flightSegments,
        selectedFlights,
        routeInfo,
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
            fromLocationData =
              typeof fromLocation === 'string'
                ? JSON.parse(fromLocation)
                : fromLocation;
          }
          if (!toLocationData && toLocation) {
            toLocationData =
              typeof toLocation === 'string'
                ? JSON.parse(toLocation)
                : toLocation;
          }

          currentFromIata = fromLocationData?.value;
          currentToIata = toLocationData?.value;
        } catch (error) {
          console.error('Error parsing location data:', error);
        }
      } else {
        // Multi-segment flight
        currentFromIata = flightSegments[0]?.fromLocation?.value;
        currentToIata =
          flightSegments[flightSegments.length - 1]?.toLocation?.value;
      }

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
      // Get latest state
      const currentState = useStore.getState();
      console.log('=== Starting Phase Transition ===', {
        selectedType: currentState.selectedType,
        directFlight: currentState.directFlight,
        selectedFlights: currentState.selectedFlights?.length || 0,
        flightSegments: currentState.flightSegments?.length || 0,
      });

      // Phase 2 validation - only check for locations
      const isValid =
        currentState.selectedType === 'multi'
          ? currentState.flightSegments.length >= 2 &&
            currentState.flightSegments.every(
              (segment) => segment.fromLocation && segment.toLocation
            )
          : !!(
              currentState.directFlight?.fromLocation &&
              currentState.directFlight?.toLocation
            );

      if (!isValid) {
        console.error('Invalid flight data state during transition');
        return;
      }

      // Step 1: Prepare complete state data
      const completeStateData = {
        selectedType: currentState.selectedType,
        flightSegments:
          currentState.flightSegments?.map((segment) => ({
            fromLocation: segment.fromLocation || null,
            toLocation: segment.toLocation || null,
            date: segment.date ? new Date(segment.date) : null,
            selectedFlight: segment.selectedFlight || null,
          })) || [],
        directFlight: currentState.directFlight
          ? {
              selectedFlight: currentState.directFlight.selectedFlight || null,
              fromLocation: currentState.directFlight.fromLocation || null,
              toLocation: currentState.directFlight.toLocation || null,
              date: currentState.directFlight.date
                ? new Date(currentState.directFlight.date)
                : null,
            }
          : null,
        selectedFlights:
          currentState.selectedFlights?.filter((f) => f !== null) || [],
        validationState: {
          ...currentState.validationState,
          isFlightValid: true,
          stepValidation: {
            ...currentState.validationState.stepValidation,
            2: true,
          },
          2: true,
          _timestamp: Date.now(),
        },
        fromLocation:
          currentState.directFlight?.fromLocation ||
          currentState.flightSegments?.[0]?.fromLocation ||
          null,
        toLocation:
          currentState.directFlight?.toLocation ||
          currentState.flightSegments?.[0]?.toLocation ||
          null,
        timestamp: Date.now(),
      };

      // Step 2: Save state to localStorage before any updates
      localStorage.setItem(
        'phase2FlightData',
        JSON.stringify(completeStateData)
      );

      // Ensure we have at least 2 segments for multi-city in phase 3
      const phase3StateData = {
        ...completeStateData,
        flightSegments:
          completeStateData.selectedType === 'multi'
            ? completeStateData.flightSegments.length >= 2
              ? completeStateData.flightSegments
              : [
                  ...completeStateData.flightSegments,
                  {
                    fromLocation: null,
                    toLocation: null,
                    selectedFlight: null,
                    date: null,
                  },
                ]
            : completeStateData.flightSegments,
        compensationAmount: useStore.getState().compensationAmount,
        compensationCache: useStore.getState().compensationCache,
        bookingNumber: useStore.getState().bookingNumber,
        timestamp: Date.now(),
      };

      localStorage.setItem('phase3FlightData', JSON.stringify(phase3StateData));

      // Step 3: Update flight store
      if (completeStateData.selectedFlights.length > 0) {
        await flightStore.setSelectedFlights(completeStateData.selectedFlights);
        await flightStore.setOriginalFlights(completeStateData.selectedFlights);
      }

      // Step 4: Update main store
      await new Promise<void>((resolve) => {
        useStore.setState((state) => ({
          ...state,
          selectedType: completeStateData.selectedType,
          flightSegments: phase3StateData.flightSegments, // Use phase3 segments
          directFlight: completeStateData.directFlight || undefined,
          selectedFlights: completeStateData.selectedFlights,
          validationState: completeStateData.validationState,
          compensationAmount: phase3StateData.compensationAmount,
          compensationCache: phase3StateData.compensationCache,
          bookingNumber: phase3StateData.bookingNumber,
        }));
        resolve();
      });

      // Step 5: Complete current phase
      await completePhase(2);

      console.log('=== Phase Transition Complete ===', {
        selectedType: completeStateData.selectedType,
        directFlight: completeStateData.directFlight,
        selectedFlights: completeStateData.selectedFlights.length,
        flightSegments: completeStateData.flightSegments.length,
      });

      // Step 6: Set next phase and navigate
      await setCurrentPhase(3);
      router.push(getLanguageAwareUrl('/phases/flight-details', lang));
    } catch (error) {
      console.error('Error during phase transition:', error);
      await setCurrentPhase(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    const previousUrl = '/phases/initial-assessment';
    await setCurrentPhase(1);
    router.push(getLanguageAwareUrl(previousUrl, lang));
  };

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
                                fromCityData.locationCity ||
                                fromCityData.departure ||
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
                              ? extractCityName(
                                  toCityData.dropdownLabel.split('(')[0].trim()
                                )
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
                    flightSegments.map((segment, index) => {
                      if (!segment) return null;
                      const fromLocation = segment.fromLocation as LocationData;
                      const toLocation = segment.toLocation as LocationData;
                      const selectedFlight = segment.selectedFlight;

                      const departureCityData = {
                        selectedFlightCity: selectedFlight?.departureCity,
                        locationDesc: fromLocation?.description,
                        dropdownLabel: fromLocation?.dropdownLabel,
                        locationCity: fromLocation?.city,
                        departure: selectedFlight?.departure,
                        value: fromLocation?.value,
                      };

                      const arrivalCityData = {
                        selectedFlightCity: selectedFlight?.arrivalCity,
                        locationDesc: toLocation?.description,
                        dropdownLabel: toLocation?.dropdownLabel,
                        locationCity: toLocation?.city,
                        arrival: selectedFlight?.arrival,
                        value: toLocation?.value,
                      };

                      console.log('=== Multi Segment City Data ===', {
                        departureCityData,
                        arrivalCityData,
                      });

                      // Extract city name from airport description
                      const extractCityName = (desc: string) => {
                        if (!desc) return null;
                        // Remove "International Airport" and similar suffixes
                        return desc
                          .replace(/ International Airport| Airport/g, '')
                          .trim();
                      };

                      // Try to get city name from description first if it exists
                      const departureCity = departureCityData.locationDesc
                        ? extractCityName(departureCityData.locationDesc)
                        : departureCityData.dropdownLabel
                          ? extractCityName(
                              departureCityData.dropdownLabel
                                .split('(')[0]
                                .trim()
                            )
                          : departureCityData.selectedFlightCity ||
                            departureCityData.locationCity ||
                            departureCityData.departure ||
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails;

                      const arrivalCity = arrivalCityData.locationDesc
                        ? extractCityName(arrivalCityData.locationDesc)
                        : arrivalCityData.dropdownLabel
                          ? extractCityName(
                              arrivalCityData.dropdownLabel.split('(')[0].trim()
                            )
                          : arrivalCityData.selectedFlightCity ||
                            arrivalCityData.locationCity ||
                            arrivalCityData.arrival ||
                            t.phases.compensationEstimate.flightSummary
                              .noFlightDetails;

                      return (
                        <div
                          key={index}
                          className="pb-4 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-gray-600 font-medium mb-2">
                            {t.phases.compensationEstimate.flightSummary.flight}{' '}
                            {index + 1}
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
                                {t.phases.compensationEstimate.flightSummary.to}
                              </p>
                              <p className="font-medium">{arrivalCity}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
