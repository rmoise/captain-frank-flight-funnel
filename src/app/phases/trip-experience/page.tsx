'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore, getLanguageAwareUrl } from '@/lib/state/store';
import { Answer, Question } from '@/types/store';
import { QAWizard } from '@/components/wizard/QAWizard';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { accordionConfig } from '@/config/accordion';
import { isValidYYYYMMDD } from '@/utils/dateUtils';
import api from '@/services/api';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ValidationState } from '@/lib/state/types';

export default function TripExperiencePage() {
  const params = useParams();
  const lang = params?.lang as string;
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);
  const [isTripExperienceValid, setIsTripExperienceValid] = useState(false);
  const [isInformedDateValid, setIsInformedDateValid] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<
    Record<number, boolean>
  >({});
  const [isFullyCompleted, setIsFullyCompleted] = useState(false);

  const { t } = useTranslation();
  const validationState = useStore((state) => state.validationState);
  const selectedFlights = useStore((state) => state.selectedFlights);
  const {
    wizardAnswers,
    originalFlights,
    updateValidationState,
    completePhase,
    setCurrentPhase,
    currentPhase,
    setOriginalFlights,
    setWizardAnswers,
    completedPhases,
  } = useStore();

  const step2OpenedRef = useRef(false);

  const questions: Question[] = [
    {
      id: 'travel_status',
      text: t.phases.tripExperience.steps.travelStatus.questions.travelStatus
        .title,
      type: 'radio',
      options: [
        {
          id: 'none',
          value: 'none',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.none,
          showConfetti: true,
        },
        {
          id: 'self',
          value: 'self',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.self,
        },
        {
          id: 'provided',
          value: 'provided',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.provided,
          showConfetti: true,
        },
        {
          id: 'alternative_own',
          value: 'took_alternative_own',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.travelStatus
              .options.alternativeOwn,
          showConfetti: true,
        },
      ],
    },
    {
      id: 'refund_status',
      text: t.phases.tripExperience.steps.travelStatus.questions.refundStatus
        .title,
      type: 'radio',
      options: [
        {
          id: 'yes',
          value: 'yes',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.refundStatus
              .options.yes,
        },
        {
          id: 'no',
          value: 'no',
          label:
            t.phases.tripExperience.steps.travelStatus.questions.refundStatus
              .options.no,
        },
      ],
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) => a.questionId === 'travel_status' && a.value === 'none'
        ),
    },
    {
      id: 'ticket_cost',
      text: t.phases.tripExperience.steps.travelStatus.questions.ticketCost
        .title,
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
      text: t.phases.tripExperience.steps.travelStatus.questions
        .alternativeFlightAirlineExpense.title,
      label:
        t.phases.tripExperience.steps.travelStatus.questions
          .alternativeFlightAirlineExpense.label,
      type: 'flight_selector',
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === 'travel_status' && a.value === 'provided'
        ),
    },
    {
      id: 'alternative_flight_own_expense',
      text: t.phases.tripExperience.steps.travelStatus.questions
        .alternativeFlightOwnExpense.title,
      type: 'flight_selector',
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === 'travel_status' &&
            a.value === 'took_alternative_own'
        ),
    },
    {
      id: 'trip_costs',
      text: t.phases.tripExperience.steps.travelStatus.questions.tripCosts
        .title,
      type: 'money',
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === 'travel_status' &&
            a.value === 'took_alternative_own'
        ),
    },
  ];

  const informedDateQuestions: Question[] = [
    {
      id: 'informed_date',
      text: t.phases.tripExperience.steps.informedDate.questions.informedDate
        .title,
      type: 'radio',
      options: [
        {
          id: 'on_departure',
          value: 'on_departure',
          label:
            t.phases.tripExperience.steps.informedDate.questions.informedDate
              .options.onDeparture,
          showCheck: true,
        },
        {
          id: 'specific_date',
          value: 'specific_date',
          label:
            t.phases.tripExperience.steps.informedDate.questions.informedDate
              .options.specificDate,
          showCheck: true,
        },
      ],
    },
    {
      id: 'specific_informed_date',
      text: t.phases.tripExperience.steps.informedDate.questions
        .specificInformedDate.title,
      label:
        t.phases.tripExperience.steps.informedDate.questions
          .specificInformedDate.label,
      type: 'date',
      options: [],
      showIf: (answers: Answer[]) =>
        answers.some(
          (a: Answer) =>
            a.questionId === 'informed_date' && a.value === 'specific_date'
        ),
    },
  ];

  const tripExperienceAnswers = useMemo(
    () => wizardAnswers.filter((a) => a.questionId === 'travel_status'),
    [wizardAnswers]
  );

  const informedDateAnswers = useMemo(
    () => wizardAnswers.filter((a) => a.questionId === 'informed_date'),
    [wizardAnswers]
  );

  // Initialize state
  useEffect(() => {
    if (!mounted) {
      const initializeState = async () => {
        try {
          console.log('Initializing state...');
          setCurrentPhase(4);

          // Get saved validation state from localStorage
          const savedValidationState = localStorage.getItem(
            'phase4ValidationState'
          );
          const savedWizardAnswers = localStorage.getItem('wizardAnswers');
          let restoredAnswers = [];

          if (savedWizardAnswers) {
            try {
              restoredAnswers = JSON.parse(savedWizardAnswers);
              setWizardAnswers(restoredAnswers);
            } catch (error) {
              console.error('Error parsing saved wizard answers:', error);
            }
          }

          let initialValidationState;
          if (savedValidationState) {
            try {
              const parsed = JSON.parse(savedValidationState);
              initialValidationState = {
                ...validationState,
                ...parsed,
              };

              // Check if both steps are completed
              const isFullyCompleted =
                parsed.stepValidation?.[2] && parsed.stepValidation?.[3];
              setIsFullyCompleted(isFullyCompleted);

              // Only set initial accordion if not fully completed
              if (!isFullyCompleted) {
                // Find the first incomplete step
                if (!parsed.stepValidation?.[2]) {
                  setInitialAccordion('2');
                } else if (!parsed.stepValidation?.[3]) {
                  setInitialAccordion('3');
                }
              }
            } catch (error) {
              console.error('Error parsing saved validation state:', error);
              initialValidationState = validationState;
              setInitialAccordion('2');
            }
          } else {
            initialValidationState = validationState;
            setInitialAccordion('2');
          }

          updateValidationState(initialValidationState);
          setMounted(true);
          console.log('State initialization complete');
        } catch (error) {
          console.error('Error initializing state:', error);
        }
      };

      initializeState();
    }
  }, [
    mounted,
    setCurrentPhase,
    validationState,
    updateValidationState,
    setWizardAnswers,
  ]);

  // Update isFullyCompleted when validation state changes
  useEffect(() => {
    const bothStepsCompleted =
      validationState.stepValidation[2] && validationState.stepValidation[3];
    setIsFullyCompleted(bothStepsCompleted);
  }, [validationState.stepValidation]);

  // Add effect to persist validation state changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'phase4ValidationState',
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

  // Update local state when validation state changes
  useEffect(() => {
    setIsTripExperienceValid(validationState.stepValidation[2] ?? false);
    setIsInformedDateValid(validationState.stepValidation[3] ?? false);
  }, [validationState.stepValidation]);

  // Initialize validation state
  useEffect(() => {
    const store = useStore.getState();
    const tripExperienceAnswers = store.wizardAnswers.filter(
      (a) => a.questionId === 'travel_status'
    );
    const informedDateAnswers = store.wizardAnswers.filter(
      (a) => a.questionId === 'informed_date'
    );

    console.log('Filtered trip experience answers:', tripExperienceAnswers);
    console.log('Filtered informed date answers:', informedDateAnswers);

    // Only update interaction state, not validation
    const newValidationState: Partial<ValidationState> = {
      ...store.validationState,
      stepInteraction: {
        ...store.validationState.stepInteraction,
        2: tripExperienceAnswers.length > 0,
        3: informedDateAnswers.length > 0,
      },
      _timestamp: Date.now(),
    };

    store.updateValidationState(newValidationState);
  }, [wizardAnswers]); // Only track answers for interaction state

  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      const store = useStore.getState();
      console.log('TripExperience - handleAutoTransition:', {
        currentStepId,
        step1Valid: isTripExperienceValid,
        step2Valid: isInformedDateValid,
        validationState: store.validationState,
        interactedSteps,
        isFullyCompleted,
      });

      // If both steps are completed, don't auto-transition
      if (isFullyCompleted) {
        return null;
      }

      // Only allow auto-transition if the step has been interacted with AND completed
      const stepId = Number(currentStepId) as 2 | 3;
      const hasInteracted = store.validationState.stepInteraction?.[stepId];
      const isStepValid = store.validationState.stepValidation[stepId];

      // Get the current travel status
      const travelStatus = store.wizardAnswers.find(
        (a) => a.questionId === 'travel_status'
      )?.value;

      // If we're in step 2 and the travel status requires a flight selection,
      // check if flights are selected before transitioning
      if (
        currentStepId === '2' &&
        (travelStatus === 'provided' || travelStatus === 'took_alternative_own')
      ) {
        const hasSelectedFlights = store.selectedFlights.length > 0;
        if (!hasSelectedFlights) {
          return null;
        }
      }

      // If the step is valid and has been interacted with, allow transition
      if (hasInteracted && isStepValid) {
        if (currentStepId === '2') {
          return '3';
        }
        if (currentStepId === '3') {
          return null; // End of wizard
        }
      }

      return null;
    },
    [
      isTripExperienceValid,
      isInformedDateValid,
      interactedSteps,
      isFullyCompleted,
    ]
  );

  // Handler functions for completing steps
  const handleTripExperienceComplete = useCallback(() => {
    const store = useStore.getState();
    const tripExperienceAnswers = store.wizardAnswers.filter(
      (a) => a.questionId === 'travel_status'
    );

    const travelStatus = tripExperienceAnswers[0]?.value;
    const tripValid =
      !!travelStatus &&
      (travelStatus === 'none' ||
        travelStatus === 'took_alternative_own' ||
        travelStatus === 'self' ||
        (travelStatus === 'provided' && selectedFlights.length > 0));

    // Only update validation state when the step is completed
    const newValidationState: Partial<ValidationState> = {
      ...store.validationState,
      stepValidation: {
        ...store.validationState.stepValidation,
        2: tripValid,
      } as Record<number, boolean>,
      stepInteraction: {
        ...store.validationState.stepInteraction,
        2: tripExperienceAnswers.length > 0,
      } as Record<number, boolean>,
      isWizardValid: tripValid && store.validationState.stepValidation[3],
      isWizardSubmitted: true,
      fieldErrors: store.validationState.fieldErrors || {},
      transitionInProgress: false,
      _timestamp: Date.now(),
    };

    store.updateValidationState(newValidationState);

    if (tripValid) {
      completePhase(2);
    }
  }, [selectedFlights, completePhase]);

  const handleInformedDateComplete = useCallback(() => {
    const store = useStore.getState();
    const informedDateAnswers = store.wizardAnswers.filter(
      (a) => a.questionId === 'informed_date'
    );

    const informedDateValid = informedDateAnswers.length > 0;

    // Only update validation state when the step is completed
    const newValidationState: Partial<ValidationState> = {
      ...store.validationState,
      stepValidation: {
        ...store.validationState.stepValidation,
        3: informedDateValid,
      } as Record<number, boolean>,
      stepInteraction: {
        ...store.validationState.stepInteraction,
        3: informedDateAnswers.length > 0,
      } as Record<number, boolean>,
      isWizardValid:
        store.validationState.stepValidation[2] && informedDateValid,
      isWizardSubmitted: true,
      fieldErrors: store.validationState.fieldErrors || {},
      transitionInProgress: false,
      _timestamp: Date.now(),
    };

    store.updateValidationState(newValidationState);

    if (informedDateValid) {
      completePhase(3);
    }
  }, [completePhase]);

  // Check if we can continue
  const canContinue = useCallback(() => {
    return (
      validationState.stepValidation[2] && validationState.stepValidation[3]
    );
  }, [validationState.stepValidation]);

  const handleBack = () => {
    const previousUrl = '/phases/flight-details';
    // Save current validation state before navigating
    localStorage.setItem(
      'phase4ValidationState',
      JSON.stringify(validationState)
    );
    router.replace(getLanguageAwareUrl(previousUrl, lang));
  };

  const handleContinue = async () => {
    if (!canContinue()) return;

    setIsLoading(true);

    try {
      // Get the travel status from step 1 answers
      const travelStatus = tripExperienceAnswers.find(
        (a: Answer) => a.questionId === 'travel_status'
      )?.value;

      // Get the originally booked flights
      const bookedFlightIds = originalFlights
        .filter((flight) => flight && flight.id)
        .map((flight) => String(flight.id));

      if (bookedFlightIds.length === 0) {
        console.error('No booked flight IDs available');
        return;
      }

      // Get the informed date
      const informedDate = informedDateAnswers
        .find((a) => a.questionId === 'informed_date')
        ?.value?.toString();

      // Format the date without timezone conversion
      const formattedDate = (() => {
        if (!informedDate || informedDate === 'none') return '';

        if (
          informedDate === 'specific_date' &&
          informedDateAnswers.length > 0
        ) {
          const dateAnswer = informedDateAnswers.find(
            (a) => a.questionId === 'specific_informed_date'
          );
          if (dateAnswer?.value && typeof dateAnswer.value === 'string') {
            const [year, month, day] = dateAnswer.value.split('-');
            if (year && month && day) {
              console.log(
                'Using specific informed date:',
                `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              );
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }

        if (informedDate === 'on_departure' && originalFlights.length > 0) {
          const flightDate = originalFlights[0].date;
          if (flightDate) {
            const [year, month, day] = flightDate.split('-');
            if (year && month && day) {
              console.log(
                'Using departure date:',
                `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
              );
              return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }
        }

        return '';
      })();

      console.log('Informed date from Q&A:', informedDate);
      console.log('Informed date answers:', informedDateAnswers);
      console.log('Final formatted date:', formattedDate);

      if (!formattedDate || !isValidYYYYMMDD(formattedDate)) {
        throw new Error('No valid date available');
      }

      const cleanedEvalData = {
        journey_booked_flightids: bookedFlightIds,
        journey_fact_flightids: (() => {
          if (travelStatus === 'provided') {
            const providedFlights = selectedFlights
              .filter(
                (flight) =>
                  !originalFlights.some((orig) => orig.id === flight.id)
              )
              .map((flight) => String(flight.id));
            console.log(
              'Journey fact flights (provided by airline):',
              providedFlights
            );
            return providedFlights;
          } else if (travelStatus === 'took_alternative_own') {
            const ownAlternativeFlightAnswer = tripExperienceAnswers.find(
              (a) => a.questionId === 'alternative_flight_own_expense'
            );
            const ownFlights = ownAlternativeFlightAnswer?.value
              ? [String(ownAlternativeFlightAnswer.value)]
              : [];
            console.log('Journey fact flights (own alternative):', ownFlights);
            return ownFlights;
          } else if (travelStatus === 'self') {
            console.log(
              'Journey fact flights (took booked flights):',
              bookedFlightIds
            );
            return bookedFlightIds;
          }
          console.log('Journey fact flights (no travel): []');
          return [];
        })(),
        information_received_at: formattedDate,
      };

      console.log('Travel status from Q&A:', travelStatus);
      console.log(
        'Original booked flights:',
        originalFlights.map((f) => ({ id: f.id, flightNumber: f.flightNumber }))
      );
      console.log(
        'Selected alternative flights:',
        selectedFlights.map((f) => ({ id: f.id, flightNumber: f.flightNumber }))
      );
      console.log('Final evaluation data:', cleanedEvalData);

      const evaluationResult = await api.evaluateClaim(cleanedEvalData);

      // Get the next URL based on evaluation result
      const isAccepted = evaluationResult.status === 'accept';
      const baseNextUrl = isAccepted
        ? '/phases/claim-success'
        : '/phases/claim-rejected';

      if (isAccepted) {
        router.replace(baseNextUrl);
      } else {
        // Add rejection reasons to URL for rejected claims
        const searchParams = new URLSearchParams();
        const rejectionData = {
          rejection_reasons: evaluationResult.rejection_reasons || {},
        };
        searchParams.set('reasons', JSON.stringify(rejectionData));
        router.replace(`${baseNextUrl}?${searchParams.toString()}`);
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
    setInteractedSteps((prev) => ({ ...prev, 1: true }));
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
    setInteractedSteps((prev) => ({ ...prev, 2: true }));
  }, [validationState, updateValidationState]);

  const getTripExperienceSummary = useMemo(() => {
    if (tripExperienceAnswers.length === 0) return '';

    const travelStatus = tripExperienceAnswers.find(
      (a: Answer) => a.questionId === 'travel_status'
    )?.value;

    switch (travelStatus) {
      case 'none':
        return t.phases.tripExperience.summary.travelStatus.notTraveled;
      case 'self':
        return t.phases.tripExperience.summary.travelStatus.traveled;
      case 'provided':
      case 'took_alternative_own':
        return t.phases.tripExperience.summary.travelStatus.traveled;
      default:
        return '';
    }
  }, [tripExperienceAnswers, t]);

  const getInformedDateSummary = useMemo(() => {
    if (informedDateAnswers.length === 0) return '';

    const informedDate = informedDateAnswers.find(
      (a: Answer) => a.questionId === 'informed_date'
    )?.value;

    if (informedDate === 'on_departure') {
      return t.phases.tripExperience.steps.informedDate.questions.informedDate
        .options.onDeparture;
    }

    const specificDate = informedDateAnswers.find(
      (a: Answer) => a.questionId === 'specific_informed_date'
    )?.value;

    if (specificDate && typeof specificDate === 'string') {
      try {
        // Ensure date is in YYYY-MM-DD format
        const [year, month, day] = specificDate.split('-');
        if (year && month && day) {
          const date = new Date(Number(year), Number(month) - 1, Number(day));
          if (!isNaN(date.getTime())) {
            return t.phases.tripExperience.summary.travelStatus.informedDate.replace(
              '{date}',
              date.toLocaleDateString(t.lang === 'de' ? 'de-DE' : 'en-US')
            );
          }
        }
      } catch (error) {
        console.error('Error formatting date:', error);
      }
    }

    return '';
  }, [informedDateAnswers, t]);

  return (
    <PhaseGuard phase={4}>
      <AccordionProvider
        onAutoTransition={handleAutoTransition}
        initialActiveAccordion={initialAccordion}
      >
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation
            currentPhase={currentPhase}
            completedPhases={completedPhases}
          />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t.phases.tripExperience.speechBubble} />

              {/* Trip Experience Wizard */}
              <AccordionCard
                title={t.phases.tripExperience.steps.travelStatus.title}
                stepId="2"
                isCompleted={validationState.stepValidation[2]}
                hasInteracted={validationState.stepInteraction[2]}
                isValid={isTripExperienceValid}
                summary={getTripExperienceSummary}
                eyebrow={t.phases.tripExperience.steps.travelStatus.eyebrow}
                isQA={true}
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
                title={t.phases.tripExperience.steps.informedDate.title}
                stepId="3"
                isCompleted={validationState.stepValidation[3]}
                hasInteracted={validationState.stepInteraction[3]}
                isValid={isInformedDateValid}
                summary={getInformedDateSummary}
                eyebrow={t.phases.tripExperience.steps.informedDate.eyebrow}
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
                <BackButton
                  onClick={handleBack}
                  text={t.phases.tripExperience.navigation.back}
                />
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!canContinue() || isLoading}
                  isLoading={isLoading}
                  text={t.phases.tripExperience.navigation.continue}
                />
              </div>
            </div>
          </main>
        </div>
      </AccordionProvider>
    </PhaseGuard>
  );
}
