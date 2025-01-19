'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { validateTripExperience } from '@/lib/state/store';

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
    originalFlights,
    validationState,
    updateValidationState,
    goToPreviousPhase,
    completePhase,
    setCurrentPhase,
    setEvaluationResult,
    currentPhase,
    setOriginalFlights,
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

  // Add effect to track selected flights changes
  useEffect(() => {
    console.log('Selected Flights Changed:', {
      selectedFlights,
      originalFlights,
      tripExperienceAnswers,
    });
  }, [selectedFlights, originalFlights, tripExperienceAnswers]);

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

  // Store original flights when component mounts
  useEffect(() => {
    if (
      selectedFlights &&
      selectedFlights.length > 0 &&
      originalFlights.length === 0
    ) {
      // Store a deep copy of the initial flights as original flights
      const initialFlights = selectedFlights.map((flight) => ({
        ...flight,
        id: flight.id,
        flightNumber: flight.flightNumber,
        date: flight.date,
        departureCity: flight.departureCity,
        arrivalCity: flight.arrivalCity,
      }));
      console.log('Setting original flights:', {
        initialFlights: initialFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
      });
      setOriginalFlights(initialFlights);
    }
  }, [selectedFlights, originalFlights.length, setOriginalFlights]);

  // Add effect to track when original flights are set
  useEffect(() => {
    if (originalFlights.length > 0) {
      console.log('Original flights updated:', {
        flights: originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
      });
    }
  }, [originalFlights]);

  const isTripExperienceValid = useMemo(() => {
    // Check if all required questions are answered first
    const travelStatus = tripExperienceAnswers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;

    console.log('Trip Experience Validation - Travel Status:', travelStatus);
    console.log('Current Trip Experience Answers:', tripExperienceAnswers);
    console.log('Selected Flights:', selectedFlights);

    if (!travelStatus) {
      console.log('Trip Experience Validation Failed: No travel status');
      return false;
    }

    // Additional validation based on travel status
    let isValid = false;
    switch (travelStatus) {
      case 'none':
        // Need refund status
        const hasRefundStatus = tripExperienceAnswers.some(
          (a) => a.questionId === 'refund_status'
        );
        console.log(
          'Travel Status "none" - Has Refund Status:',
          hasRefundStatus
        );
        if (!hasRefundStatus) {
          console.log(
            'Trip Experience Validation Failed: Missing refund status'
          );
          return false;
        }

        // If no refund, need ticket cost
        const refundStatus = tripExperienceAnswers.find(
          (a) => a.questionId === 'refund_status'
        )?.value;
        if (refundStatus === 'no') {
          isValid = tripExperienceAnswers.some(
            (a) => a.questionId === 'ticket_cost'
          );
          console.log('No Refund - Has Ticket Cost:', isValid);
        } else {
          isValid = true;
        }
        break;

      case 'provided':
        // For provided alternative flights, check if alternative flights are selected
        isValid = selectedFlights && selectedFlights.length > 0;
        console.log('Travel Status "provided" - Selected Flights:', {
          hasSelectedFlights: selectedFlights && selectedFlights.length > 0,
          selectedFlights: selectedFlights?.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
          })),
          isValid,
        });
        break;

      case 'took_alternative_own':
        // Need alternative flight and trip costs
        const hasAlternativeFlight = tripExperienceAnswers.some(
          (a) => a.questionId === 'alternative_flight_own_expense'
        );
        const hasTripCosts = tripExperienceAnswers.some(
          (a) => a.questionId === 'trip_costs'
        );
        console.log('Travel Status "took_alternative_own":', {
          hasAlternativeFlight,
          hasTripCosts,
          answers: tripExperienceAnswers.filter((a) =>
            ['alternative_flight_own_expense', 'trip_costs'].includes(
              a.questionId
            )
          ),
        });
        isValid = hasAlternativeFlight && hasTripCosts;
        break;

      case 'self':
        // No additional questions needed
        isValid = true;
        console.log('Travel Status "self" - Always valid');
        break;

      default:
        isValid = false;
        console.log('Trip Experience Validation Failed: Invalid travel status');
    }

    console.log('Trip Experience Final Validation Result:', {
      isValid,
      travelStatus,
      validationState: validationState,
      selectedFlights,
    });

    return isValid;
  }, [tripExperienceAnswers, selectedFlights, validationState]);

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

      // Only allow auto-transition if the step has been interacted with
      const stepId = Number(currentStepId) as 2 | 3;
      const hasInteracted = store.validationState.stepInteraction?.[stepId];
      if (!hasInteracted) {
        console.log('No interaction yet for step:', currentStepId);
        return null;
      }

      if (currentStepId === '2') {
        const step1Complete = store.validationState.stepValidation[2];
        console.log('Step 1 transition check:', {
          step1Complete,
          hasInteracted,
          isTripExperienceValid,
          shouldTransition:
            isTripExperienceValid && step1Complete && hasInteracted,
        });
        if (isTripExperienceValid && step1Complete && hasInteracted) {
          return '3';
        }
      }

      if (currentStepId === '3') {
        const step2Complete = store.validationState.stepValidation[3];
        console.log('Step 2 transition check:', {
          step2Complete,
          hasInteracted,
          isInformedDateValid,
          shouldTransition:
            isInformedDateValid && step2Complete && hasInteracted,
        });
        if (isInformedDateValid && step2Complete && hasInteracted) {
          return null;
        }
      }

      return null;
    },
    [isTripExperienceValid, isInformedDateValid, interactedSteps]
  );

  // Handler functions for completing steps
  const handleTripExperienceComplete = useCallback(
    (answers: Answer[]) => {
      console.log('Trip Experience Complete Handler Called:', {
        answers,
        currentValidationState: validationState,
      });

      const lastAnswer = answers[answers.length - 1];
      const store = useStore.getState();

      console.log('Current store state:', {
        wizardAnswers: store.wizardAnswers,
        selectedFlights: store.selectedFlights,
        validationState: store.validationState,
      });

      store.setWizardAnswers(answers);

      if (lastAnswer) {
        store.setLastAnsweredQuestion(lastAnswer.questionId);
      }

      // Only validate when Complete is clicked
      const isValid = validateTripExperience(store);

      const newValidationState = {
        ...store.validationState,
        2: isValid,
        stepValidation: {
          ...store.validationState.stepValidation,
          2: isValid,
        },
        stepInteraction: {
          ...store.validationState.stepInteraction,
          2: true,
        },
      };

      console.log('New validation state to be applied:', newValidationState);
      store.updateValidationState(newValidationState);
    },
    [validationState]
  );

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

    // Only update validation state when Complete is clicked
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
      console.log('=== TRIP EXPERIENCE DEBUG LOGS ===');
      console.log('1. Raw Travel Status:', {
        travelStatus,
        allAnswers: tripExperienceAnswers,
      });

      // Get the originally booked flights
      const bookedFlightIds = originalFlights
        .filter((flight) => flight && flight.id)
        .map((flight) => String(flight.id));

      console.log('2. Selected Flights Data:', {
        selectedFlights: selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
        originalFlights: originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
        bookedFlightIds,
      });

      // Validate flight IDs
      if (bookedFlightIds.length === 0) {
        console.error('No booked flight IDs available');
        return;
      }

      // Get alternative flight IDs based on travel status
      const getAlternativeFlightIds = () => {
        if (travelStatus === 'provided') {
          // For provided alternative flights, use all selected flights as alternatives
          // since they represent the airline-provided alternatives
          return selectedFlights.map((flight) => String(flight.id));
        } else if (travelStatus === 'took_alternative_own') {
          const ownAlternativeFlightAnswer = tripExperienceAnswers.find(
            (a) => a.questionId === 'alternative_flight_own_expense'
          );
          console.log('3b. Alternative Flight (Own):', {
            answer: ownAlternativeFlightAnswer,
            value: ownAlternativeFlightAnswer?.value,
          });
          return ownAlternativeFlightAnswer?.value
            ? [String(ownAlternativeFlightAnswer.value)]
            : [];
        }
        return [];
      };

      const alternativeIds = getAlternativeFlightIds();
      console.log('7. Flight IDs Summary:', {
        bookedFlightIds,
        alternativeIds,
        travelStatus,
      });

      // Get the informed date and handle timezone consistently
      const informedDate = informedDateAnswers
        .find((a) => a.questionId === 'informed_date')
        ?.value?.toString();

      console.log('4. Informed Date Raw:', {
        informedDate,
        allDateAnswers: informedDateAnswers,
      });

      // Format the date without timezone conversion
      const formattedDate = (() => {
        if (!informedDate || informedDate === 'none') return '';

        // For specific dates, use the date as is without timezone conversion
        if (
          informedDate === 'specific_date' &&
          informedDateAnswers.length > 0
        ) {
          const dateAnswer = informedDateAnswers.find(
            (a) => a.questionId === 'specific_informed_date'
          );
          if (dateAnswer?.value && typeof dateAnswer.value === 'string') {
            // Ensure the date is in YYYY-MM-DD format without timezone conversion
            const [year, month, day] = dateAnswer.value.split('-');
            if (year && month && day) {
              const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              console.log('5b. Date Formatting (Specific Date):', {
                originalDate: dateAnswer.value,
                formattedDate,
                noTimezoneConversion: true,
              });
              return formattedDate;
            }
          }
        }
        return '';
      })();

      // Validate formatted date
      if (!formattedDate || !isValidYYYYMMDD(formattedDate)) {
        console.error('6. Date Validation Failed:', {
          formattedDate,
          isValid: formattedDate ? isValidYYYYMMDD(formattedDate) : false,
        });
        throw new Error('No valid date available');
      }

      const currentEvalData = {
        journey_booked_flightids: originalFlights.map((flight) =>
          String(flight.id)
        ),
        journey_fact_flightids: (() => {
          if (travelStatus === 'provided') {
            // For provided alternative flights, we should use only the selected flights
            // that are different from the original booking
            return selectedFlights
              .filter(
                (flight) =>
                  !originalFlights.some((orig) => orig.id === flight.id)
              )
              .map((flight) => String(flight.id));
          } else if (travelStatus === 'took_alternative_own') {
            const ownAlternativeFlightAnswer = tripExperienceAnswers.find(
              (a) => a.questionId === 'alternative_flight_own_expense'
            );
            return ownAlternativeFlightAnswer?.value
              ? [String(ownAlternativeFlightAnswer.value)]
              : [];
          }
          return [];
        })(),
        information_received_at: formattedDate,
        journey_fact_type: (() => {
          switch (travelStatus) {
            case 'none':
              return 'none';
            case 'self':
              return 'self';
            case 'provided':
              return 'provided';
            case 'took_alternative_own':
              return 'none';
            default:
              return 'none';
          }
        })(),
        travel_status:
          travelStatus === 'none'
            ? 'no_travel'
            : travelStatus === 'self'
              ? 'took_booked'
              : travelStatus === 'provided'
                ? 'took_alternative_airline'
                : travelStatus === 'took_alternative_own'
                  ? 'took_alternative_own'
                  : travelStatus?.toString(),
        lang: 'en',
      };

      // Add debug logging for flight IDs
      console.log('Flight ID Debug:', {
        originalFlights: originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
        selectedFlights: selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
        bookedFlightIds: currentEvalData.journey_booked_flightids,
        alternativeFlightIds: currentEvalData.journey_fact_flightids,
        travelStatus,
      });

      console.log('=== Evaluation Data ===');
      console.log('Current Eval Data:', currentEvalData);

      console.log('8. Final Evaluation Data:', {
        raw: currentEvalData,
        cleaned: Object.fromEntries(
          Object.entries(currentEvalData).filter(([, v]) => v !== undefined)
        ),
        flightIdExplanation: `journey_fact_flightids is ${currentEvalData.journey_fact_flightids.length === 0 ? 'empty' : 'populated'} because travel_status is ${travelStatus}`,
      });
      console.log('=== END DEBUG LOGS ===');

      // Add new logging for actual travel data
      console.log('=== ACTUAL TRAVEL DATA ===');
      console.log(
        'Selected Flights:',
        selectedFlights.map((flight) => ({
          flightNumber: flight.flightNumber,
          date: flight.date,
          from: flight.departureCity,
          to: flight.arrivalCity,
          id: flight.id,
        }))
      );
      console.log('=== END ACTUAL TRAVEL DATA ===');

      console.log('Evaluation data being sent:', currentEvalData);

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

  // Add logging to track when validation is checked
  useEffect(() => {
    console.log('Trip Experience Validation Check:', {
      tripExperienceAnswers,
      selectedFlights,
      isValid: isTripExperienceValid,
    });
  }, [tripExperienceAnswers, selectedFlights, isTripExperienceValid]);

  // Add logging for when selected flights change
  useEffect(() => {
    if (selectedFlights && selectedFlights.length > 0) {
      console.log('Selected Flights Updated:', {
        selectedFlights: selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
      });
    }
  }, [selectedFlights]);

  // Add logging for validation state changes
  useEffect(() => {
    console.log('Validation State Updated:', {
      validationState,
      tripExperienceValid: validationState.stepValidation[2],
      informedDateValid: validationState.stepValidation[3],
    });
  }, [validationState]);

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
