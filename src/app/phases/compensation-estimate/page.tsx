'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, getLanguageAwareUrl } from '@/lib/state/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import type { LocationData } from '@/types/store';
import { useTranslation } from '@/hooks/useTranslation';

type RouteInfo = {
  departureCity: string;
  arrivalCity: string;
  departure: string;
  arrival: string;
};

export default function CompensationEstimatePage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
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

        // For multi-segment flights, use first and last segments
        if (selectedType === 'multi' && flightSegments?.length > 0) {
          const firstSegment = flightSegments[0];
          const lastSegment = flightSegments[flightSegments.length - 1];

          // Get IATA codes from locations (they must be selected to get here)
          const from_iata = firstSegment.fromLocation?.value;
          const to_iata = lastSegment.toLocation?.value;

          if (!from_iata || !to_iata) {
            throw new Error('Missing IATA codes for compensation calculation');
          }

          flightData = {
            departure: from_iata,
            arrival: to_iata,
          };
        }
        // For direct flights, try selected flight first, then locations
        else if (selectedType === 'direct') {
          if (selectedFlights?.length > 0) {
            const validFlights = selectedFlights.filter(
              (flight) => flight !== null
            );
            if (validFlights.length > 0) {
              flightData = validFlights[0];
            }
          }
          // If no selected flight, try using locations from directFlight
          else if (
            directFlight?.fromLocation?.value &&
            directFlight?.toLocation?.value
          ) {
            flightData = {
              departure: directFlight.fromLocation.value,
              arrival: directFlight.toLocation.value,
            };
          }
        }
        // If no valid data yet, use routeInfo as last resort
        if (!flightData && routeInfo) {
          flightData = {
            departure: routeInfo.departure,
            arrival: routeInfo.arrival,
          };
        }

        if (!flightData?.departure || !flightData?.arrival) {
          throw new Error(
            'Missing origin or destination for compensation calculation'
          );
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

    // Calculate compensation if we have enough data for either case
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
      await completePhase(2);
      await setCurrentPhase(3);
      const nextPhaseUrl = '/phases/flight-details';
      if (!nextPhaseUrl) {
        throw new Error('Invalid next phase URL');
      }
      await router.push(getLanguageAwareUrl(nextPhaseUrl, lang));
    } catch (error) {
      setCurrentPhase(2);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = async () => {
    const previousUrl = '/phases/initial-assessment';
    // First update the current phase to the previous phase
    await setCurrentPhase(1);
    // Then navigate to the previous URL with language parameter
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
                        t.phases.compensationEstimate.flightSummary
                          .noFlightDetails;

                      const arrivalCity =
                        arrivalCityFromLabel ||
                        arrivalCityData.locationDesc ||
                        arrivalCityData.selectedFlightCity ||
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
