'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { store } from '@/store';
import {
  setSelectedFlight,
  setBookingNumber,
} from '@/store/slices/bookingSlice';
import {
  setCurrentPhase,
  markStepIncomplete,
  completeStep,
  completePhase,
} from '@/store/slices/progressSlice';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { FlightSelector } from '@/components/booking/FlightSelector';
import { AccordionCard } from '@/components/shared/AccordionCard';
// import { Input } from '@/components/shared/Input';
import type { Flight } from '@/types';
import { accordionConfig } from '@/config/accordion';
import { useStepValidation } from '@/hooks/useStepValidation';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { pushToDataLayer } from '@/utils/gtm';
import { XMarkIcon } from '@heroicons/react/20/solid';

export default function FlightDetailsPage() {
  // 1. All useState hooks first
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingNumber, setLocalBookingNumber] = useState('');
  const [flightType] = useState<'direct' | 'multi'>('direct');
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isBookingInputFocused, setIsBookingInputFocused] = useState(false);

  // 2. All useRef hooks
  const prevValidationRef = useRef({ flight: false, booking: false });
  const prevCompletedStepsRef = useRef<number[]>([]);

  // 3. All Redux hooks
  const router = useRouter();
  const dispatch = useAppDispatch();
  const selectedFlight = useAppSelector(
    (state) => state.booking.selectedFlight
  );
  const bookingState = useAppSelector((state) => state.booking);
  const storedCompletedSteps = useAppSelector(
    (state) => state.progress.completedSteps
  );
  const completedPhases = useAppSelector(
    (state) => state.progress.completedPhases
  );

  // 4. Custom hooks
  const { validationRules } = useStepValidation();

  // 5. All useEffect hooks
  useEffect(() => {
    if (storedCompletedSteps && storedCompletedSteps.length > 0) {
      setCompletedSteps(storedCompletedSteps);
    }
  }, [storedCompletedSteps]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!mounted) return;

      if (selectedFlight) {
        localStorage.setItem('selectedFlights', JSON.stringify(selectedFlight));
        localStorage.setItem('flightType', flightType);
      }
      if (bookingNumber) {
        localStorage.setItem('bookingNumber', bookingNumber);
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [selectedFlight, bookingNumber, flightType, mounted]);

  useEffect(() => {
    if (mounted) return;

    const initializeState = async () => {
      try {
        // Set current phase to 3 (Flight Details)
        dispatch(setCurrentPhase(3));
        localStorage.setItem('currentPhase', '3');

        // Restore validation state from localStorage
        const savedValidationState = localStorage.getItem('validationState');
        const parsedValidationState = savedValidationState
          ? JSON.parse(savedValidationState)
          : null;

        // Restore completed steps
        if (parsedValidationState?.completedSteps) {
          setCompletedSteps(parsedValidationState.completedSteps);
          parsedValidationState.completedSteps.forEach((step: number) => {
            dispatch(completeStep(step));
          });
        }

        // Try to restore booking number from various sources
        let bookingNumberToRestore = null;

        // First try from bookingState
        const savedBookingState = localStorage.getItem('bookingState');
        if (savedBookingState) {
          try {
            const parsedState = JSON.parse(savedBookingState);
            if (parsedState.bookingNumber) {
              bookingNumberToRestore = parsedState.bookingNumber;
            }
          } catch (error) {
            console.error('Error parsing bookingState:', error);
          }
        }

        // Then try from direct bookingNumber storage
        if (!bookingNumberToRestore) {
          const savedBookingNumber = localStorage.getItem('bookingNumber');
          if (savedBookingNumber) {
            bookingNumberToRestore = savedBookingNumber;
          }
        }

        // Restore flight data
        const savedFlights = localStorage.getItem('selectedFlights');
        if (savedFlights) {
          try {
            const parsedFlights = JSON.parse(savedFlights);
            if (parsedFlights) {
              dispatch(setSelectedFlight(parsedFlights));
              // If flight is valid, mark step 1 as complete
              const firstFlight = Array.isArray(parsedFlights)
                ? parsedFlights[0]
                : parsedFlights;
              if (
                firstFlight?.flightNumber &&
                firstFlight?.departure &&
                firstFlight?.arrival
              ) {
                dispatch(completeStep(1));
                setCompletedSteps((prev) => [...new Set([...prev, 1])]);
              }
            }
          } catch (error) {
            console.error('Error parsing saved flights:', error);
          }
        }

        // Only restore booking number if it's valid
        if (bookingNumberToRestore) {
          const isValid =
            bookingNumberToRestore.trim() !== '' &&
            (bookingNumberToRestore.length === 6 ||
              bookingNumberToRestore.length === 13);

          if (isValid) {
            setLocalBookingNumber(bookingNumberToRestore);
            dispatch(setBookingNumber(bookingNumberToRestore));
            dispatch(completeStep(2));
            setCompletedSteps((prev) => [...new Set([...prev, 2])]);
          } else {
            // Clear invalid booking number
            localStorage.removeItem('bookingNumber');
            setLocalBookingNumber('');
            dispatch(setBookingNumber(''));
            dispatch(markStepIncomplete(2));
            setCompletedSteps((prev) => prev.filter((step) => step !== 2));
          }
        } else {
          // Explicitly mark step 2 as incomplete when no booking number is found
          dispatch(markStepIncomplete(2));
          setCompletedSteps((prev) => prev.filter((step) => step !== 2));
        }

        setMounted(true);
      } catch (error) {
        console.error('Error initializing state:', error);
        setMounted(true);
      }
    };

    initializeState();
  }, [dispatch, mounted]);

  // 6. All memoized values/callbacks
  const canContinue = useMemo(() => {
    const firstFlight = Array.isArray(selectedFlight)
      ? selectedFlight[0]
      : selectedFlight;

    // Validate flight details
    const isFlightValid = Boolean(
      firstFlight?.flightNumber &&
        firstFlight?.departure &&
        firstFlight?.arrival &&
        firstFlight?.departureTime &&
        firstFlight?.arrivalTime &&
        validationRules.flight(firstFlight)
    );

    // Validate booking number
    const isBookingValid = Boolean(
      bookingNumber &&
        bookingNumber.trim() !== '' &&
        (bookingNumber.length === 6 || bookingNumber.length === 13)
    );

    return isFlightValid && isBookingValid;
  }, [selectedFlight, bookingNumber, validationRules]);

  // Handle validation state updates
  useEffect(() => {
    const firstFlight = Array.isArray(selectedFlight)
      ? selectedFlight[0]
      : selectedFlight;

    // Validate flight details
    const isFlightValid = Boolean(
      firstFlight?.flightNumber &&
        firstFlight?.departure &&
        firstFlight?.arrival &&
        firstFlight?.departureTime &&
        firstFlight?.arrivalTime &&
        validationRules.flight(firstFlight)
    );

    // Update flight validation state
    if (isFlightValid && !completedSteps.includes(1)) {
      dispatch(completeStep(1));
      setCompletedSteps((prev) => [...new Set([...prev, 1])]);
    } else if (!isFlightValid && completedSteps.includes(1)) {
      dispatch(markStepIncomplete(1));
      setCompletedSteps((prev) => prev.filter((step) => step !== 1));
    }

    // Validate booking number
    const isBookingValid = Boolean(
      bookingNumber &&
        bookingNumber.trim() !== '' &&
        (bookingNumber.length === 6 || bookingNumber.length === 13)
    );

    // Update booking validation state
    if (isBookingValid && !completedSteps.includes(2)) {
      dispatch(completeStep(2));
      setCompletedSteps((prev) => [...new Set([...prev, 2])]);
    } else if (!isBookingValid && completedSteps.includes(2)) {
      dispatch(markStepIncomplete(2));
      setCompletedSteps((prev) => prev.filter((step) => step !== 2));
    }
  }, [
    selectedFlight,
    bookingNumber,
    validationRules,
    completedSteps,
    dispatch,
  ]);

  const handleFlightSelect = useCallback(
    (flights: Flight | Flight[] | null) => {
      // Mark step 1 as interacted with
      setInteractedSteps((prev) => [...new Set([...prev, 1])]);

      if (!flights) {
        // Get current completed phases and locations before resetting
        const currentState = store.getState().booking;
        const fromLocation = currentState.fromLocation;
        const toLocation = currentState.toLocation;

        // Clear flight-specific data from Redux
        dispatch(setSelectedFlight(null));
        dispatch(markStepIncomplete(1));
        setCompletedSteps((prev) => prev.filter((step) => step !== 1));
        prevValidationRef.current.flight = false;
        prevCompletedStepsRef.current = prevCompletedStepsRef.current.filter(
          (step) => step !== 1
        );

        // Clear only flight-specific data from localStorage
        localStorage.removeItem('selectedFlights');
        localStorage.removeItem('flightSummary');
        localStorage.removeItem('flightSegments');
        localStorage.removeItem('flightDetails');
        localStorage.removeItem('flightType');

        // Ensure we stay in phase 3
        dispatch(setCurrentPhase(3));
        localStorage.setItem('currentPhase', '3');

        // Save validation state for deleted flight
        const validationState = {
          flight: false,
          booking: prevValidationRef.current.booking,
          completedSteps: completedSteps.filter((step) => step !== 1),
          interactedSteps,
          isValid: false,
          validationDetails: [
            {
              step: 1,
              isValid: false,
              message: 'Flight has been deleted',
            },
            {
              step: 2,
              isValid: prevValidationRef.current.booking,
              message: prevValidationRef.current.booking
                ? 'Booking number is valid'
                : 'Booking number is incomplete',
            },
          ],
        };
        localStorage.setItem(
          'validationState',
          JSON.stringify(validationState)
        );

        // Preserve locations if they exist
        if (fromLocation) localStorage.setItem('fromLocation', fromLocation);
        if (toLocation) localStorage.setItem('toLocation', toLocation);

        return;
      }

      // Clear the flight deleted flag when selecting a new flight
      localStorage.removeItem('flightWasDeleted');

      const flightArray = Array.isArray(flights) ? flights : [flights];
      const firstFlight = flightArray[0];

      // If this is just location selection (no flight details), ignore it
      if (!firstFlight?.flightNumber || !firstFlight?.departureTime) {
        return;
      }

      // Validate and set flight details
      if (
        firstFlight?.flightNumber &&
        firstFlight?.departure &&
        firstFlight?.arrival
      ) {
        const flightWithDefaults = {
          ...firstFlight,
          id: firstFlight.id || Math.random().toString(),
          price: firstFlight.price || 0,
          stops: firstFlight.stops || 0,
          aircraft: firstFlight.aircraft || 'Unknown',
          class: firstFlight.class || 'economy',
          status: firstFlight.status || 'scheduled',
        };

        dispatch(setSelectedFlight(flightWithDefaults));
        dispatch(completeStep(1));
        setCompletedSteps((prev) => [...prev, 1]);
        prevValidationRef.current.flight = true;

        // Save flight details to localStorage
        localStorage.setItem('selectedFlights', JSON.stringify(flightArray));
        localStorage.setItem('flightType', flightType);
      }
    },
    [dispatch, flightType, completedSteps, interactedSteps]
  );

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;
    setIsLoading(true);
    try {
      // Complete current phase and set up next phase
      dispatch(completePhase(3));
      dispatch(setCurrentPhase(4));

      // Get existing completed phases and add phase 3
      const existingCompletedPhases = JSON.parse(
        localStorage.getItem('completedPhases') || '[]'
      );
      const updatedCompletedPhases = [
        ...new Set([...existingCompletedPhases, 1, 2, 3]),
      ];

      // Save states to localStorage
      localStorage.setItem('bookingState', JSON.stringify(bookingState));
      localStorage.setItem('currentPhase', '4');
      localStorage.setItem(
        'completedPhases',
        JSON.stringify(updatedCompletedPhases)
      );

      // Save validation state
      const validationState = {
        flight: true,
        booking: true,
        completedSteps,
        interactedSteps,
        isValid: true,
      };
      localStorage.setItem('validationState', JSON.stringify(validationState));

      await router.push('/phases/trip-experience');
    } catch (error) {
      console.error('Error during continue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    canContinue,
    bookingState,
    router,
    dispatch,
    completedSteps,
    interactedSteps,
  ]);

  const handleBookingNumberChange = useCallback(
    (value: string) => {
      const upperValue = value.toUpperCase();

      // Always update the local state and Redux with the new value
      setLocalBookingNumber(upperValue);
      dispatch(setBookingNumber(upperValue));
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);

      // Save to localStorage regardless of validation
      localStorage.setItem('bookingNumber', upperValue);

      // Validate the booking number - must be non-empty and either 6 or 13 characters
      const isValid =
        upperValue.trim() !== '' &&
        (upperValue.length === 6 || upperValue.length === 13);

      // Update step completion based on validation
      if (isValid) {
        dispatch(completeStep(2));
        // Save completed steps
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        if (!existingSteps.includes(2)) {
          existingSteps.push(2);
          existingSteps.sort((a: number, b: number) => a - b);
          localStorage.setItem('completedSteps', JSON.stringify(existingSteps));
        }
      } else {
        dispatch(markStepIncomplete(2));
        // Remove step 2 from completed steps
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        const updatedSteps = existingSteps.filter((step: number) => step !== 2);
        localStorage.setItem('completedSteps', JSON.stringify(updatedSteps));
      }

      // Save entire booking state
      const updatedBookingState = {
        ...bookingState,
        bookingNumber: upperValue,
      };
      localStorage.setItem('bookingState', JSON.stringify(updatedBookingState));

      // Log the saved state for debugging
      console.log('=== Saved Booking Number State ===', {
        value: upperValue,
        isValid,
        bookingState: updatedBookingState,
        localStorage: {
          bookingNumber: localStorage.getItem('bookingNumber'),
          bookingState: localStorage.getItem('bookingState'),
          completedSteps: localStorage.getItem('completedSteps'),
        },
      });
    },
    [dispatch, bookingState]
  );

  const handleBack = useCallback(() => {
    localStorage.setItem('isBackNavigation', 'true');
    localStorage.setItem('previousPhase', '2');
    router.push('/phases/compensation-estimate');
  }, [router]);

  useEffect(() => {
    pushToDataLayer({ step_position: 2 });
  }, []);

  // Early return after all hooks
  if (!mounted) {
    return null;
  }

  console.log('Flight Details State:', {
    selectedFlight: !!selectedFlight,
    bookingNumber,
    bookingNumberLength: bookingNumber.length,
    isValidBookingNumber:
      bookingNumber.length === 6 || bookingNumber.length === 13,
    canContinue,
    completedSteps,
  });

  return (
    <PhaseGuard phase={3}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={3} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Please provide some additional details about your flight." />

            <AccordionCard
              title="Select your flight"
              eyebrow="Step 1"
              summary="Select your flight details"
              isCompleted={Boolean(
                selectedFlight?.flightNumber &&
                  selectedFlight?.departure &&
                  selectedFlight?.arrival &&
                  validationRules.flight(selectedFlight) &&
                  completedSteps.includes(1)
              )}
              hasInteracted={interactedSteps.includes(1)}
              className={accordionConfig.padding.wrapper}
              shouldStayOpen={false}
              isOpenByDefault={true}
              stepId="flight-selection"
            >
              <div className={accordionConfig.padding.content}>
                <FlightSelector
                  onSelect={handleFlightSelect}
                  showResults={true}
                  showFlightSearch={true}
                  showFlightDetails={true}
                  selectedFlight={selectedFlight}
                  initialFlightType={flightType}
                />
              </div>
            </AccordionCard>

            <AccordionCard
              title="Enter your booking number"
              eyebrow="Step 2"
              summary="Enter your booking reference"
              isCompleted={completedSteps.includes(2)}
              hasInteracted={interactedSteps.includes(2)}
              className={accordionConfig.padding.wrapper}
              shouldStayOpen={false}
              isOpenByDefault={true}
              stepId="booking-number"
            >
              <div className={accordionConfig.padding.content}>
                <div className="relative mt-3">
                  <input
                    type="text"
                    value={bookingNumber}
                    onChange={(e) => handleBookingNumberChange(e.target.value)}
                    onFocus={() => setIsBookingInputFocused(true)}
                    onBlur={() => setIsBookingInputFocused(false)}
                    className={`
                      w-full h-14 px-4 py-2
                      text-[#4B616D] text-base font-medium font-heebo
                      bg-white rounded-xl
                      transition-all duration-[250ms] ease-in-out
                      ${
                        isBookingInputFocused
                          ? 'border-2 border-blue-500'
                          : 'border border-[#e0e1e4] hover:border-blue-500'
                      }
                      focus:outline-none
                      ${bookingNumber ? 'pr-10' : ''}
                    `}
                  />
                  {bookingNumber && (
                    <button
                      onClick={() => handleBookingNumberChange('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                      type="button"
                      aria-label="Clear input"
                    >
                      <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-[#F54538] transition-colors" />
                    </button>
                  )}
                  <label
                    className={`
                      absolute left-4 top-0
                      transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
                      text-[#9BA3AF] font-heebo
                      ${
                        isBookingInputFocused || bookingNumber
                          ? '-translate-y-1/2 text-[10px] px-1 bg-white'
                          : 'translate-y-[calc(50%+7px)] text-base'
                      }
                      ${isBookingInputFocused ? 'text-[#464646]' : ''}
                    `}
                  >
                    Booking Number
                  </label>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Your PNR (Passenger Name Record) is a 6 or 13-character code
                  that can be found on your booking confirmation or e-ticket.
                </p>
              </div>
            </AccordionCard>
          </div>

          {/* Navigation */}
          {mounted && (
            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton onClick={handleBack} />
              <ContinueButton
                onClick={handleContinue}
                disabled={!canContinue}
                isLoading={isLoading}
                text="Continue to Trip Experience"
              />
            </div>
          )}
        </main>
      </div>
    </PhaseGuard>
  );
}
