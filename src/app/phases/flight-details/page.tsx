'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, getLanguageAwareUrl } from '@/lib/state/store';
import { useTranslation } from '@/hooks/useTranslation';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { FlightSelector } from '@/components/booking/FlightSelector';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { accordionConfig } from '@/config/accordion';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { usePhase4Store } from '@/lib/state/phase4Store';

export default function FlightDetailsPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [bookingNumber, setLocalBookingNumber] = useState('');
  const [isBookingInputFocused, setIsBookingInputFocused] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<string[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [openSteps, setOpenSteps] = useState<string[]>(['flight-selection']);

  const {
    selectedFlights,
    setCurrentPhase,
    bookingNumber: storedBookingNumber,
    setSelectedFlights,
    setBookingNumber: setStoreBookingNumber,
    completePhase,
    validationState,
    updateValidationState,
  } = useStore();

  // Initialize component
  useEffect(() => {
    if (!mounted) {
      console.log('=== Flight Details Page Initialization ===', {
        storedBookingNumber,
        selectedFlights: selectedFlights.length,
      });

      setMounted(true);
      setCurrentPhase(3);

      // Set local booking number from store
      const bookingNumberToUse = storedBookingNumber || '';
      setLocalBookingNumber(bookingNumberToUse);

      // Check if this is actually first visit by looking at store state
      const hasExistingData = selectedFlights.length > 0 || bookingNumberToUse;
      setIsFirstVisit(!hasExistingData);

      // Get the last active accordion from session storage
      const lastActiveAccordion = sessionStorage.getItem('activeAccordion');
      setInitialAccordion(
        lastActiveAccordion || (hasExistingData ? null : 'flight-selection')
      );

      // Initialize open steps
      setOpenSteps(['flight-selection']);

      // Initialize validation state
      const isBookingValid =
        bookingNumberToUse.trim().length >= 6 &&
        /^[A-Z0-9]+$/i.test(bookingNumberToUse.trim());

      // Check if flights are valid - must have all required fields
      const isFlightValid =
        selectedFlights.length > 0 &&
        selectedFlights.every(
          (flight) =>
            flight.airline &&
            flight.flightNumber &&
            flight.departureCity &&
            flight.arrivalCity &&
            flight.date
        );

      // Update validation state with both flight and booking validation
      updateValidationState({
        stepValidation: {
          ...validationState.stepValidation,
          1: isFlightValid,
          2: isBookingValid,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          1: selectedFlights.length > 0,
          2: bookingNumberToUse.length > 0,
        },
        1: isFlightValid,
        2: isBookingValid,
        _timestamp: Date.now(),
      });

      console.log('Validation state initialized:', {
        isFlightValid,
        isBookingValid,
        selectedFlights: selectedFlights.length,
        bookingNumber: bookingNumberToUse.length,
      });

      console.log('=== End Flight Details Page Initialization ===');
    }
  }, [
    mounted,
    selectedFlights,
    storedBookingNumber,
    validationState.stepValidation,
    validationState.stepInteraction,
    updateValidationState,
  ]); // Add required dependencies

  // Add effect to handle auto-opening of step 2
  useEffect(() => {
    const isFirstStepValid = validationState.stepValidation[1];
    const isBookingNumberStepClosed = !openSteps.includes('booking-number');

    if (isFirstStepValid && isBookingNumberStepClosed) {
      setOpenSteps((prev) => [...prev, 'booking-number']);
    }
  }, [validationState.stepValidation, openSteps]);

  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      console.log('FlightDetails - handleAutoTransition:', {
        currentStepId,
        isStepValid:
          validationState.stepValidation[
            currentStepId === 'flight-selection' ? 1 : 2
          ],
      });

      if (
        currentStepId === 'flight-selection' &&
        validationState.stepValidation[1]
      ) {
        return 'booking-number';
      }
      return null;
    },
    [validationState.stepValidation]
  );

  const handleBookingNumberChange = (value: string) => {
    setLocalBookingNumber(value);
    setStoreBookingNumber(value);

    // Validate the booking number
    const isValid =
      value.trim().length >= 6 && /^[A-Z0-9]+$/i.test(value.trim());

    // Update validation state
    updateValidationState({
      stepValidation: {
        ...validationState.stepValidation,
        2: isValid,
      },
      2: isValid,
    });
  };

  const canContinue = useMemo(() => {
    return (
      validationState.stepValidation[1] && validationState.stepValidation[2]
    );
  }, [validationState.stepValidation]);

  const handleContinue = useCallback(() => {
    if (canContinue && !isNavigating) {
      setIsNavigating(true);
      completePhase(3);
      setCurrentPhase(4);

      // Transfer Phase 3's selected flights to Phase 4's original flights
      const phase4Store = usePhase4Store.getState();
      phase4Store.setOriginalFlights(selectedFlights);

      // Reset validation states for phase 4
      updateValidationState({
        stepValidation: {
          ...validationState.stepValidation,
          2: false, // Trip experience step
          3: false, // Informed date step
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: false, // Trip experience step
          3: false, // Informed date step
        },
        2: false, // Trip experience step
        3: false, // Informed date step
        _timestamp: Date.now(),
      });

      // Store the initial accordion state for phase 4 in session storage
      sessionStorage.setItem('activeAccordion', 'trip-experience');

      // Navigate after all state updates, preserving the language
      router.push(`/${lang}/phases/trip-experience`);
      setIsNavigating(false);
    }
  }, [
    canContinue,
    completePhase,
    isNavigating,
    router,
    setCurrentPhase,
    updateValidationState,
    validationState,
    lang,
    selectedFlights,
  ]);

  const handleInteraction = useCallback(
    (step: string) => {
      if (!interactedSteps.includes(step)) {
        setInteractedSteps((prev) => [...prev, step]);
      }
    },
    [interactedSteps]
  );

  const handleBack = async () => {
    const previousUrl = '/phases/compensation-estimate';
    // First update the current phase to the previous phase
    await setCurrentPhase(2);
    // Then navigate to the previous URL with language parameter
    router.push(getLanguageAwareUrl(previousUrl, lang));
  };

  if (!mounted) {
    return null;
  }

  return (
    <PhaseGuard phase={3}>
      <AccordionProvider
        onAutoTransition={handleAutoTransition}
        initialActiveAccordion={initialAccordion}
      >
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation currentPhase={3} completedPhases={[]} />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t.phases.flightDetails.speechBubble} />

              <div className="space-y-4">
                <AccordionCard
                  title={t.phases.flightDetails.steps.flightSelection.title}
                  eyebrow={t.phases.flightDetails.steps.flightSelection.eyebrow}
                  summary={(() => {
                    if (selectedFlights.length === 0) return '';

                    if (selectedFlights.length === 1) {
                      const flight = selectedFlights[0];
                      return t.phases.flightDetails.steps.flightSelection.summary.singleFlight
                        .replace('{airline}', flight.airline)
                        .replace('{flightNumber}', flight.flightNumber)
                        .replace('{departure}', flight.departureCity)
                        .replace('{arrival}', flight.arrivalCity);
                    }

                    // Multi-segment flight
                    const segments = selectedFlights.map(
                      (flight) =>
                        `${flight.departureCity} → ${flight.arrivalCity}`
                    );
                    return t.phases.flightDetails.steps.flightSelection.summary.multiSegment
                      .replace('{count}', selectedFlights.length.toString())
                      .replace('{segments}', segments.join(' | '));
                  })()}
                  isCompleted={validationState.stepValidation[1]}
                  hasInteracted={interactedSteps.includes('flight-selection')}
                  className={accordionConfig.padding.wrapper}
                  shouldStayOpen={false}
                  isOpenByDefault={isFirstVisit}
                  stepId="flight-selection"
                  isValid={validationState.stepValidation[1]}
                  isOpen={openSteps.includes('flight-selection')}
                  onToggle={() => {
                    setOpenSteps((prev) =>
                      prev.includes('flight-selection')
                        ? prev.filter((step) => step !== 'flight-selection')
                        : [...prev, 'flight-selection']
                    );
                  }}
                >
                  <div className={accordionConfig.padding.content}>
                    <FlightSelector
                      onSelect={(flight) => {
                        handleInteraction('flight-selection');
                        if (flight) {
                          if (Array.isArray(flight)) {
                            setSelectedFlights(flight);
                          } else {
                            setSelectedFlights([flight]);
                          }
                        }
                      }}
                      currentPhase={3}
                      stepNumber={1}
                      showFlightDetails={true}
                      setValidationState={(state) => {
                        if (typeof state === 'function') {
                          const newState = state(
                            validationState.stepValidation
                          );
                          updateValidationState({
                            ...validationState,
                            stepValidation: newState,
                            1: newState[1] || false,
                          });
                        } else {
                          updateValidationState({
                            ...validationState,
                            stepValidation: {
                              ...validationState.stepValidation,
                              1: state[1] || false,
                            },
                            1: state[1] || false,
                          });
                        }
                      }}
                    />
                  </div>
                </AccordionCard>

                <AccordionCard
                  title={t.phases.flightDetails.steps.bookingNumber.title}
                  eyebrow={t.phases.flightDetails.steps.bookingNumber.eyebrow}
                  summary={bookingNumber}
                  isCompleted={validationState.stepValidation[2]}
                  hasInteracted={interactedSteps.includes('booking-number')}
                  className={accordionConfig.padding.wrapper}
                  shouldStayOpen={false}
                  stepId="booking-number"
                  isValid={validationState.stepValidation[2]}
                  isOpen={openSteps.includes('booking-number')}
                  onToggle={() => {
                    setOpenSteps((prev) =>
                      prev.includes('booking-number')
                        ? prev.filter((step) => step !== 'booking-number')
                        : [...prev, 'booking-number']
                    );
                  }}
                >
                  <div className={accordionConfig.padding.content}>
                    <div className="relative mt-3">
                      <input
                        type="text"
                        value={bookingNumber}
                        onChange={(e) =>
                          handleBookingNumberChange(e.target.value)
                        }
                        onFocus={() => {
                          setIsBookingInputFocused(true);
                          handleInteraction('booking-number');
                        }}
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
                        {t.phases.flightDetails.steps.bookingNumber.label}
                      </label>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {
                        t.phases.flightDetails.steps.bookingNumber.validation
                          .format
                      }
                    </p>
                  </div>
                </AccordionCard>
              </div>

              <div className="flex justify-between mt-8">
                <BackButton
                  onClick={handleBack}
                  text={t.phases.flightDetails.navigation.back}
                />
                <ContinueButton
                  onClick={handleContinue}
                  text={t.phases.flightDetails.navigation.continue}
                  disabled={!canContinue}
                />
              </div>
            </div>
          </main>
        </div>
      </AccordionProvider>
    </PhaseGuard>
  );
}
