'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { Answer, Question } from '@/types/store';
import { QAWizard } from '@/components/wizard/QAWizard';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { accordionConfig } from '@/config/accordion';
import { isValidYYYYMMDD, formatDateToYYYYMMDD } from '@/utils/dateUtils';
import { ClaimService } from '@/services/claimService';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { useStore } from '@/lib/state/store';

// Helper function to get language-aware URL
const getLanguageAwareUrl = (url: string, lang: string) => {
  return lang === 'de' ? `/de${url}` : url;
};

export default function TripExperiencePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang as string;
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Use Phase4Store exclusively
  const {
    selectedFlights,
    travelStatusAnswers,
    informedDateAnswers,
    originalFlights,
    travelStatusStepValidation,
    travelStatusStepInteraction,
    informedDateStepValidation,
    informedDateStepInteraction,
    setOriginalFlights,
  } = usePhase4Store();

  // Get selected flights from main store
  const { selectedFlights: mainStoreFlights } = useStore();

  // Initialize component
  useEffect(() => {
    if (!mounted) {
      console.log('=== Trip Experience Page Initialization ===', {
        originalFlights: originalFlights.length,
        mainStoreFlights: mainStoreFlights.length,
      });

      setMounted(true);

      // If we don't have original flights but have flights in the main store, use those
      if (
        (!originalFlights || originalFlights.length === 0) &&
        mainStoreFlights.length > 0
      ) {
        console.log(
          'Setting original flights from main store:',
          mainStoreFlights
        );
        setOriginalFlights(mainStoreFlights);
      }

      console.log('=== End Trip Experience Page Initialization ===');
    }
  }, [mounted, originalFlights, mainStoreFlights, setOriginalFlights]);

  // Memoize validation states to prevent unnecessary re-renders
  const validationStates = useMemo(
    () => ({
      isTripExperienceValid: travelStatusStepValidation[2] || false,
      isInformedDateValid: informedDateStepValidation[3] || false,
      isFullyCompleted:
        (travelStatusStepValidation[2] && informedDateStepValidation[3]) ||
        false,
    }),
    [travelStatusStepValidation, informedDateStepValidation]
  );

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

  // Handle step completion - now only updates validation on submit
  const handleTripExperienceComplete = useCallback(() => {
    const store = usePhase4Store.getState();
    const travelStatus = store.travelStatusAnswers[0]?.value;

    // Check if we need flights based on travel status
    const needsFlights =
      travelStatus === 'provided' || travelStatus === 'took_alternative_own';
    const hasValidTravelStatus =
      store.travelStatusAnswers.length > 0 &&
      ['none', 'self', 'provided', 'took_alternative_own'].includes(
        String(travelStatus)
      );

    // Step 2 is valid if we have a valid travel status AND (we don't need flights OR we have selected flights)
    const isStep2Valid =
      hasValidTravelStatus &&
      (!needsFlights || store.selectedFlights.length > 0);

    // Update validation state on submit
    const newValidationState = {
      travelStatusStepValidation: {
        ...store.travelStatusStepValidation,
        2: isStep2Valid,
      },
      travelStatusStepInteraction: {
        ...store.travelStatusStepInteraction,
        2: true,
      },
      travelStatusShowingSuccess: isStep2Valid,
      travelStatusIsValid: isStep2Valid,
      _lastUpdate: Date.now(),
    };

    usePhase4Store.getState().updateValidationState(newValidationState);
  }, []);

  const handleInformedDateComplete = useCallback(() => {
    const store = usePhase4Store.getState();

    // Check if we have both the informed date type and specific date if needed
    const informedDateAnswer = store.informedDateAnswers.find(
      (a) => a.questionId === 'informed_date'
    );

    let isStep3Valid = false;

    if (informedDateAnswer?.value === 'specific_date') {
      // For specific date, we need both the selection and the actual date
      const specificDateAnswer = store.informedDateAnswers.find(
        (a) => a.questionId === 'specific_informed_date'
      );
      isStep3Valid = Boolean(specificDateAnswer?.value);
    } else if (informedDateAnswer?.value === 'on_departure') {
      // For on_departure, we just need the selection
      isStep3Valid = true;
    }

    console.log('Validating informed date completion:', {
      answers: store.informedDateAnswers,
      isValid: isStep3Valid,
    });

    // Update validation state on submit
    const newValidationState = {
      informedDateStepValidation: {
        ...store.informedDateStepValidation,
        3: isStep3Valid,
      },
      informedDateStepInteraction: {
        ...store.informedDateStepInteraction,
        3: true,
      },
      informedDateShowingSuccess: isStep3Valid,
      informedDateIsValid: isStep3Valid,
      _lastUpdate: Date.now(),
    };

    store.updateValidationState(newValidationState);

    // Log the updated state
    console.log('=== TripExperiencePage - handleInformedDateComplete ===', {
      isStep3Valid,
      newValidationState,
      currentState: {
        informedDateShowingSuccess: store.informedDateShowingSuccess,
        informedDateIsValid: store.informedDateIsValid,
        informedDateStepValidation: store.informedDateStepValidation,
        informedDateStepInteraction: store.informedDateStepInteraction,
      },
    });
  }, []);

  // Initialize state only once
  useEffect(() => {
    let mounted = false;

    const initializeState = () => {
      if (mounted) return;
      mounted = true;

      console.log('Initializing state...');
      const store = usePhase4Store.getState();
      const hasAnswers =
        store.travelStatusAnswers.length > 0 ||
        store.informedDateAnswers.length > 0;

      if (!hasAnswers) {
        // Only update interaction state if no answers exist
        const newValidationState = {
          travelStatusStepInteraction: {
            ...store.travelStatusStepInteraction,
            2: false,
            3: false,
          },
          _lastUpdate: Date.now(),
        };

        store.updateValidationState(newValidationState);
      }
      console.log('State initialization complete');
    };

    initializeState();
  }, []);

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
      travelStatusAnswers,
      selectedFlights,
      isValid: validationStates.isTripExperienceValid,
    });
  }, [
    travelStatusAnswers,
    selectedFlights,
    validationStates.isTripExperienceValid,
  ]);

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

  // Update handleAutoTransition to check both validation states
  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      console.log('TripExperience - handleAutoTransition:', {
        currentStepId,
        travelStatusStepValidation,
        informedDateStepValidation,
        validationStates,
      });

      // If we're on step 2 (trip experience) and it's valid, go to step 3 (informed date)
      if (
        currentStepId === '2' &&
        travelStatusStepValidation[2] &&
        validationStates.isTripExperienceValid &&
        !validationStates.isFullyCompleted
      ) {
        return '3';
      }

      // If we're on step 3 (informed date) and it's valid, we're done
      if (
        currentStepId === '3' &&
        informedDateStepValidation[3] &&
        validationStates.isInformedDateValid
      ) {
        return null;
      }

      return null;
    },
    [travelStatusStepValidation, validationStates]
  );

  // Add logging to track validation state updates
  useEffect(() => {
    console.log('Validation states updated:', {
      validationStates,
      travelStatusStepValidation,
      travelStatusStepInteraction,
    });
  }, [
    validationStates,
    travelStatusStepValidation,
    travelStatusStepInteraction,
  ]);

  // Check if we can continue
  const canContinue = useCallback(() => {
    return (
      validationStates.isTripExperienceValid &&
      validationStates.isInformedDateValid
    );
  }, [validationStates]);

  const handleBack = () => {
    const previousUrl = '/phases/flight-details';
    // Save current validation state before navigating
    localStorage.setItem(
      'phase4ValidationState',
      JSON.stringify({
        travelStatusStepValidation,
        travelStatusStepInteraction,
      })
    );
    router.replace(getLanguageAwareUrl(previousUrl, lang));
  };

  const handleContinue = async () => {
    if (!canContinue()) return;
    setIsLoading(true);

    try {
      // Get travel status from answers
      const travelStatus = travelStatusAnswers.find(
        (a) => a.questionId === 'travel_status'
      )?.value;

      if (!travelStatus) {
        throw new Error('No travel status selected');
      }

      // Get informed date
      const informedDate = (() => {
        const specificDate = informedDateAnswers.find(
          (a) => a.questionId === 'specific_informed_date'
        )?.value;

        if (specificDate) {
          return String(specificDate);
        }

        // If no specific date, use the flight date
        if (originalFlights[0]?.date) {
          return formatDateToYYYYMMDD(new Date(originalFlights[0].date));
        }

        return formatDateToYYYYMMDD(new Date());
      })();

      if (!informedDate || !isValidYYYYMMDD(String(informedDate))) {
        console.error('Date validation failed:', {
          informedDate,
          specificDate: informedDateAnswers.find(
            (a) => a.questionId === 'specific_informed_date'
          )?.value,
          flightDate: originalFlights[0]?.date,
          departureTime: originalFlights[0]?.departureTime,
        });
        throw new Error(
          'The date format is invalid. Please use YYYY-MM-DD format'
        );
      }

      console.log('=== Trip Experience - Evaluating Claim ===', {
        originalFlights: originalFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
        })),
        selectedFlights: selectedFlights.map((f) => ({
          id: f.id,
          flightNumber: f.flightNumber,
        })),
        travelStatusAnswers,
        informedDateAnswers,
      });

      const evaluationResult = await ClaimService.evaluateClaim(
        originalFlights,
        selectedFlights,
        travelStatusAnswers,
        informedDateAnswers
      );

      console.log('Evaluation result:', evaluationResult);

      // Store the evaluation result in sessionStorage directly to ensure it persists
      sessionStorage.setItem(
        'claim_evaluation_response',
        JSON.stringify(evaluationResult)
      );

      // Get the next URL based on evaluation result
      const isAccepted = evaluationResult.status === 'accept';
      const baseNextUrl = isAccepted
        ? '/phases/claim-success'
        : '/phases/claim-rejected';

      // Prepare URL parameters
      const searchParams = new URLSearchParams();

      // Add contract details to URL for accepted claims
      if (isAccepted && evaluationResult.contract) {
        searchParams.set('amount', String(evaluationResult.contract.amount));
        searchParams.set(
          'provision',
          String(evaluationResult.contract.provision)
        );
      } else if (!isAccepted && evaluationResult.rejection_reasons) {
        // Add rejection reasons to URL for rejected claims
        searchParams.set(
          'reasons',
          JSON.stringify(evaluationResult.rejection_reasons)
        );
      }

      // Add common parameters
      searchParams.set('redirected', String(true));
      const { completedPhases } = useStore.getState();
      searchParams.set('completed_phases', completedPhases.join(','));
      searchParams.set('current_phase', '4');

      // Navigate to the appropriate page
      const nextUrl = `${baseNextUrl}?${searchParams.toString()}`;
      router.push(nextUrl);
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'An unknown error occurred'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getTripExperienceSummary = useMemo(() => {
    if (travelStatusAnswers.length === 0) return '';

    const travelStatus = travelStatusAnswers.find(
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
  }, [travelStatusAnswers, t]);

  const getInformedDateSummary = useMemo(() => {
    if (informedDateAnswers.length === 0) return '';

    const informedDate = informedDateAnswers.find(
      (answer: Answer) => answer.questionId === 'informed_date'
    )?.value;

    if (informedDate === 'on_departure') {
      return t.phases.tripExperience.steps.informedDate.questions.informedDate
        .options.onDeparture;
    }

    const specificDate = informedDateAnswers.find(
      (answer: Answer) => answer.questionId === 'specific_informed_date'
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

  // Memoize QA Wizards to prevent unnecessary re-renders
  const TripExperienceWizard = useMemo(
    () => (
      <QAWizard
        questions={questions}
        onComplete={handleTripExperienceComplete}
        initialAnswers={travelStatusAnswers}
        selectedFlight={selectedFlights[0] || null}
        phase={4}
      />
    ),
    [
      questions,
      handleTripExperienceComplete,
      travelStatusAnswers,
      selectedFlights,
    ]
  );

  const InformedDateWizard = useMemo(
    () => (
      <QAWizard
        questions={informedDateQuestions}
        onComplete={handleInformedDateComplete}
        initialAnswers={informedDateAnswers}
        phase={4}
        wizardType="informed_date"
      />
    ),
    [informedDateQuestions, handleInformedDateComplete, informedDateAnswers]
  );

  return (
    <PhaseGuard phase={4}>
      <AccordionProvider
        onAutoTransition={handleAutoTransition}
        initialActiveAccordion="2"
      >
        <div className="min-h-screen bg-[#f5f7fa]">
          <PhaseNavigation currentPhase={4} completedPhases={[1, 2, 3]} />
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message={t.phases.tripExperience.speechBubble} />

              {errorMessage && (
                <div className="p-4 text-red-700 bg-red-100 rounded-lg">
                  {errorMessage}
                </div>
              )}

              {/* Trip Experience Wizard */}
              <AccordionCard
                title={t.phases.tripExperience.steps.travelStatus.title}
                stepId="2"
                isCompleted={travelStatusStepValidation[2]}
                hasInteracted={travelStatusStepInteraction[2]}
                isValid={validationStates.isTripExperienceValid}
                summary={getTripExperienceSummary}
                eyebrow={t.phases.tripExperience.steps.travelStatus.eyebrow}
                isQA={true}
              >
                <div className={accordionConfig.padding.content}>
                  {TripExperienceWizard}
                </div>
              </AccordionCard>

              {/* Informed Date Wizard */}
              <AccordionCard
                title={t.phases.tripExperience.steps.informedDate.title}
                stepId="3"
                isCompleted={informedDateStepValidation[3]}
                hasInteracted={informedDateStepInteraction[3]}
                isValid={validationStates.isInformedDateValid}
                summary={getInformedDateSummary}
                eyebrow={t.phases.tripExperience.steps.informedDate.eyebrow}
                isQA={true}
              >
                <div className={accordionConfig.padding.content}>
                  {InformedDateWizard}
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
