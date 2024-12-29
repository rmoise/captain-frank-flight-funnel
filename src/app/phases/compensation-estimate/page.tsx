'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setCurrentPhase, completePhase } from '@/store/slices/progressSlice';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';

type RouteInfo = {
  departureCity: string;
  arrivalCity: string;
  departure: string;
  arrival: string;
};

export default function CompensationEstimatePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const compensationAmount = useAppSelector(
    (state) => state.compensation.compensationAmount
  );
  const compensationLoading = useAppSelector(
    (state) => state.compensation.compensationLoading
  );
  const compensationError = useAppSelector(
    (state) => state.compensation.compensationError
  );
  const completedPhases = useAppSelector(
    (state) => state.progress.completedPhases
  );
  const personalDetails = useAppSelector(
    (state) => state.booking.personalDetails
  );

  useEffect(() => {
    setMounted(true);

    // Set current phase to 2
    dispatch(setCurrentPhase(2));
    localStorage.setItem('currentPhase', '2');

    // Ensure only phase 1 is marked as completed
    dispatch(completePhase(1));

    // Save completed phases to localStorage (only phase 1)
    const phases = [1];
    localStorage.setItem('completedPhases', JSON.stringify(phases));

    // Load flight information from previous phase
    const fromLocation = localStorage.getItem('fromLocation');
    const toLocation = localStorage.getItem('toLocation');
    const multiCityLocations = localStorage.getItem('multiCityLocations');

    if (fromLocation && toLocation) {
      try {
        const from = JSON.parse(fromLocation);
        const to = JSON.parse(toLocation);

        // Set route information for display only
        setRouteInfo({
          departure: from.value,
          arrival: to.value,
          departureCity: from.city,
          arrivalCity: to.city,
        });
      } catch (error) {
        console.error('Error parsing location details:', error);
      }
    } else if (multiCityLocations) {
      try {
        const locations = JSON.parse(multiCityLocations);
        if (locations && locations.length > 0) {
          const firstLeg = locations[0];
          // Set route information for first leg
          setRouteInfo({
            departure: firstLeg.from.value,
            arrival: firstLeg.to.value,
            departureCity: firstLeg.from.city,
            arrivalCity: firstLeg.to.city,
          });
        }
      } catch (error) {
        console.error('Error parsing multi-city location details:', error);
      }
    }
  }, [dispatch]);

  // Calculate compensation in a separate effect
  useEffect(() => {
    if (!mounted || !routeInfo) return;

    const calculateEstimate = async () => {
      try {
        const response = await fetch(
          `/api/calculatecompensationbyfromiatatoiata?${new URLSearchParams({
            from_iata: routeInfo.departure,
            to_iata: routeInfo.arrival,
          })}`
        );

        if (!response.ok) {
          throw new Error('Failed to calculate compensation');
        }

        const data = await response.json();
        const amount = data.amount || 600;

        dispatch({
          type: 'compensation/setCompensationAmount',
          payload: amount,
        });

        localStorage.setItem('compensationAmount', JSON.stringify(amount));
        localStorage.setItem(
          'compensationRoute',
          `${routeInfo.departure}-${routeInfo.arrival}`
        );
      } catch (error) {
        console.error('Error calculating compensation:', error);
        dispatch({
          type: 'compensation/setCompensationAmount',
          payload: 600,
        });
      }
    };

    calculateEstimate();
  }, [mounted, routeInfo, dispatch]);

  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Complete phase 2 before transitioning to phase 3
      dispatch({ type: 'progress/completePhase', payload: 2 });
      dispatch({ type: 'progress/setCurrentPhase', payload: 3 });

      // Set next phase and clear back navigation flag
      localStorage.setItem('currentPhase', '3');
      localStorage.removeItem('isBackNavigation');
      localStorage.setItem('previousPhase', '2');

      // Navigate to flight details
      router.replace('/phases/flight-details');
    } catch (error) {
      console.error('Error during continue:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    // Save current state before navigating back
    const currentState = {
      selectedFlights: localStorage.getItem('selectedFlights'),
      flightSummary: localStorage.getItem('flightSummary'),
      fromLocation: localStorage.getItem('fromLocation'),
      toLocation: localStorage.getItem('toLocation'),
      bookingNumber: localStorage.getItem('bookingNumber'),
      validationState: localStorage.getItem('validationState'),
      completedSteps: localStorage.getItem('completedSteps'),
      completedPhases: localStorage.getItem('completedPhases'),
    };

    // Set back navigation flag
    localStorage.setItem('isBackNavigation', 'true');
    localStorage.setItem('previousPhase', '1');

    // Save current state to be restored
    localStorage.setItem('savedFlightState', JSON.stringify(currentState));

    // Update phase in localStorage
    localStorage.setItem('currentPhase', '1');

    // Navigate back to initial assessment
    router.push('/phases/initial-assessment');
  };

  // Don't render anything until after hydration
  if (!mounted) {
    return null;
  }

  return (
    <PhaseGuard phase={2}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={2} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="There's a good chance that you're entitled to a claim! Let me help you. Completely risk-free: I only receive a commission fee of 30% (including VAT) if I'm successful." />
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Flight Summary</h2>
              {routeInfo ? (
                <div className="space-y-2">
                  {personalDetails && (
                    <p>
                      Passenger: {personalDetails.firstName}{' '}
                      {personalDetails.lastName}
                    </p>
                  )}
                  <div className="space-y-2">
                    <p>
                      From: {routeInfo.departureCity} - {routeInfo.departure}
                    </p>
                    <p>
                      To: {routeInfo.arrivalCity} - {routeInfo.arrival}
                    </p>
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
