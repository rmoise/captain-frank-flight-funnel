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
import { useFlightStore } from '@/lib/state/flightStore';
import { useTranslation } from '@/hooks/useTranslation';
import { SpeechBubble } from '@/components/SpeechBubble';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { ModularFlightSelector } from '@/components/booking/ModularFlightSelector';
import { accordionConfig } from '@/config/accordion';
import { getLanguageAwareUrl } from '@/lib/state/store';
import type { FlightSegmentData } from '@/types/store';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { validateBookingNumber } from '@/lib/validation/bookingValidation';

export default function FlightDetailsPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const isInitializedRef = useRef(false);
  const [bookingNumber, setLocalBookingNumber] = useState('');
  const [isBookingInputFocused, setIsBookingInputFocused] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<string[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);
  const [openSteps, setOpenSteps] = useState<string[]>(['flight-selection']);

  const {
    selectedFlights,
    setCurrentPhase,
    setSelectedFlights,
    setBookingNumber: setStoreBookingNumber,
    completePhase,
    validationState,
    updateValidationState,
    flightSegments,
    directFlight,
    selectedType,
  } = useStore();

  const flightStore = useFlightStore();

  // Initialize component
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializePhase = async () => {
      try {
        // First ensure we're in phase 3
        await setCurrentPhase(3);

        // Try to restore flight data from localStorage FIRST before any other operations
        const storedFlightData = localStorage.getItem('phase3FlightData');
        const storedPhase3State = localStorage.getItem('phase3State');
        let restoredData = null;

        // First handle flight data restoration
        if (storedFlightData) {
          try {
            const parsedData = JSON.parse(storedFlightData);
            const timestamp = parsedData.timestamp || Date.now();
            const isDataFresh = Date.now() - timestamp < 300000; // 5 minutes

            if (isDataFresh) {
              restoredData = parsedData;

              // First, immediately set the selected type to prevent default to 'direct'
              if (
                parsedData.selectedType === 'multi' ||
                parsedData.selectedType === 'direct'
              ) {
                useStore.setState((state) => ({
                  ...state,
                  selectedType: parsedData.selectedType,
                }));
              }

              // Ensure we have at least 2 segments for multi-city
              const flightSegmentsToUse =
                parsedData.flightSegments?.map(
                  (segment: FlightSegmentData) => ({
                    ...segment,
                    fromLocation: segment.fromLocation || null,
                    toLocation: segment.toLocation || null,
                    date: segment.date ? new Date(segment.date) : null,
                    selectedFlight: segment.selectedFlight || null,
                  })
                ) || [];

              if (
                parsedData.selectedType === 'multi' &&
                flightSegmentsToUse.length < 2
              ) {
                flightSegmentsToUse.push({
                  fromLocation: null,
                  toLocation: null,
                  selectedFlight: null,
                  date: null,
                });
              }

              // Update all stores synchronously
              await Promise.all([
                // Update main store with segments (type is already set)
                new Promise<void>((resolve) => {
                  useStore.setState((state) => ({
                    ...state,
                    flightSegments: flightSegmentsToUse,
                  }));
                  resolve();
                }),

                // Update flight store
                ...(parsedData.selectedFlights?.length > 0
                  ? [
                      flightStore.setSelectedFlights(
                        parsedData.selectedFlights
                      ),
                      flightStore.setOriginalFlights(
                        parsedData.selectedFlights
                      ),
                      new Promise<void>((resolve) => {
                        setSelectedFlights(parsedData.selectedFlights);
                        resolve();
                      }),
                    ]
                  : []),
              ]);

              // Force a small delay to ensure state updates are processed
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          } catch (error) {
            console.error('Error restoring flight data:', error);
          }
        }

        // Then handle phase 3 state restoration (including booking number and validation)
        if (storedPhase3State) {
          try {
            const parsedState = JSON.parse(storedPhase3State);

            // First restore the booking number from stored state
            const storedBookingNumber = parsedState.bookingNumber || '';
            setLocalBookingNumber(storedBookingNumber);
            setStoreBookingNumber(storedBookingNumber);

            // Validate the booking number
            const bookingValidation =
              validateBookingNumber(storedBookingNumber);

            // Create initial validation state
            const initialValidationState = {
              isFlightValid:
                parsedState.validationState?.isFlightValid ?? false,
              isBookingValid: bookingValidation.isValid,
              stepValidation: {
                ...(parsedState.validationState?.stepValidation ?? {}),
                1: parsedState.validationState?.stepValidation?.[1] ?? false,
                2: bookingValidation.isValid,
              },
              stepInteraction: {
                ...(parsedState.validationState?.stepInteraction ?? {}),
                1: parsedState.validationState?.stepInteraction?.[1] ?? false,
                2: !!storedBookingNumber,
              },
              errors: bookingValidation.errors,
              _timestamp: Date.now(),
              1: parsedState.validationState?.stepValidation?.[1] ?? false,
              2: bookingValidation.isValid,
            };

            // Update validation state in store
            updateValidationState(initialValidationState);

            // Save the complete state for all phases
            const sharedState = {
              flightSegments: flightSegments.map((segment) => ({
                ...segment,
                date: segment.date ? formatDateForDisplay(segment.date) : null,
                selectedFlight: segment.selectedFlight,
                fromLocation: segment.fromLocation,
                toLocation: segment.toLocation,
              })),
              selectedType,
              bookingNumber: storedBookingNumber,
              validationState: initialValidationState,
              _timestamp: Date.now(),
            };

            // Save state for each phase
            [1, 2, 3].forEach((phase) => {
              const phaseState = {
                ...sharedState,
                currentPhase: phase,
              };
              localStorage.setItem(
                `phase${phase}State`,
                JSON.stringify(phaseState)
              );
            });

            // Log validation state restoration
            console.log('=== Restored Booking Validation State ===', {
              storedBookingNumber,
              validationResult: bookingValidation,
              validationState: initialValidationState,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Error restoring phase 3 state:', error);
          }
        }

        // Get the current state after all updates
        const currentState = useStore.getState();
        const currentFlightStore = {
          selectedFlights: flightStore.selectedFlights,
          originalFlights: flightStore.originalFlights,
        };

        // Now log the initialization state after all updates
        console.log('=== Flight Details Page Initialization ===', {
          storedBookingNumber: currentState.bookingNumber,
          selectedFlights: currentState.selectedFlights.length,
          flightStoreFlights: currentFlightStore.selectedFlights.length,
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
          restoredFromStorage: !!restoredData,
        });

        // Check if this is actually first visit
        const hasExistingData =
          currentState.selectedFlights.length > 0 || currentState.bookingNumber;
        setIsFirstVisit(!hasExistingData);

        // Get the last active accordion from session storage
        const lastActiveAccordion = sessionStorage.getItem('activeAccordion');
        setInitialAccordion(
          lastActiveAccordion || (hasExistingData ? null : 'flight-selection')
        );

        // Initialize open steps
        setOpenSteps(['flight-selection']);

        setMounted(true);
      } catch (error) {
        console.error('Error during phase initialization:', error);
      }
    };

    initializePhase();
  }, [
    setCurrentPhase,
    setLocalBookingNumber,
    setStoreBookingNumber,
    updateValidationState,
    setSelectedFlights,
    flightStore,
    setIsFirstVisit,
    setInitialAccordion,
    setOpenSteps,
    flightSegments,
    selectedType,
  ]);

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
        validationState: validationState.stepValidation,
        isFlightValid: validationState.stepValidation[1],
        isBookingValid: validationState.stepValidation[2],
      });

      // Only allow transition if the current step is fully validated
      if (currentStepId === 'flight-selection') {
        const isFlightValid = validationState.stepValidation[1];
        return isFlightValid ? 'booking-number' : null;
      }
      return null;
    },
    [validationState.stepValidation]
  );

  // Update ModularFlightSelector validation handler
  const handleFlightValidation = useCallback(
    (state: any) => {
      const newValidationState =
        typeof state === 'function'
          ? state(validationState.stepValidation)
          : state;

      // For multi-city, ensure all segments have flights selected
      const isFlightValid =
        selectedType === 'multi'
          ? selectedFlights.length === flightSegments.length && // All segments must have flights
            selectedFlights.every(
              (flight) =>
                flight.airline &&
                flight.flightNumber &&
                flight.departureCity &&
                flight.arrivalCity &&
                flight.date
            )
          : selectedFlights.length > 0 && // Direct flight just needs one selection
            selectedFlights.every(
              (flight) =>
                flight.airline &&
                flight.flightNumber &&
                flight.departureCity &&
                flight.arrivalCity &&
                flight.date
            );

      console.log('=== Flight Validation Update ===', {
        newState: newValidationState,
        currentValidation: validationState,
        selectedFlights: selectedFlights.length,
        totalSegments: flightSegments.length,
        selectedType,
        isFlightValid,
      });

      updateValidationState({
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          1: isFlightValid,
        },
        1: isFlightValid,
        isFlightValid,
        _timestamp: Date.now(),
      });
    },
    [
      validationState,
      updateValidationState,
      selectedFlights,
      selectedType,
      flightSegments,
    ]
  );

  // Add effect to sync flight validation state
  useEffect(() => {
    if (mounted) {
      handleFlightValidation(validationState.stepValidation);
    }
  }, [mounted, selectedFlights, handleFlightValidation]);

  // Update booking number validation handler to match ModularFlightSelector pattern
  const handleBookingNumberChange = (value: string) => {
    setLocalBookingNumber(value);
    setStoreBookingNumber(value);

    // Use the new validation system
    const validationResult = validateBookingNumber(value);

    // Create a consistent validation state update
    const validationUpdate = {
      isFlightValid: validationState.isFlightValid,
      isBookingValid: validationResult.isValid,
      stepValidation: {
        ...validationState.stepValidation,
        1: validationState.stepValidation[1],
        2: validationResult.isValid,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        1: validationState.stepInteraction[1] ?? false,
        2: true,
      },
      errors: validationResult.errors,
      _timestamp: Date.now(),
      1: validationState.stepValidation[1],
      2: validationResult.isValid,
    };

    // Update the validation state
    updateValidationState(validationUpdate);

    // Save the complete state for all relevant phases
    const sharedState = {
      flightSegments: flightSegments.map((segment) => ({
        ...segment,
        date: segment.date ? formatDateForDisplay(segment.date) : null,
        selectedFlight: segment.selectedFlight,
        fromLocation: segment.fromLocation,
        toLocation: segment.toLocation,
      })),
      selectedType,
      bookingNumber: value,
      _timestamp: Date.now(),
    };

    // Save state for each phase with its specific validation state
    const phases = [1, 2, 3];
    phases.forEach((phase) => {
      const phaseState = {
        ...sharedState,
        currentPhase: phase,
        validationState: validationUpdate,
      };
      localStorage.setItem(`phase${phase}State`, JSON.stringify(phaseState));
    });

    // Log validation update for debugging
    console.log('=== Booking Number Validation Update ===', {
      value,
      validationResult,
      validationState: validationUpdate,
      timestamp: new Date().toISOString(),
    });
  };

  // Add effect to persist validation state across phase transitions
  useEffect(() => {
    if (!mounted) return;

    const persistValidationState = () => {
      const currentValidationState = {
        ...validationState,
        _timestamp: Date.now(),
      };

      const sharedState = {
        flightSegments: flightSegments.map((segment) => ({
          ...segment,
          date: segment.date ? formatDateForDisplay(segment.date) : null,
          selectedFlight: segment.selectedFlight,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
        })),
        selectedType,
        bookingNumber,
        _timestamp: Date.now(),
      };

      // Save state for each phase
      [1, 2, 3].forEach((phase) => {
        const phaseState = {
          ...sharedState,
          currentPhase: phase,
          validationState: currentValidationState,
        };
        localStorage.setItem(`phase${phase}State`, JSON.stringify(phaseState));
      });
    };

    persistValidationState();
  }, [mounted, validationState, flightSegments, selectedType, bookingNumber]);

  const canContinue = useMemo(() => {
    return (
      validationState.stepValidation[1] && validationState.stepValidation[2]
    );
  }, [validationState.stepValidation]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    try {
      // Save the current flight data to localStorage before transitioning
      const flightData = {
        selectedFlights,
        flightSegments,
        directFlight,
        selectedType,
        timestamp: Date.now(),
      };
      localStorage.setItem('phase3FlightData', JSON.stringify(flightData));

      // Store the selected flights from phase 3 as original flights for comparison in phase 4
      // But don't set them as selected flights for phase 4
      await flightStore.setOriginalFlights(selectedFlights);

      // Clear any previously selected flights for phase 4
      await flightStore.setSelectedFlights([]);

      // Complete phase 3 and move to phase 4
      await completePhase(3);
      await setCurrentPhase(4);

      // Navigate to the next page
      router.push(`/${lang}/phases/trip-experience`);
    } catch (error) {
      console.error('Error during phase transition:', error);
    }
  }, [
    canContinue,
    completePhase,
    setCurrentPhase,
    router,
    lang,
    selectedFlights,
    flightStore,
    flightSegments,
    directFlight,
    selectedType,
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

    // Save current validation state before transitioning
    const currentState = {
      flightSegments: flightSegments.map((segment) => ({
        ...segment,
        date: segment.date ? formatDateForDisplay(segment.date) : null,
        selectedFlight: segment.selectedFlight,
        fromLocation: segment.fromLocation,
        toLocation: segment.toLocation,
      })),
      selectedType,
      currentPhase: 2,
      validationState: {
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          1: validationState.stepValidation[1],
          2: validationState.stepValidation[2],
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          1: validationState.stepInteraction[1],
          2: validationState.stepInteraction[2],
        },
      },
      bookingNumber,
      _timestamp: Date.now(),
    };

    // Save state for both phases to ensure validation persists
    localStorage.setItem('phase2State', JSON.stringify(currentState));
    localStorage.setItem(
      'phase1State',
      JSON.stringify({
        ...currentState,
        currentPhase: 1,
      })
    );

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
                    handleInteraction('flight-selection');
                  }}
                >
                  <div className="space-y-6">
                    <ModularFlightSelector
                      showFlightSearch={true}
                      showFlightDetails={false}
                      currentPhase={3}
                      disabled={false}
                      stepNumber={1}
                      setValidationState={handleFlightValidation}
                      onSelect={() => {}}
                      onInteract={() => handleInteraction('flight-selection')}
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
                    handleInteraction('booking-number');
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
