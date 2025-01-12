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
import { AccordionProvider } from '@/components/shared/AccordionContext';

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
  const [isLoading, setIsLoading] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);

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
  } = useStore();

  const step2OpenedRef = useRef(false);

  // Filter answers for each wizard
  const tripExperienceAnswers = useMemo(() => {
    const relevantQuestionIds = [
      'travel_status',
      'refund_status',
      'ticket_cost',
      'alternative_flight_airline_expense',
      'alternative_flight_own_expense',
      'trip_costs',
    ];

    // Ensure we have wizardAnswers and filter out any undefined/null values
    const answers = (wizardAnswers || []).filter(
      (a): a is Answer =>
        !!a &&
        relevantQuestionIds.includes(a.questionId) &&
        a.value !== undefined &&
        a.value !== null
    );

    console.log('Filtered trip experience answers:', answers);
    return answers;
  }, [wizardAnswers]);

  const informedDateAnswers = useMemo(() => {
    const relevantQuestionIds = ['informed_date', 'specific_informed_date'];

    // Ensure we have wizardAnswers and filter out any undefined/null values
    const answers = (wizardAnswers || []).filter(
      (a): a is Answer =>
        !!a &&
        relevantQuestionIds.includes(a.questionId) &&
        a.value !== undefined &&
        a.value !== null
    );

    console.log('Filtered informed date answers:', answers);
    return answers;
  }, [wizardAnswers]);

  // Initialize state
  useEffect(() => {
    if (!mounted) {
      const initializeState = async () => {
        try {
          console.log('Initializing state...');
          setCurrentPhase(4);

          // Get saved validation state from localStorage
          const savedValidationState = localStorage.getItem(
            'tripExperienceValidationState'
          );
          let initialValidationState;

          if (savedValidationState) {
            try {
              const parsed = JSON.parse(savedValidationState);
              initialValidationState = {
                ...validationState,
                ...parsed,
                stepValidation: {
                  ...validationState.stepValidation,
                  ...parsed.stepValidation,
                },
                stepInteraction: {
                  ...validationState.stepInteraction,
                  ...parsed.stepInteraction,
                },
              };
            } catch (error) {
              console.error('Error parsing saved validation state:', error);
              // Fall back to default initialization
              initialValidationState = {
                ...validationState,
                2: false,
                3: false,
                stepValidation: {
                  ...validationState.stepValidation,
                  2: false,
                  3: false,
                },
                stepInteraction: {
                  ...validationState.stepInteraction,
                  2: false,
                  3: false,
                },
              };
            }
          } else {
            // No saved state, use default initialization
            initialValidationState = {
              ...validationState,
              2: false,
              3: false,
              stepValidation: {
                ...validationState.stepValidation,
                2: false,
                3: false,
              },
              stepInteraction: {
                ...validationState.stepInteraction,
                2: false,
                3: false,
              },
            };
          }

          updateValidationState(initialValidationState);

          // Set initial accordion based on validation state
          if (
            initialValidationState.stepValidation[2] &&
            !initialValidationState.stepValidation[3]
          ) {
            setInitialAccordion('3');
            step2OpenedRef.current = true;
          } else {
            setInitialAccordion('2');
          }

          // Clear any existing session storage
          sessionStorage.removeItem('activeAccordion');

          setMounted(true);
          console.log('State initialization complete');
        } catch (error) {
          console.error('Error initializing state:', error);
        }
      };

      initializeState();
    }
  }, [mounted, setCurrentPhase, validationState, updateValidationState]);

  // Add effect to persist validation state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'tripExperienceValidationState',
        JSON.stringify(validationState)
      );
    }
  }, [mounted, validationState]);

  // Add effect for step 3 auto-opening
  useEffect(() => {
    if (
      validationState.stepValidation[2] &&
      !validationState.stepValidation[3] &&
      !step2OpenedRef.current
    ) {
      setInitialAccordion('3');
      step2OpenedRef.current = true;
    }
  }, [validationState.stepValidation]);

  const isTripExperienceValid = useMemo(() => {
    // Check if all required questions are answered first
    const travelStatus = tripExperienceAnswers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;

    if (!travelStatus) return false;

    // Additional validation based on travel status
    let isValid = false;
    switch (travelStatus) {
      case 'none':
        // Need refund status
        const hasRefundStatus = tripExperienceAnswers.some(
          (a) => a.questionId === 'refund_status'
        );
        if (!hasRefundStatus) return false;

        // If no refund, need ticket cost
        const refundStatus = tripExperienceAnswers.find(
          (a) => a.questionId === 'refund_status'
        )?.value;
        if (refundStatus === 'no') {
          isValid = tripExperienceAnswers.some(
            (a) => a.questionId === 'ticket_cost'
          );
        } else {
          isValid = true;
        }
        break;

      case 'provided':
        // Need alternative flight
        isValid = tripExperienceAnswers.some(
          (a) => a.questionId === 'alternative_flight_airline_expense'
        );
        break;

      case 'took_alternative_own':
        // Need alternative flight and trip costs
        isValid =
          tripExperienceAnswers.some(
            (a) => a.questionId === 'alternative_flight_own_expense'
          ) && tripExperienceAnswers.some((a) => a.questionId === 'trip_costs');
        break;

      case 'self':
        // No additional questions needed
        isValid = true;
        break;

      default:
        isValid = false;
    }

    return isValid;
  }, [tripExperienceAnswers]);

  const isInformedDateValid = useMemo(() => {
    if (!validationState.stepValidation[2]) return false;

    // Check if all required questions are answered
    const informedDate = informedDateAnswers.find(
      (a) => a.questionId === 'informed_date'
    )?.value;

    if (!informedDate) return false;

    // If specific date is selected, need the date value
    if (informedDate === 'specific_date') {
      return informedDateAnswers.some(
        (a) => a.questionId === 'specific_informed_date'
      );
    }

    return true;
  }, [validationState.stepValidation, informedDateAnswers]);

  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      const store = useStore.getState();
      console.log('TripExperience - handleAutoTransition:', {
        currentStepId,
        step1Valid: isTripExperienceValid,
        step2Valid: isInformedDateValid,
        validationState: store.validationState,
        interactedSteps,
      });

      const hasInteracted = interactedSteps.includes(Number(currentStepId));
      if (!hasInteracted) {
        console.log('No interaction yet for step:', currentStepId);
        return null;
      }

      if (currentStepId === '2') {
        const step1Complete = store.validationState[2];
        const step1Interacted = store.validationState.stepInteraction?.[2];
        console.log('Step 1 transition check:', {
          step1Complete,
          step1Interacted,
          isTripExperienceValid,
          shouldTransition:
            isTripExperienceValid && step1Complete && step1Interacted,
        });
        if (isTripExperienceValid && step1Complete && step1Interacted) {
          return '3';
        }
      }

      if (currentStepId === '3') {
        const step2Complete = store.validationState[3];
        const step2Interacted = store.validationState.stepInteraction?.[3];
        console.log('Step 2 transition check:', {
          step2Complete,
          step2Interacted,
          isInformedDateValid,
          shouldTransition:
            isInformedDateValid && step2Complete && step2Interacted,
        });
        if (isInformedDateValid && step2Complete && step2Interacted) {
          return null;
        }
      }

      return null;
    },
    [isTripExperienceValid, isInformedDateValid, interactedSteps]
  );

  // Handler functions for completing steps
  const handleTripExperienceComplete = useCallback((answers: Answer[]) => {
    console.log('Trip experience completed with answers:', answers);
    const lastAnswer = answers[answers.length - 1];
    const store = useStore.getState();

    console.log(
      'Current validation state before update:',
      store.validationState
    );
    store.setWizardAnswers(answers);

    if (lastAnswer) {
      store.setLastAnsweredQuestion(lastAnswer.questionId);
    }

    const newValidationState = {
      ...store.validationState,
      2: true,
      stepValidation: {
        ...store.validationState.stepValidation,
        2: true,
      },
      stepInteraction: {
        ...store.validationState.stepInteraction,
        2: true,
      },
    };

    console.log('New validation state for step 1:', newValidationState);
    store.updateValidationState(newValidationState);
    setInteractedSteps((prev) => [...new Set([...prev, 2])]);
  }, []);

  const handleInformedDateComplete = useCallback((answers: Answer[]) => {
    console.log('Informed date completed with answers:', answers);
    const lastAnswer = answers[answers.length - 1];
    const store = useStore.getState();

    console.log(
      'Current validation state before update:',
      store.validationState
    );
    store.setWizardAnswers(answers);

    if (lastAnswer) {
      store.setLastAnsweredQuestion(lastAnswer.questionId);
    }

    const newValidationState = {
      ...store.validationState,
      2: store.validationState[2] || false,
      3: true,
      stepValidation: {
        ...store.validationState.stepValidation,
        2: store.validationState.stepValidation[2] || false,
        3: true,
      },
      stepInteraction: {
        ...store.validationState.stepInteraction,
        3: true,
      },
    };

    console.log('New validation state for step 2:', newValidationState);
    store.updateValidationState(newValidationState);
    setInteractedSteps((prev) => [...new Set([...prev, 3])]);
  }, []);

  // Check if we can continue
  const canContinue = useCallback(() => {
    return (
      validationState.stepValidation[2] && validationState.stepValidation[3]
    );
  }, [validationState.stepValidation]);

  const handleBack = () => {
    const previousUrl = goToPreviousPhase();
    if (previousUrl) {
      router.push(previousUrl);
    }
  };

  const handleContinue = async () => {
    if (!canContinue()) return;

    setIsLoading(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  const handleTripExperienceInteract = useCallback(() => {
    // Update interaction state while preserving validation
    const newValidationState = {
      ...validationState,
      stepValidation: {
        ...validationState.stepValidation,
        1: validationState.stepValidation[1] || false,
        2: validationState.stepValidation[2] || false,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        1: true,
        2: validationState.stepInteraction[2] || false,
      },
    };
    updateValidationState(newValidationState);
    setInteractedSteps((prev) => [...new Set([...prev, 1])]);
  }, [validationState, updateValidationState]);

  const handleInformedDateInteract = useCallback(() => {
    // Update interaction state while preserving validation
    const newValidationState = {
      ...validationState,
      stepValidation: {
        ...validationState.stepValidation,
        1: validationState.stepValidation[1] || false,
        2: validationState.stepValidation[2] || false,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        1: validationState.stepInteraction[1] || false,
        2: true,
      },
    };
    updateValidationState(newValidationState);
    setInteractedSteps((prev) => [...new Set([...prev, 2])]);
  }, [validationState, updateValidationState]);

  const getTripExperienceSummary = useMemo(() => {
    if (tripExperienceAnswers.length === 0) return '';

    const travelStatus = tripExperienceAnswers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;

    switch (travelStatus) {
      case 'none':
        return 'Nicht gereist';
      case 'self':
        return 'Gebuchte Flüge geflogen';
      case 'provided':
        return 'Alternative Flüge von der Airline';
      case 'took_alternative_own':
        return 'Alternative Flüge auf eigene Kosten';
      default:
        return '';
    }
  }, [tripExperienceAnswers]);

  const getInformedDateSummary = useMemo(() => {
    if (informedDateAnswers.length === 0) return '';

    const informedDate = informedDateAnswers.find(
      (a) => a.questionId === 'informed_date'
    )?.value;

    if (informedDate === 'on_departure') {
      return 'Am Abflugtag informiert';
    }

    const specificDate = informedDateAnswers.find(
      (a) => a.questionId === 'specific_informed_date'
    )?.value;

    if (specificDate && typeof specificDate === 'string') {
      const date = new Date(specificDate);
      return `Informiert am ${date.toLocaleDateString('de-DE')}`;
    }

    return '';
  }, [informedDateAnswers]);

  return (
    <PhaseGuard phase={4}>
      <AccordionProvider
        onAutoTransition={handleAutoTransition}
        initialActiveAccordion={initialAccordion}
      >
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message="Lass uns über deine Reiseerfahrung sprechen. Das hilft uns zu verstehen, was passiert ist und wie wir dir helfen können." />

              {/* Trip Experience Wizard */}
              <AccordionCard
                title="Was ist mit deinem Flug passiert?"
                stepId="2"
                isCompleted={validationState.stepValidation[2]}
                hasInteracted={validationState.stepInteraction[2]}
                isValid={isTripExperienceValid}
                summary={getTripExperienceSummary}
                eyebrow="Schritt 1"
                isQA={false}
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
                stepId="3"
                isCompleted={validationState.stepValidation[3]}
                hasInteracted={validationState.stepInteraction[3]}
                isValid={isInformedDateValid}
                summary={getInformedDateSummary}
                eyebrow="Schritt 2"
                isQA={true}
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
                  disabled={!canContinue() || isLoading}
                  isLoading={isLoading}
                  text="Anspruch prüfen"
                />
              </div>
            </div>
          </main>
        </div>
      </AccordionProvider>
    </PhaseGuard>
  );
}
