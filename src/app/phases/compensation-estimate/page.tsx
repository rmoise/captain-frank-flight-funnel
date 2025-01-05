'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import type { Flight } from '@/types/store';

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
  }, [setCurrentPhase, completePhase]);

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
            <SpeechBubble message="There's a good chance that you're entitled to a claim! Let me help you. Completely risk-free: I only receive a commission fee of 30% (including VAT) if I'm successful." />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Flight Summary</h2>
              {routeInfo ? (
                <div className="space-y-4">
                  {personalDetails && (
                    <div className="pb-4 border-b border-gray-100">
                      <p className="text-gray-600">Passenger</p>
                      <p className="font-medium">
                        {personalDetails.firstName} {personalDetails.lastName}
                      </p>
                    </div>
                  )}
                  <div className="space-y-4">
                    {selectedType === 'direct' ? (
                      <>
                        <div>
                          <p className="text-gray-600">From</p>
                          <p className="font-medium">
                            {routeInfo.departureCity}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">To</p>
                          <p className="font-medium">{routeInfo.arrivalCity}</p>
                        </div>
                      </>
                    ) : (
                      (selectedFlights as Flight[]).map(
                        (flight: Flight, index: number) => (
                          <div
                            key={index}
                            className="pb-4 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-gray-600 font-medium mb-2">
                              Flight {index + 1}
                            </p>
                            <div className="space-y-2">
                              <div>
                                <p className="text-gray-600">From</p>
                                <p className="font-medium">
                                  {flight.departureCity}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-600">To</p>
                                <p className="font-medium">
                                  {flight.arrivalCity}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )
                    )}
                  </div>
                </div>
              ) : (
                <p>No flight details available</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">
                Estimated Compensation
              </h2>
              <div className="text-2xl font-bold text-[#F54538]">
                {compensationLoading
                  ? 'Calculating compensation...'
                  : compensationError
                    ? compensationError
                    : typeof compensationAmount === 'number'
                      ? `€${compensationAmount}`
                      : 'Unable to calculate compensation'}
              </div>
              <p className="text-gray-600 mt-2">
                Final amount will be determined after reviewing your complete
                case details.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">
                      Provide Flight Details
                    </h3>
                    <p className="text-gray-600">
                      Help us understand what happened with your flight by
                      providing more details about your journey.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Review Your Case</h3>
                    <p className="text-gray-600">
                      We&apos;ll review your case details and assess your
                      eligibility for compensation.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#F54538] text-white flex items-center justify-center flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Submit Your Claim</h3>
                    <p className="text-gray-600">
                      Once everything is confirmed, we&apos;ll submit your claim
                      and handle all communication with the airline.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <BackButton onClick={handleBack} />
            <ContinueButton
              onClick={handleContinue}
              disabled={false}
              isLoading={isLoading}
              text="Continue to Flight Details"
            />
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
