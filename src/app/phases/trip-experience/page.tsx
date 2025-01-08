'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { useStore } from '@/lib/state/store';
import { Answer } from '@/types/wizard';
import { Question } from '@/types/experience';
import { QAWizard } from '@/components/wizard/QAWizard';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { accordionConfig } from '@/config/accordion';
import { PHASE_TO_URL } from '@/lib/state/store';
import { isValidYYYYMMDD } from '@/utils/dateUtils';
import api from '@/services/api';

const questions: Question[] = [
  {
    id: 'travel_status',
    text: 'Bitte wähle aus, was passiert ist:',
    type: 'radio',
    options: [
      {
        id: 'none',
        value: 'none',
        label: 'Ich bin überhaupt nicht gereist',
        showConfetti: true,
      },
      {
        id: 'self',
        value: 'self',
        label: 'Ich bin die Flüge geflogen, die ich gebucht hatte',
      },
      {
        id: 'provided',
        value: 'provided',
        label: 'Ich bin anders gereist, auf Kosten der Fluggesellschaft',
        showConfetti: true,
      },
      {
        id: 'alternative_own',
        value: 'took_alternative_own',
        label: 'Ich bin anders gereist, auf eigene Kosten',
        showConfetti: true,
      },
    ],
  },
  {
    id: 'refund_status',
    text: 'Wurden deine Ticket Kosten erstattet?',
    type: 'radio',
    options: [
      { id: 'yes', value: 'yes', label: 'Ja' },
      { id: 'no', value: 'no', label: 'Nein' },
    ],
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) => a.questionId === 'travel_status' && a.value === 'none'
      ),
  },
  {
    id: 'ticket_cost',
    text: 'Wie viel hast du für dein Ticket bezahlt?',
    type: 'money',
    showIf: (answers: Answer[]) => {
      const hasNoneTravel = answers.some(
        (a: Answer) => a.questionId === 'travel_status' && a.value === 'none'
      );
      const hasNoRefund = answers.some(
        (a: Answer) => a.questionId === 'refund_status' && a.value === 'no'
      );

      return hasNoneTravel && hasNoRefund;
    },
  },
  {
    id: 'alternative_flight_airline_expense',
    text: 'Bitte suche nach dem alternativen Flug, der von der Fluggesellschaft bereitgestellt wurde.',
    label: 'Alternative Flight',
    type: 'flight_selector',
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) =>
          a.questionId === 'travel_status' && a.value === 'provided'
      ),
  },
  {
    id: 'alternative_flight_own_expense',
    text: 'Hast du deinen alternativen Flug auf deine eigenen Kosten gebucht?',
    type: 'flight_selector',
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) =>
          a.questionId === 'travel_status' && a.value === 'took_alternative_own'
      ),
  },
  {
    id: 'trip_costs',
    text: 'Bitte gib die Kosten an, die du für deine Reise ausgegeben hast.',
    type: 'money',
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) =>
          a.questionId === 'travel_status' && a.value === 'took_alternative_own'
      ),
  },
];

const informedDateQuestions: Question[] = [
  {
    id: 'informed_date',
    text: 'An welchem Datum wurdest du erstmals von der Fluggesellschaft informiert?',
    type: 'radio',
    options: [
      {
        id: 'on_departure',
        value: 'on_departure',
        label: 'Am Abflugtag',
        showCheck: true,
      },
      {
        id: 'specific_date',
        value: 'specific_date',
        label: 'An einem bestimmten Datum',
        showCheck: true,
      },
    ],
  },
  {
    id: 'specific_informed_date',
    text: 'Bitte wähle das Datum aus, an dem du informiert wurdest.',
    type: 'date',
    options: [],
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) =>
          a.questionId === 'informed_date' && a.value === 'specific_date'
      ),
  },
];

