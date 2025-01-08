'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import type { LocationData } from '@/types/store';

type RouteInfo = {
  departureCity: string;
  arrivalCity: string;
  departure: string;
  arrival: string;
};

export default function CompensationEstimatePage() {
  const router = useRouter();
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
    goToPreviousPhase,
    selectedType,
    selectedFlights,
    shouldRecalculateCompensation,
    compensationCache,
    directFlight,
    flightSegments,
  } = useStore();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentPhase(2);
    completePhase(1);

    // Debug log the state
    console.log('Flight State:', {
      selectedType,
      directFlight,
      flightSegments,
      selectedFlights,
    });
  }, [
    setCurrentPhase,
    completePhase,
    selectedType,
    directFlight,
    flightSegments,
    selectedFlights,
  ]);

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
      // Check if we need to recalculate
      if (
        !shouldRecalculateCompensation() &&
        compensationCache.amount !== null
      ) {
        setCompensationAmount(compensationCache.amount);
        return;
      }

      setCompensationLoading(true);
      setCompensationError(null);

      try {
        let flightData;

        // First try to get flight data from selectedFlights
        if (
          selectedFlights?.length > 0 &&
          selectedFlights.some((flight) => flight !== null)
        ) {
          const validFlights = selectedFlights.filter(
            (flight) => flight !== null
          );
          flightData =
            selectedType === 'direct'
              ? validFlights[0]
              : validFlights[validFlights.length - 1];
        }
        // If no valid selectedFlights, use routeInfo
        else if (routeInfo) {
          flightData = {
            departure: routeInfo.departure,
            arrival: routeInfo.arrival,
            departureCity: routeInfo.departureCity,
            arrivalCity: routeInfo.arrivalCity,
          };
        }

        if (!flightData) {
          throw new Error('No flight data available');
        }

        // Create a cache key based on the flight data
        const cacheKey = `compensation_${flightData.departure}_${flightData.arrival}`;
        const cachedData = localStorage.getItem(cacheKey);

        // Check if we have valid cached data
        if (cachedData) {
          try {
            const { amount, timestamp } = JSON.parse(cachedData);
            // Cache is valid for 24 hours
            if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
              setCompensationAmount(amount);
              setCompensationLoading(false);
              return;
            }
          } catch (error) {
            console.error('Error parsing cached compensation data:', error);
          }
        }

        const queryParams = new URLSearchParams({
          from_iata: flightData.departure,
          to_iata: flightData.arrival,
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

        // Cache the compensation data
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

        // Cache in localStorage with timestamp
        localStorage.setItem(
          cacheKey,
          JSON.stringify({
            amount: data.amount,
            timestamp: Date.now(),
          })
        );

        setCompensationAmount(data.amount);
      } catch (error) {
        setCompensationError(
          error instanceof Error
            ? error.message
            : 'Failed to calculate compensation'
        );
      } finally {
        setCompensationLoading(false);
      }
    };

    // Call calculation if we have either selectedFlights or routeInfo
    if (selectedFlights?.length > 0 || routeInfo) {
      calculateCompensation();
    } else {
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
      await completePhase(2);
      await setCurrentPhase(3);
      const nextPhaseUrl = '/phases/flight-details';
      if (!nextPhaseUrl) {
        throw new Error('Invalid next phase URL');
      }
      await router.push(nextPhaseUrl);
    } catch (error) {
      setCurrentPhase(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const previousUrl = goToPreviousPhase();
    if (previousUrl !== null) {
      router.push(previousUrl);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <PhaseGuard phase={2}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Es gibt eine gute Chance, dass du Anspruch auf eine Entschädigung hast! Lass mich dir helfen. Komplett risikofrei: Ich erhalte nur eine Erfolgsprovision von 30 % (inkl. MwSt.), wenn ich erfolgreich bin." />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Flugzusammenfassung
              </h2>
              <div className="space-y-4">
                {personalDetails && (
                  <div className="pb-4 border-b border-gray-100">
                    <p className="text-gray-600">Passagier</p>
                    <p className="font-medium">
                      {personalDetails.firstName} {personalDetails.lastName}
                    </p>
                  </div>
                )}
                <div className="space-y-4">
                  {selectedType === 'direct' ? (
                    <>
                      <div>
                        <p className="text-gray-600">Von</p>
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
                          };

                          // Extract city name from dropdown label (e.g. "Berlin Brandenburg Airport (BER)" -> "Berlin")
                          const fullCityFromLabel = fromCityData.dropdownLabel
                            ? fromCityData.dropdownLabel
                                .split('(')[0]
                                .trim()
                                .split(' ')[0]
                            : null;

                          const cityName =
                            fullCityFromLabel ||
                            fromCityData.locationDesc ||
                            fromCityData.selectedFlightCity ||
                            fromCityData.locationCity ||
                            fromCityData.departure ||
                            'No departure city available';

                          return <p className="font-medium">{cityName}</p>;
                        })()}
                      </div>
                      <div>
                        <p className="text-gray-600">Nach</p>
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
                          };

                          // Extract city name from dropdown label (e.g. "Munich International Airport (MUC)" -> "Munich")
                          const fullCityFromLabel = toCityData.dropdownLabel
                            ? toCityData.dropdownLabel
                                .split('(')[0]
                                .trim()
                                .split(' ')[0]
                            : null;

                          const cityName =
                            fullCityFromLabel ||
                            toCityData.locationDesc ||
                            toCityData.selectedFlightCity ||
                            toCityData.locationCity ||
                            toCityData.arrival ||
                            'No arrival city available';

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

                      // Extract full city names with detailed logging
                      const departureCityData = {
                        selectedFlightCity: selectedFlight?.departureCity,
                        locationDesc: fromLocation?.description,
                        dropdownLabel: fromLocation?.dropdownLabel,
                        locationCity: fromLocation?.city,
                        departure: selectedFlight?.departure,
                      };

                      const arrivalCityData = {
                        selectedFlightCity: selectedFlight?.arrivalCity,
                        locationDesc: toLocation?.description,
                        dropdownLabel: toLocation?.dropdownLabel,
                        locationCity: toLocation?.city,
                        arrival: selectedFlight?.arrival,
                      };

                      // Extract city name from dropdown label (e.g. "Berlin Brandenburg Airport (BER)" -> "Berlin")
                      const departureCityFromLabel =
                        departureCityData.dropdownLabel
                          ? departureCityData.dropdownLabel
                              .split('(')[0]
                              .trim()
                              .split(' ')[0]
                          : null;

                      const arrivalCityFromLabel = arrivalCityData.dropdownLabel
                        ? arrivalCityData.dropdownLabel
                            .split('(')[0]
                            .trim()
                            .split(' ')[0]
                        : null;

                      const departureCity =
                        departureCityFromLabel ||
                        departureCityData.locationDesc ||
                        departureCityData.selectedFlightCity ||
                        departureCityData.locationCity ||
                        departureCityData.departure ||
                        'No departure city available';

                      const arrivalCity =
                        arrivalCityFromLabel ||
                        arrivalCityData.locationDesc ||
                        arrivalCityData.selectedFlightCity ||
                        arrivalCityData.locationCity ||
                        arrivalCityData.arrival ||
                        'No arrival city available';

                      return (
                        <div
                          key={index}
                          className="pb-4 border-b border-gray-100 last:border-b-0"
                        >
                          <p className="text-gray-600 font-medium mb-2">
                            Flug {index + 1}
                          </p>
                          <div className="space-y-2">
                            <div>
                              <p className="text-gray-600">Von</p>
                              <p className="font-medium">{departureCity}</p>
                            </div>
                            <div>
                              <p className="text-gray-600">Nach</p>
                              <p className="font-medium">{arrivalCity}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p>No flight details available</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Geschätzte Entschädigung
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {compensationLoading
                  ? 'Entschädigung wird berechnet...'
                  : compensationError
                    ? compensationError
                    : typeof compensationAmount === 'number'
                      ? `€${compensationAmount}`
                      : 'Entschädigung konnte nicht berechnet werden'}
              </div>
              <p className="text-gray-600 mt-2">
                Der endgültige Betrag wird festgelegt, nachdem wir deine
                vollständigen Falldetails überprüft haben.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Nächste Schritte</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Flugdetails angeben</h3>
                    <p className="text-gray-600">
                      Hilf uns zu verstehen, was mit deinem Flug passiert ist,
                      indem du uns mehr Details zu deiner Reise gibst.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Fall überprüfen</h3>
                    <p className="text-gray-600">
                      Wir überprüfen die Details deines Falls und bewerten deine
                      Anspruchsberechtigung auf Entschädigung.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Anspruch einreichen</h3>
                    <p className="text-gray-600">
                      Sobald alles bestätigt ist, reichen wir deinen Anspruch
                      ein und übernehmen die gesamte Kommunikation mit der
                      Fluggesellschaft.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <BackButton onClick={handleBack} text="Zurück" />
            <ContinueButton
              onClick={handleContinue}
              disabled={false}
              isLoading={isLoading}
              text="Weiter zu den Flugdetails"
            />
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
