'use client';

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { FlightSelector } from '@/components/booking/FlightSelector';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { accordionConfig } from '@/config/accordion';

export default function FlightDetailsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [bookingNumber, setLocalBookingNumber] = useState('');
  const [isBookingInputFocused, setIsBookingInputFocused] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [openSteps, setOpenSteps] = useState<number[]>([]);
  const [, setValidationState] = useState<Record<number, boolean>>({});
  const phaseInitialized = useRef(false);
  const initRef = useRef(false);

  const {
    selectedFlights,
    setCurrentPhase,
    goToPreviousPhase,
    completedSteps,
    bookingNumber: storedBookingNumber,
    setSelectedFlights,
    setBookingNumber: setStoreBookingNumber,
    completePhase,
  } = useStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize store and phase
  useEffect(() => {
    if (!phaseInitialized.current) {
      phaseInitialized.current = true;
      setCurrentPhase(3);

      // Set local booking number if not already set
      if (!bookingNumber) {
        setLocalBookingNumber(storedBookingNumber || '');
      }

      // Only open step 1 initially
      setOpenSteps([1]);
    }
  }, [setCurrentPhase, storedBookingNumber, bookingNumber]);

  // Keep flight selection accordion open when a flight is selected
  useEffect(() => {
    if (selectedFlights?.[0] && !openSteps.includes(1)) {
      setOpenSteps((prev) => [...prev, 1]);
    }
  }, [selectedFlights, openSteps, setOpenSteps]);

  // Sync local booking number with store
  useEffect(() => {
    if (storedBookingNumber) {
      setLocalBookingNumber(storedBookingNumber);
    }
  }, [storedBookingNumber]);

  const isStepCompleted = useCallback(
    (step: number) => completedSteps.includes(step),
    [completedSteps]
  );

  // Automatically open step 2 when step 1 is completed
  useEffect(() => {
    if (isStepCompleted(1)) {
      setOpenSteps((prev) => Array.from(new Set([...prev, 2])));
    }
  }, [isStepCompleted]);

  const handleBookingNumberChange = (value: string) => {
    setLocalBookingNumber(value);
    setStoreBookingNumber(value);

    // Validate the booking number
    const isValid =
      value.trim().length >= 6 && /^[A-Z0-9]+$/i.test(value.trim());

    // Update validation state
    setValidationState((prev) => ({
      ...prev,
      2: isValid,
    }));
  };

  const canContinue = useMemo(() => {
    return isStepCompleted(1) && isStepCompleted(2);
  }, [isStepCompleted]);

  const handleContinue = useCallback(() => {
    if (canContinue) {
      completePhase(3);
      router.push('/phases/trip-experience');
    }
  }, [canContinue, router, completePhase]);

  const handleInteraction = useCallback(
    (step: number) => {
      if (!interactedSteps.includes(step)) {
        setInteractedSteps((prev) => [...prev, step]);
      }
    },
    [interactedSteps]
  );

  const handleBack = () => {
    const previousUrl = goToPreviousPhase();
    if (previousUrl) {
      router.push(previousUrl);
    }
  };

  // Initialize with step 1 open
  useEffect(() => {
    if (!mounted && !initRef.current) {
      initRef.current = true;
      setOpenSteps([1]);
    }
  }, [mounted, setOpenSteps, openSteps]);

  return (
    <PhaseGuard phase={3}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Bitte gib uns zusätzliche Details zu deinem Flug." />

            <div className="space-y-4">
              <AccordionCard
                title="Wähle deinen Flug"
                eyebrow="Schritt 1"
                summary="Ihre Flugdaten"
                isCompleted={isStepCompleted(1)}
                hasInteracted={interactedSteps.includes(1)}
                className={accordionConfig.padding.wrapper}
                shouldStayOpen={false}
                isOpenByDefault={true}
                isOpen={openSteps.includes(1)}
                stepId="flight-selection"
                onToggle={() => {
                  const isCurrentlyOpen = openSteps.includes(1);
                  if (!isCurrentlyOpen) {
                    setOpenSteps((prev) => [...prev, 1]);
                  } else {
                    setOpenSteps((prev) => prev.filter((id) => id !== 1));
                  }
                }}
              >
                <div className={accordionConfig.padding.content}>
                  <FlightSelector
                    onSelect={(flight) => {
                      handleInteraction(1);
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
                    setValidationState={(
                      state:
                        | Record<number, boolean>
                        | ((
                            prev: Record<number, boolean>
                          ) => Record<number, boolean>)
                    ) => {
                      // Update validation state for step 1
                      if (typeof state === 'function') {
                        setValidationState(state);
                      } else {
                        setValidationState((prev) => ({
                          ...prev,
                          1: state[1] || false,
                        }));
                      }
                    }}
                  />
                </div>
              </AccordionCard>

              <AccordionCard
                title="Gib deine Buchungsnummer ein"
                eyebrow="Schritt 2"
                summary="Gib deine Buchungsreferenz ein"
                isCompleted={isStepCompleted(2)}
                hasInteracted={interactedSteps.includes(2)}
                className={accordionConfig.padding.wrapper}
                shouldStayOpen={false}
                isOpenByDefault={isStepCompleted(2)}
                isOpen={openSteps.includes(2)}
                stepId="booking-number"
                onToggle={() => {
                  const isCurrentlyOpen = openSteps.includes(2);
                  if (!isCurrentlyOpen) {
                    setOpenSteps((prev) => [...prev, 2]);
                  } else {
                    setOpenSteps((prev) => prev.filter((id) => id !== 2));
                  }
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
                        handleInteraction(2);
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
                      Buchungsnummer
                    </label>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Dein PNR (Passenger Name Record) ist ein 6- oder
                    13-stelliger Code, der auf deiner Buchungsbestätigung oder
                    deinem E-Ticket zu finden ist.
                  </p>
                </div>
              </AccordionCard>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton onClick={handleBack} />
              <ContinueButton
                onClick={handleContinue}
                disabled={!canContinue}
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