export default function TripExperiencePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const {
    wizardAnswers,
    selectedFlights,
    validationState,
    updateValidationState,
    goToPreviousPhase,
    completePhase,
    setCurrentPhase,
    setEvaluationResult,
    currentPhase,
    setWizardAnswers,
    openSteps,
    setOpenSteps,
  } = useStore();

  const initRef = useRef(false);
  const step2OpenedRef = useRef(false);

  // Filter answers for each wizard
  const tripExperienceAnswers = useMemo(() => {
    const answers =
      wizardAnswers?.filter((a) => a.questionId.startsWith('travel_status')) ??
      [];
    console.log('Filtered trip experience answers:', answers);
    return answers;
  }, [wizardAnswers]);

  const informedDateAnswers = useMemo(() => {
    const answers =
      wizardAnswers?.filter((a) => a.questionId.startsWith('informed_date')) ??
      [];
    console.log('Filtered informed date answers:', answers);
    return answers;
  }, [wizardAnswers]);

  // Handler functions for completing steps
  const handleTripExperienceComplete = useCallback((answers: Answer[]) => {
    console.log('Trip experience completed with answers:', answers);
    // Get the last answer
    const lastAnswer = answers[answers.length - 1];

    // Batch all state updates together
    const store = useStore.getState();
    store.setWizardAnswers(answers);

    if (lastAnswer) {
      store.setLastAnsweredQuestion(lastAnswer.questionId);
    }

    store.updateValidationState({
      stepValidation: {
        ...store.validationState.stepValidation,
        2: true,
      },
      stepInteraction: {
        ...store.validationState.stepInteraction,
        2: true,
      },
      2: true,
      _timestamp: Date.now(),
    });
  }, []);

  const handleInformedDateComplete = useCallback((answers: Answer[]) => {
    console.log('Informed date completed with answers:', answers);
    // Get the last answer
    const lastAnswer = answers[answers.length - 1];

    // Batch all state updates together
    const store = useStore.getState();
    store.setWizardAnswers(answers);

    if (lastAnswer) {
      store.setLastAnsweredQuestion(lastAnswer.questionId);
    }

    store.updateValidationState({
      stepValidation: {
        ...store.validationState.stepValidation,
        3: true,
      },
      stepInteraction: {
        ...store.validationState.stepInteraction,
        3: true,
      },
      3: true,
      _timestamp: Date.now(),
    });
  }, []);

  // Initialize state
  useEffect(() => {
    if (!mounted) {
      const initializeState = async () => {
        try {
          console.log('Initializing state...');
          // Set current phase
          setCurrentPhase(4);

          // Get all saved data at once
          const savedData = {
            tripExperience: localStorage.getItem('tripExperienceAnswers'),
            informedDate: localStorage.getItem('informedDateAnswers'),
            selectedFlights: localStorage.getItem('selectedFlights'),
          };
          console.log('Retrieved saved data:', savedData);

          // Get current answers from store
          const currentAnswers = useStore.getState().wizardAnswers || [];
          console.log('Current answers in store:', currentAnswers);
          let newAnswers = [...currentAnswers];

          // Process trip experience answers
          if (savedData.tripExperience) {
            try {
              const parsedAnswers = JSON.parse(savedData.tripExperience);
              console.log('Parsed trip experience answers:', parsedAnswers);
              if (Array.isArray(parsedAnswers) && parsedAnswers.length > 0) {
                // Remove any existing travel status answers
                newAnswers = newAnswers.filter(
                  (a) => !a.questionId.startsWith('travel_status')
                );
                // Add saved travel status answers
                newAnswers.push(...parsedAnswers);
              }
            } catch (error) {
              console.error(
                'Error parsing saved trip experience answers:',
                error
              );
            }
          }

          // Process informed date answers
          if (savedData.informedDate) {
            try {
              const parsedAnswers = JSON.parse(savedData.informedDate);
              console.log('Parsed informed date answers:', parsedAnswers);
              if (Array.isArray(parsedAnswers) && parsedAnswers.length > 0) {
                // Remove any existing informed date answers
                newAnswers = newAnswers.filter(
                  (a) => !a.questionId.startsWith('informed_date')
                );
                // Add saved informed date answers
                newAnswers.push(...parsedAnswers);
              }
            } catch (error) {
              console.error(
                'Error parsing saved informed date answers:',
                error
              );
            }
          }

          // Set the answers in the store
          if (newAnswers.length > 0) {
            setWizardAnswers(newAnswers);
          }

          // Process selected flights
          if (savedData.selectedFlights) {
            try {
              const parsedFlights = JSON.parse(savedData.selectedFlights);
              console.log('Parsed selected flights:', parsedFlights);
              if (Array.isArray(parsedFlights) && parsedFlights.length > 0) {
                useStore.getState().setSelectedFlights(parsedFlights);
                console.log('Set selected flights in store');
              }
            } catch (error) {
              console.error('Error parsing saved selected flights:', error);
            }
          }

          // Update validation state based on restored answers
          const store = useStore.getState();
          console.log('Current validation state:', store.validationState);

          if (
            newAnswers.some((a) => a.questionId.startsWith('travel_status'))
          ) {
            console.log('Updating validation state for travel status');
            store.updateValidationState({
              stepValidation: {
                ...store.validationState.stepValidation,
                2: true,
              },
              stepInteraction: {
                ...store.validationState.stepInteraction,
                2: true,
              },
              2: true,
              _timestamp: Date.now(),
            });
          }

          if (
            newAnswers.some((a) => a.questionId.startsWith('informed_date'))
          ) {
            console.log('Updating validation state for informed date');
            store.updateValidationState({
              stepValidation: {
                ...store.validationState.stepValidation,
                3: true,
              },
              stepInteraction: {
                ...store.validationState.stepInteraction,
                3: true,
              },
              3: true,
              _timestamp: Date.now(),
            });
          }

          console.log('Final validation state:', store.validationState);
          setMounted(true);
          console.log('State initialization complete');
        } catch (error) {
          console.error('Error initializing state:', error);
        }
      };

      initializeState();
    }
  }, [mounted, setCurrentPhase, setWizardAnswers]);

  // Initialize with step 2 open only
  useEffect(() => {
    if (!mounted && !initRef.current) {
      initRef.current = true;
      setOpenSteps([2]);
    }
  }, [mounted, setOpenSteps]);

  // Add effect to handle automatic opening of step 2 when step 1 is completed
  useEffect(() => {
    if (
      validationState.stepValidation[2] &&
      !validationState.stepValidation[3] &&
      !step2OpenedRef.current
    ) {
      // Only open step 2 if it's not already in the openSteps array and hasn't been opened before
      if (!openSteps.includes(3)) {
        setOpenSteps([...openSteps, 3]);
        step2OpenedRef.current = true;
      }
    }
  }, [validationState.stepValidation, openSteps]);

  // Save answers to localStorage when they change
  useEffect(() => {
    if (tripExperienceAnswers.length > 0) {
      console.log('Saving trip experience answers:', tripExperienceAnswers);
      localStorage.setItem(
        'tripExperienceAnswers',
        JSON.stringify(tripExperienceAnswers)
      );
    }
  }, [tripExperienceAnswers]);

  useEffect(() => {
    if (informedDateAnswers.length > 0) {
      console.log('Saving informed date answers:', informedDateAnswers);
      localStorage.setItem(
        'informedDateAnswers',
        JSON.stringify(informedDateAnswers)
      );
    }
  }, [informedDateAnswers]);

  useEffect(() => {
    if (selectedFlights.length > 0) {
      console.log('Saving selected flights:', selectedFlights);
      localStorage.setItem('selectedFlights', JSON.stringify(selectedFlights));
    }
  }, [selectedFlights]);

  // Handle component unmount
  useEffect(() => {
    return () => {
      // Save current state before unmounting
      const currentAnswers = useStore.getState().wizardAnswers || [];
      const tripAnswers = currentAnswers.filter((a) =>
        a.questionId.startsWith('travel_status')
      );
      const dateAnswers = currentAnswers.filter((a) =>
        a.questionId.startsWith('informed_date')
      );

      if (tripAnswers.length > 0) {
        localStorage.setItem(
          'tripExperienceAnswers',
          JSON.stringify(tripAnswers)
        );
      }
      if (dateAnswers.length > 0) {
        localStorage.setItem(
          'informedDateAnswers',
          JSON.stringify(dateAnswers)
        );
      }
      if (selectedFlights.length > 0) {
        localStorage.setItem(
          'selectedFlights',
          JSON.stringify(selectedFlights)
        );
      }
    };
  }, [selectedFlights]);

  // Check if we can continue
  const canContinue = useCallback(() => {
    // Check if both wizards are marked as completed in the validation state
    const travelStatusCompleted = validationState.stepValidation[2];
    const informedDateCompleted = validationState.stepValidation[3];

    return travelStatusCompleted && informedDateCompleted;
  }, [validationState.stepValidation]);

  const handleBack = () => {
    const previousUrl = goToPreviousPhase();
    if (previousUrl) {
      router.push(previousUrl);
    }
  };

  const handleContinue = async () => {
    if (!canContinue()) return;

    try {
      // Get the travel status from step 1 answers
      const travelStatus = tripExperienceAnswers.find(
        (a: Answer) => a.questionId === 'travel_status'
      )?.value;

      // Get the booked flight IDs based on travel status
      const bookedFlightIds: string[] = [];
      if (selectedFlights[0]) {
        bookedFlightIds.push(selectedFlights[0].id);
      }

      // Validate flight IDs
      if (bookedFlightIds.length === 0) {
        return;
      }

      // Get the informed date
      const informedDate = informedDateAnswers
        .find((a) => a.questionId === 'informed_date')
        ?.value?.toString();

      // Format the date for the API
      let formattedDate: string | undefined;

      if (informedDate === 'on_departure' && selectedFlights[0]?.date) {
        // Use flight date for "on departure"
        const flightDate = selectedFlights[0].date;
        // Handle both ISO string and date-only formats
        formattedDate = flightDate.includes('T')
          ? flightDate.split('T')[0]
          : flightDate;
      } else if (informedDate === 'specific_date') {
        // Get the specific date from the answers
        const specificDateAnswer = useStore
          .getState()
          .wizardAnswers.find(
            (answer) => answer.questionId === 'specific_informed_date'
          );

        if (specificDateAnswer?.value) {
          formattedDate = specificDateAnswer.value.toString();
        }
      }

      // Validate formatted date
      if (!formattedDate || !isValidYYYYMMDD(formattedDate)) {
        throw new Error('No valid date available');
      }

      // Verify the date format matches YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formattedDate)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      // Validate that the date is a valid date
      const dateObj = new Date(formattedDate);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date value. Please select a valid date.');
      }

      // Create the current evaluation data
      console.log('Travel status from answers:', travelStatus);

      const currentEvalData = {
        journey_booked_flightids: bookedFlightIds,
        journey_fact_flightids: travelStatus === 'self' ? bookedFlightIds : [], // Use booked flights if they took them
        information_received_at: formattedDate,
        travel_status:
          travelStatus === 'none'
            ? 'no_travel'
            : travelStatus === 'self'
              ? 'took_booked'
              : travelStatus === 'provided'
                ? 'took_alternative_airline'
                : travelStatus?.toString(),
        ...(travelStatus === 'none' && { delay_duration: '240' }), // Only set delay_duration for no-travel claims
        lang: 'en',
      };

      console.log('Current evaluation data:', currentEvalData);

      // Remove undefined values from the request
      const cleanedEvalData = Object.fromEntries(
        Object.entries(currentEvalData).filter(([, v]) => v !== undefined)
      );

      console.log('Cleaned evaluation data:', cleanedEvalData);

      // Create a cache key based on the evaluation data
      const cacheKey = `evaluation_${JSON.stringify(cleanedEvalData)}`;
      const cachedData = localStorage.getItem(cacheKey);

      let result;

      // Check if we have valid cached data
      if (cachedData) {
        try {
          const { data, timestamp } = JSON.parse(cachedData);
          console.log('Found cached data:', data);
          // Cache is valid for 24 hours
          if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
            result = data;
          }
        } catch (error) {
          console.error('Error parsing cached evaluation data:', error);
        }
      }

      // If no valid cache, make the API call
      if (!result) {
        console.log('Making API call with data:', cleanedEvalData);

        try {
          // Use the api client instead of direct fetch
          result = await api.evaluateClaim({
            journey_booked_flightids: Array.isArray(
              cleanedEvalData.journey_booked_flightids
            )
              ? cleanedEvalData.journey_booked_flightids
              : ([cleanedEvalData.journey_booked_flightids].filter(
                  Boolean
                ) as string[]),
            journey_fact_flightids: Array.isArray(
              cleanedEvalData.journey_fact_flightids
            )
              ? cleanedEvalData.journey_fact_flightids
              : cleanedEvalData.journey_fact_flightids
                ? [cleanedEvalData.journey_fact_flightids]
                : undefined,
            information_received_at: String(
              cleanedEvalData.information_received_at
            ),
          });
          console.log('API response:', result);

          // Cache the result
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: result,
              timestamp: Date.now(),
            })
          );
        } catch (error) {
          console.error('API call failed:', error);
          throw new Error('Failed to evaluate claim');
        }
      }

      console.log('Final result before setting:', result);

      setEvaluationResult({
        ...result,
        journey_booked_flightids: currentEvalData.journey_booked_flightids,
        information_received_at: currentEvalData.information_received_at,
        travel_status: currentEvalData.travel_status,
      });

      // Complete the current phase
      completePhase(currentPhase);

      // Get the next phase URL based on evaluation result
      const nextPhase = currentPhase + 1;
      console.log('Checking result status:', {
        resultStatus: result.status,
        resultDataStatus: result.data?.status,
      });
      const nextUrl =
        result.status === 'accept' ||
        (result.data && result.data.status === 'accept')
          ? PHASE_TO_URL[nextPhase]
          : '/phases/claim-rejected';

      console.log('Redirection decision:', {
        nextUrl,
        nextPhase,
        isAccepted:
          result.status === 'accept' ||
          (result.data && result.data.status === 'accept'),
      });

      if (nextUrl) {
        // Set the next phase in the store and navigate
        setCurrentPhase(nextPhase);
        if (
          result.status === 'reject' ||
          (result.data && result.data.status === 'reject')
        ) {
          // Add rejection reasons to URL
          const searchParams = new URLSearchParams();
          searchParams.set('reasons', JSON.stringify(result));
          router.push(`${nextUrl}?${searchParams.toString()}`);
        } else {
          router.push(nextUrl);
        }
      }
    } catch (error) {
      console.error('Error in handleContinue:', error);
    }
  };

  const handleTripExperienceInteract = useCallback(() => {
    // Only update interaction state, not validation
    updateValidationState({
      stepInteraction: {
        ...validationState.stepInteraction,
        2: true,
      },
      _timestamp: Date.now(),
    });
  }, [validationState, updateValidationState]);

  const handleInformedDateInteract = useCallback(() => {
    // Only update interaction state, not validation
    updateValidationState({
      stepInteraction: {
        ...validationState.stepInteraction,
        3: true,
      },
      _timestamp: Date.now(),
    });
  }, [validationState, updateValidationState]);

  return (
    <PhaseGuard phase={4}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Lass uns über deine Reiseerfahrung sprechen. Das hilft uns zu verstehen, was passiert ist und wie wir dir helfen können." />

            {/* Trip Experience Wizard */}
            <AccordionCard
              title="Was ist mit deinem Flug passiert?"
              eyebrow="Schritt 1"
              isOpen={openSteps.includes(2)}
              shouldStayOpen={false}
              isCompleted={validationState.stepValidation[2]}
              hasInteracted={validationState.stepInteraction[2]}
              stepId="trip-experience"
              className={accordionConfig.padding.wrapper}
              onToggle={() => {
                const isCurrentlyOpen = openSteps.includes(2);
                const newOpenSteps = isCurrentlyOpen
                  ? openSteps.filter((id) => id !== 2)
                  : [...openSteps, 2];
                setOpenSteps(newOpenSteps);
              }}
            >
              <div className={accordionConfig.padding.content}>
                <QAWizard
                  questions={questions}
                  onComplete={handleTripExperienceComplete}
                  onInteract={handleTripExperienceInteract}
                  initialAnswers={tripExperienceAnswers}
                  selectedFlight={selectedFlights[0] || null}
                />
              </div>
            </AccordionCard>

            {/* Informed Date Wizard */}
            <AccordionCard
              title="Wann wurdest du informiert?"
              eyebrow="Schritt 2"
              isOpen={openSteps.includes(3)}
              shouldStayOpen={false}
              isCompleted={validationState.stepValidation[3]}
              hasInteracted={validationState.stepInteraction[3]}
              stepId="informed-date"
              className={accordionConfig.padding.wrapper}
              onToggle={() => {
                const isCurrentlyOpen = openSteps.includes(3);
                const newOpenSteps = isCurrentlyOpen
                  ? openSteps.filter((id) => id !== 3)
                  : [...openSteps, 3];
                setOpenSteps(newOpenSteps);
              }}
            >
              <div className={accordionConfig.padding.content}>
                <QAWizard
                  questions={informedDateQuestions}
                  onComplete={handleInformedDateComplete}
                  onInteract={handleInformedDateInteract}
                  initialAnswers={informedDateAnswers}
                />
              </div>
            </AccordionCard>

            {/* Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton onClick={handleBack} text="Zurück" />
              <ContinueButton
                onClick={handleContinue}
                disabled={!canContinue()}
                text="Anspruch prüfen"
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
