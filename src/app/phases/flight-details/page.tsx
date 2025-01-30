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
import type { Flight, FlightSegmentData } from '@/types/store';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { validateBookingNumber } from '@/lib/validation/bookingValidation';

export default function FlightDetailsPage() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [mounted, setMounted] = useState<boolean>(false);
  const isInitializedRef = useRef<boolean>(false);
  const [bookingNumber, setLocalBookingNumber] = useState<string>('');
  const [isBookingInputFocused, setIsBookingInputFocused] =
    useState<boolean>(false);
  const [interactedSteps, setInteractedSteps] = useState<string[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);
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
    currentPhase,
  } = useStore();

  const flightStore = useFlightStore();

  // Helper function to validate restored flight data
  function validateFlightData(data: {
    selectedType: 'direct' | 'multi';
    directFlight?: {
      fromLocation: string;
      toLocation: string;
      selectedFlight: Flight;
    };
    flightSegments?: Array<{
      fromLocation: string;
      toLocation: string;
      selectedFlight: Flight;
      date: string;
    }>;
  }): boolean {
    if (data.selectedType === 'direct') {
      return !!(
        data.directFlight?.fromLocation &&
        data.directFlight?.toLocation &&
        data.directFlight?.selectedFlight
      );
    } else {
      const segments = data.flightSegments || [];
      return (
        segments.length > 0 &&
        segments.every(
          (segment) =>
            segment.fromLocation &&
            segment.toLocation &&
            segment.selectedFlight &&
            segment.date
        )
      );
    }
  }

  // Initialize component
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    const initializePhase = async () => {
      try {
        // First ensure we're in phase 3
        await setCurrentPhase(3);

        // Check if we're coming from a previous phase
        const phase2State = localStorage.getItem('phase2State');
        const isComingFromPreviousPhase =
          phase2State &&
          JSON.parse(phase2State).validationState?.stepValidation?.[2];

        // Try to restore flight data from localStorage FIRST before any other operations
        const storedFlightData = localStorage.getItem('phase3FlightData');
        let restoredData = null;

        // First handle flight data restoration
        if (storedFlightData) {
          try {
            const parsedData = JSON.parse(storedFlightData);
            const timestamp = parsedData.timestamp || Date.now();
            const isDataFresh = Date.now() - timestamp < 300000; // 5 minutes

            if (isDataFresh) {
              restoredData = parsedData;

              // First, immediately set the selected type and booking number
              if (
                parsedData.selectedType === 'multi' ||
                parsedData.selectedType === 'direct'
              ) {
                const storedBookingNumber = parsedData.bookingNumber || '';

                // Update both local state and store state for booking number
                setLocalBookingNumber(storedBookingNumber);
                setStoreBookingNumber(storedBookingNumber);

                useStore.setState((state) => ({
                  ...state,
                  selectedType: parsedData.selectedType,
                  bookingNumber: storedBookingNumber,
                }));
              }

              // Ensure we have at least 2 segments for multi-city
              const flightSegmentsToUse =
                parsedData.flightSegments?.map(
                  (segment: FlightSegmentData) => ({
                    ...segment,
                    fromLocation: segment.fromLocation || null,
                    toLocation: segment.toLocation || null,
                    date: segment.date || null,
                    selectedFlight: segment.selectedFlight || null,
                  })
                ) || [];

              // Update flight store first with the exact dates from storage
              if (parsedData.selectedFlights?.length > 0) {
                const processedFlights = parsedData.selectedFlights.map(
                  (flight: Flight) => ({
                    ...flight,
                    date: flight.date || null,
                  })
                );

                await Promise.all([
                  flightStore.setSelectedFlights(processedFlights),
                  flightStore.setOriginalFlights(processedFlights),
                  flightStore.setSelectedDate(
                    processedFlights[0]?.date || null
                  ),
                  new Promise<void>((resolve) => {
                    setSelectedFlights(processedFlights);
                    resolve();
                  }),
                ]);
              }

              // Then update main store with the exact dates
              await new Promise<void>((resolve) => {
                useStore.setState((state) => ({
                  ...state,
                  selectedType: parsedData.selectedType,
                  selectedDate: parsedData.selectedFlights?.[0]?.date || null,
                  flightSegments: flightSegmentsToUse,
                  directFlight: parsedData.directFlight
                    ? {
                        ...parsedData.directFlight,
                        date: parsedData.directFlight.date || null,
                        selectedFlight:
                          parsedData.directFlight.selectedFlight || null,
                        fromLocation:
                          parsedData.directFlight.fromLocation || null,
                        toLocation: parsedData.directFlight.toLocation || null,
                      }
                    : null,
                  bookingNumber: parsedData.bookingNumber || '',
                }));
                resolve();
              });

              // Force a small delay to ensure state updates are processed
              await new Promise((resolve) => setTimeout(resolve, 100));

              // Create initial validation state based on whether we're coming from a previous phase
              const initialValidationState = {
                isFlightValid: restoredData
                  ? validateFlightData(restoredData)
                  : false,
                isBookingValid: isComingFromPreviousPhase ? true : false,
                isWizardValid: false,
                isPersonalValid: false,
                isTermsValid: false,
                isSignatureValid: false,
                isWizardSubmitted: false,
                stepValidation: {
                  1: restoredData ? validateFlightData(restoredData) : false,
                  2: isComingFromPreviousPhase ? true : false,
                  3: false,
                  4: false,
                  5: false,
                },
                stepInteraction: {
                  1: !!restoredData,
                  2: isComingFromPreviousPhase ? true : false,
                  3: false,
                  4: false,
                  5: false,
                },
                errors: [],
                questionValidation: {},
                fieldErrors: {},
                stepCompleted: {
                  1: restoredData ? validateFlightData(restoredData) : false,
                  2: isComingFromPreviousPhase ? true : false,
                  3: false,
                  4: false,
                  5: false,
                },
                completedSteps: {
                  1: restoredData ? validateFlightData(restoredData) : false,
                  2: isComingFromPreviousPhase ? true : false,
                  3: false,
                  4: false,
                  5: false,
                },
                transitionInProgress: false,
                _timestamp: Date.now(),
                1: restoredData ? validateFlightData(restoredData) : false,
                2: isComingFromPreviousPhase ? true : false,
                3: false,
                4: false,
                5: false,
              };

              // Update validation state in store
              updateValidationState(initialValidationState);

              // Log restoration success with actual date values
              console.log('=== Successfully Restored Flight Data ===', {
                selectedType: parsedData.selectedType,
                flightSegments: flightSegmentsToUse.map(
                  (segment: FlightSegmentData) => ({
                    ...segment,
                    date: segment.date,
                  })
                ),
                selectedFlights: parsedData.selectedFlights?.map(
                  (flight: Flight) => ({
                    ...flight,
                    date: flight.date,
                  })
                ),
                directFlight: parsedData.directFlight
                  ? {
                      ...parsedData.directFlight,
                      date: parsedData.directFlight.date,
                    }
                  : null,
                isComingFromPreviousPhase,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error('Error restoring flight data:', error);
          }
        }

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
    currentPhase,
  ]);

  // Add effect to handle auto-opening of step 2
  useEffect(() => {
    const isFirstStepValid = validationState.stepValidation[1];
    const isBookingNumberStepClosed = !openSteps.includes('booking-number');
    const shouldOpenBookingStep = isFirstStepValid && isBookingNumberStepClosed;

    if (shouldOpenBookingStep) {
      setOpenSteps((prev: string[]) => [...prev, 'booking-number']);
    }
  }, [validationState.stepValidation, openSteps, setOpenSteps]);

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

  // Update booking number validation handler
  const handleBookingNumberChange = (value: string) => {
    setLocalBookingNumber(value);
    setStoreBookingNumber(value);

    // Update store state directly
    useStore.setState((state) => ({
      ...state,
      bookingNumber: value,
      _lastUpdate: Date.now(),
    }));

    // Check for previous phase validation
    const previousPhasesState = localStorage.getItem('phase2State');
    const hasPreviousValidation =
      previousPhasesState &&
      JSON.parse(previousPhasesState).validationState?.stepValidation?.[2];

    // If we have valid validation from previous phases, preserve it
    if (hasPreviousValidation) {
      const validationUpdate = {
        ...validationState,
        isBookingValid: true,
        stepValidation: {
          ...validationState.stepValidation,
          2: true,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: true,
        },
        errors: [],
        _timestamp: Date.now(),
        2: true,
      };

      updateValidationState(validationUpdate);
      return;
    }

    // Only validate if we don't have previous validation and we're in phase 3
    if (currentPhase === 3 && value && value.trim() !== '') {
      const validationResult = validateBookingNumber(value);
      const validationUpdate = {
        ...validationState,
        isBookingValid: validationResult.isValid,
        stepValidation: {
          ...validationState.stepValidation,
          2: validationResult.isValid,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: true,
        },
        errors: validationResult.errors,
        _timestamp: Date.now(),
        2: validationResult.isValid,
      };

      updateValidationState(validationUpdate);
    }
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

  // Add effect to persist flight data whenever it changes
  useEffect(() => {
    if (!mounted) return;

    const persistFlightData = () => {
      const currentState = useStore.getState();
      const flightData = {
        selectedType: currentState.selectedType,
        flightSegments: currentState.flightSegments.map((segment) => ({
          ...segment,
          date: segment.date,
          selectedFlight: segment.selectedFlight,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
        })),
        directFlight: currentState.directFlight
          ? {
              ...currentState.directFlight,
              date: currentState.directFlight.date,
            }
          : null,
        bookingNumber: currentState.bookingNumber,
        selectedFlights: currentState.selectedFlights.map((flight: Flight) => ({
          ...flight,
          date: flight.date,
        })),
        _timestamp: Date.now(),
      };

      localStorage.setItem('phase3FlightData', JSON.stringify(flightData));

      // Also update phase3State
      const phase3State = {
        flightSegments: currentState.flightSegments.map((segment) => ({
          ...segment,
          date: segment.date,
          selectedFlight: segment.selectedFlight,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
        })),
        selectedType: currentState.selectedType,
        bookingNumber: currentState.bookingNumber,
        validationState: currentState.validationState,
        currentPhase: 3,
        _timestamp: Date.now(),
      };

      localStorage.setItem('phase3State', JSON.stringify(phase3State));
    };

    persistFlightData();
  }, [mounted, selectedFlights, flightSegments, selectedType, bookingNumber]);

  const canContinue = useMemo(() => {
    return (
      validationState.stepValidation[1] && validationState.stepValidation[2]
    );
  }, [validationState.stepValidation]);

  const handleContinue = useCallback(async () => {
    if (!canContinue) return;

    try {
      // Save the complete flight data to localStorage before transitioning
      const flightData = {
        selectedFlights,
        flightSegments: flightSegments.map((segment) => ({
          ...segment,
          date: segment.date ? formatDateForDisplay(segment.date) : null,
          selectedFlight: segment.selectedFlight,
          fromLocation: segment.fromLocation,
          toLocation: segment.toLocation,
        })),
        directFlight: directFlight
          ? {
              ...directFlight,
              date: directFlight.date
                ? formatDateForDisplay(directFlight.date)
                : null,
              selectedFlight: directFlight.selectedFlight,
              fromLocation: directFlight.fromLocation,
              toLocation: directFlight.toLocation,
            }
          : null,
        selectedType,
        bookingNumber,
        validationState,
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
    bookingNumber,
    validationState,
  ]);

  const handleInteraction = useCallback(
    (step: string) => {
      if (!interactedSteps.includes(step)) {
        setInteractedSteps((prev: string[]) => [...prev, step]);
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
