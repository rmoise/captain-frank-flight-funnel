'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { usePhase4Store } from '@/lib/state/phase4Store';
import { Answer, Question, Flight } from '@/types/store';
import { QAWizard } from '@/components/wizard/QAWizard';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { accordionConfig } from '@/config/accordion';
import { isValidYYYYMMDD, formatDateToYYYYMMDD } from '@/utils/dateUtils';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { useStore } from '@/lib/state/store';
import { useFlightStore } from '@/lib/state/flightStore';
import { EvaluateService } from '@/services/evaluateService';
import { ClaimService } from '@/services/claimService';

// Helper function to get language-aware URL
const getLanguageAwareUrl = (url: string, lang: string) => {
  return lang === 'de' ? `/de${url}` : url;
};

export default function TripExperiencePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || '';
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const phase4Store = usePhase4Store();
  const flightStore = useFlightStore();
  const mainStore = useStore();

  const {
    travelStatusAnswers,
    informedDateAnswers,
    travelStatusStepValidation,
    informedDateStepValidation,
    travelStatusStepInteraction,
    informedDateStepInteraction,
    updateValidationState,
  } = phase4Store;

  // Initialize state on mount
  useEffect(() => {
    let isInitialized = false;

    const initializeFlights = () => {
      if (isInitialized) return;

      console.log('=== Trip Experience Page Initialization ===', {
        originalFlights: flightStore.originalFlights.length,
        mainStoreFlights: mainStore.selectedFlights.length,
        hasPersistedData: !!localStorage.getItem('phase4FlightData'),
        phase4StoreFlights: phase4Store.selectedFlights.length,
      });

      try {
        // First check if phase4Store is already initialized with valid data
        if (
          phase4Store.selectedFlights.length > 0 &&
          phase4Store.originalFlights.length > 0
        ) {
          console.log('Phase4Store already initialized with flights');

          // Ensure flightStore is in sync
          flightStore.setSelectedFlights(phase4Store.selectedFlights);
          flightStore.setOriginalFlights(phase4Store.originalFlights);

          isInitialized = true;
          return;
        }

        // Then check if we have flights in the flightStore
        if (flightStore.originalFlights.length > 0) {
          console.log('Using existing flights from store:', {
            originalFlights: flightStore.originalFlights.length,
            selectedFlights: flightStore.selectedFlights.length,
          });

          // Get travel status to determine which flights to use
          const travelStatus = phase4Store.travelStatusAnswers.find(
            (a) => a.questionId === 'travel_status'
          )?.value;

          const requiresAlternativeFlights =
            travelStatus === 'provided' ||
            travelStatus === 'took_alternative_own';

          // Set selected flights in phase4Store
          phase4Store.batchUpdate({
            selectedFlights:
              requiresAlternativeFlights &&
              flightStore.selectedFlights.length > 0
                ? flightStore.selectedFlights
                : flightStore.originalFlights,
            originalFlights: flightStore.originalFlights,
          });

          isInitialized = true;
          return;
        }

        // Try to get persisted flight data
        const persistedFlightData = localStorage.getItem('phase4FlightData');
        let flightData;

        if (persistedFlightData) {
          try {
            flightData = JSON.parse(persistedFlightData);
            console.log('Found persisted flight data:', {
              originalFlights: flightData.originalFlights?.length,
              selectedFlights: flightData.selectedFlights?.length,
              flightSegments: flightData.flightSegments?.length,
              selectedType: flightData.selectedType,
              timestamp: new Date(flightData.timestamp).toISOString(),
            });

            // Validate persisted data
            if (!flightData.originalFlights?.length) {
              console.warn('Invalid persisted flight data - no flights found');
              return;
            }

            // Set the flights in flightStore first
            console.log('Setting flights from persisted data');
            flightStore.setOriginalFlights(flightData.originalFlights);

            // Get travel status to determine which flights to use
            const travelStatus = phase4Store.travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value;

            const requiresAlternativeFlights =
              travelStatus === 'provided' ||
              travelStatus === 'took_alternative_own';

            // Set selected flights based on travel status
            const selectedFlights =
              requiresAlternativeFlights &&
              flightData.selectedFlights?.length > 0
                ? flightData.selectedFlights
                : flightData.originalFlights;

            flightStore.setSelectedFlights(selectedFlights);

            // Initialize phase4Store with the persisted data in one batch update
            phase4Store.batchUpdate({
              selectedType: flightData.selectedType || 'direct',
              flightSegments: flightData.flightSegments || [],
              selectedFlights,
              originalFlights: flightData.originalFlights,
            });

            isInitialized = true;
            return;
          } catch (error) {
            console.error('Error processing persisted flight data:', error);
            localStorage.removeItem('phase4FlightData'); // Clear invalid data
          }
        }

        // Final check if we have flights
        const hasFlights = flightStore.originalFlights.length > 0;

        if (!hasFlights) {
          console.warn('No flights found in flight store or persisted data');
          setErrorMessage(
            'No flights available. Please select your flights first.'
          );
          return;
        }

        isInitialized = true;
      } catch (error) {
        console.error('Error initializing flights:', error);
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Failed to initialize flight data'
        );
      }
    };

    initializeFlights();
  }, [flightStore.originalFlights.length, phase4Store.selectedFlights.length]);

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

  // Add validation for alternative flight selection
  const validateAlternativeFlight = useCallback(
    (selectedFlight: Flight) => {
      // Get original flight from flightStore
      const originalFlight = flightStore.originalFlights[0];

      // Compare flights
      const flightComparison = [
        {
          originalFlight: {
            id: originalFlight.id,
            flightNumber: originalFlight.flightNumber,
            date: originalFlight.date,
          },
          selectedFlight: {
            id: selectedFlight.id,
            flightNumber: selectedFlight.flightNumber,
            date: selectedFlight.date,
          },
          isIdentical: originalFlight.id === selectedFlight.id,
        },
      ];

      // Check if selected flight is different
      if (flightComparison[0].isIdentical) {
        console.log('=== Trip Experience - Validation Error ===', {
          error: 'Selected flights must be different from original flights',
          flightComparison,
          timestamp: new Date().toISOString(),
        });
        return false;
      }

      return true;
    },
    [flightStore.originalFlights]
  );

  // Update handleTripExperienceComplete to use validation
  const handleTripExperienceComplete = useCallback(() => {
    // Validate selected flight is different from original
    if (
      flightStore.selectedFlights.length > 0 &&
      !validateAlternativeFlight(flightStore.selectedFlights[0])
    ) {
      return;
    }

    // Update validation state
    const newValidationState = {
      travelStatusStepValidation: {
        ...travelStatusStepValidation,
        2: true,
      },
      travelStatusStepInteraction: {
        ...travelStatusStepInteraction,
        2: true,
      },
      travelStatusShowingSuccess: true,
      travelStatusIsValid: true,
      isTripExperienceValid: true,
      _timestamp: Date.now(),
    };

    updateValidationState(newValidationState);

    // Force the transition to step 3
    const accordionContext = (window as any).__accordionContext;
    if (accordionContext?.setOpenAccordions) {
      accordionContext.setOpenAccordions(new Set(['1', '2', '3']));
    }
  }, [
    updateValidationState,
    travelStatusStepValidation,
    travelStatusStepInteraction,
    flightStore.selectedFlights,
    validateAlternativeFlight,
  ]);

  const handleInformedDateComplete = useCallback(() => {
    // Update validation state
    const newValidationState = {
      informedDateStepValidation: {
        ...informedDateStepValidation,
        isValid: true,
      },
      informedDateStepInteraction: {
        ...informedDateStepInteraction,
        isComplete: true,
      },
      informedDateShowingSuccess: true,
      informedDateIsValid: true,
    };

    updateValidationState(newValidationState);
  }, [
    updateValidationState,
    informedDateStepValidation,
    informedDateStepInteraction,
  ]);

  // Initialize state only once
  useEffect(() => {
    let mounted = false;

    const initializeState = () => {
      if (mounted) return;
      mounted = true;

      console.log('Initializing state...');
      const store = phase4Store;
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
    if (flightStore.originalFlights.length > 0) {
      console.log('Original flights updated:', {
        flights: flightStore.originalFlights.map((f: Flight) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
          from: f.departureCity,
          to: f.arrivalCity,
        })),
      });
    }
  }, [flightStore.originalFlights]);

  // Add logging to track when validation is checked
  useEffect(() => {
    console.log('Trip Experience Validation Check:', {
      travelStatusAnswers,
      selectedFlights: flightStore.selectedFlights,
      isValid: validationStates.isTripExperienceValid,
    });
  }, [
    travelStatusAnswers,
    flightStore.selectedFlights,
    validationStates.isTripExperienceValid,
  ]);

  // Add logging for when selected flights change
  useEffect(() => {
    if (flightStore.selectedFlights && flightStore.selectedFlights.length > 0) {
      console.log('Selected Flights Updated:', {
        selectedFlights: flightStore.selectedFlights.map((f: Flight) => ({
          id: f.id,
          flightNumber: f.flightNumber,
          date: f.date,
        })),
      });
    }
  }, [flightStore.selectedFlights]);

  // Update handleAutoTransition to check both validation states
  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      console.log('TripExperience - handleAutoTransition:', {
        currentStepId,
        travelStatusStepValidation,
        informedDateStepValidation,
        validationStates,
      });

      // If we're on step 1 and it's valid, go to step 2
      if (currentStepId === '1') {
        return '2';
      }

      // If we're on step 2 (trip experience) and it's valid, go to step 3 (informed date)
      if (
        currentStepId === '2' &&
        travelStatusStepValidation[2] &&
        validationStates.isTripExperienceValid
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
    [travelStatusStepValidation, informedDateStepValidation, validationStates]
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

  // Add validation for flight data before evaluation
  const validateFlightData = useCallback(
    (originalFlights: Flight[], selectedFlights: Flight[]) => {
      // Get travel status from answers
      const travelStatusAnswer = travelStatusAnswers.find(
        (a) => a.questionId === 'travel_status'
      );

      if (!travelStatusAnswer || typeof travelStatusAnswer.value !== 'string') {
        throw new Error('No valid travel status selected');
      }

      const travelStatus = travelStatusAnswer.value;

      console.log('=== Trip Experience - validateFlightData ENTRY ===', {
        travelStatus,
        requiresAlternativeFlights:
          travelStatus === 'provided' ||
          travelStatus === 'took_alternative_own',
        timestamp: new Date().toISOString(),
      });

      // Only validate that flights are selected if travel status requires it
      if (
        travelStatus === 'provided' ||
        travelStatus === 'took_alternative_own'
      ) {
        if (selectedFlights.length === 0) {
          throw new Error(
            'Please select your alternative flights before continuing'
          );
        }
      } else {
        // For other travel statuses, ensure selected flights match original flights
        if (selectedFlights.length !== originalFlights.length) {
          throw new Error('Selected flights must match original flights');
        }

        selectedFlights.forEach((selectedFlight, index) => {
          const originalFlight = originalFlights[index];
          if (
            !originalFlight ||
            selectedFlight.id !== originalFlight.id ||
            selectedFlight.flightNumber !== originalFlight.flightNumber ||
            selectedFlight.date !== originalFlight.date
          ) {
            throw new Error('Selected flights must match original flights');
          }
        });
      }

      console.log('=== Trip Experience - validateFlightData EXIT ===', {
        isValid: true,
        timestamp: new Date().toISOString(),
      });

      return true;
    },
    [travelStatusAnswers]
  );

  const handleContinue = async () => {
    if (!canContinue()) return;
    setIsLoading(true);

    try {
      // Get travel status from answers
      const travelStatusAnswer = travelStatusAnswers.find(
        (a) => a.questionId === 'travel_status'
      );

      if (!travelStatusAnswer || typeof travelStatusAnswer.value !== 'string') {
        throw new Error('No valid travel status selected');
      }

      const travelStatus = travelStatusAnswer.value;

      // Get informed date
      const informedDate = (() => {
        const specificDate = informedDateAnswers.find(
          (a) => a.questionId === 'specific_informed_date'
        )?.value;

        if (specificDate) {
          return String(specificDate);
        }

        // If no specific date, use the flight date
        if (flightStore.originalFlights[0]?.date) {
          return formatDateToYYYYMMDD(
            new Date(flightStore.originalFlights[0].date)
          );
        }

        return formatDateToYYYYMMDD(new Date());
      })();

      if (!informedDate || !isValidYYYYMMDD(String(informedDate))) {
        console.error('Date validation failed:', {
          informedDate,
          specificDate: informedDateAnswers.find(
            (a) => a.questionId === 'specific_informed_date'
          )?.value,
          flightDate: flightStore.originalFlights[0]?.date,
          departureTime: flightStore.originalFlights[0]?.departureTime,
        });
        throw new Error(
          'The date format is invalid. Please use YYYY-MM-DD format'
        );
      }

      // Validate flight data first
      validateFlightData(
        flightStore.originalFlights,
        flightStore.selectedFlights
      );

      // Ensure we have valid flight IDs
      const validOriginalFlights = flightStore.originalFlights.filter(
        (f) =>
          f !== null &&
          typeof f.id === 'string' &&
          f.id.length > 0 &&
          typeof f.flightNumber === 'string' &&
          f.flightNumber.length > 0
      );

      // Only validate selected flights if alternative travel was chosen
      const requiresAlternativeFlights =
        travelStatus === 'provided' || travelStatus === 'took_alternative_own';

      if (requiresAlternativeFlights) {
        const validSelectedFlights = flightStore.selectedFlights.filter(
          (f) =>
            f !== null &&
            typeof f.id === 'string' &&
            f.id.length > 0 &&
            typeof f.flightNumber === 'string' &&
            f.flightNumber.length > 0
        );

        if (validSelectedFlights.length === 0) {
          throw new Error(
            'Please select your alternative flights before continuing'
          );
        }
      }

      // Complete phase 4 before evaluation
      await mainStore.completePhase(4);

      // Use the EvaluateService to evaluate the claim
      const evaluationResult = await EvaluateService.evaluateClaim(
        validOriginalFlights,
        requiresAlternativeFlights ? flightStore.selectedFlights : [],
        travelStatus,
        informedDate
      );

      // Validate evaluation result
      if (!evaluationResult || typeof evaluationResult.status === 'undefined') {
        throw new Error('Invalid evaluation response received');
      }

      // Store the evaluation result in ClaimService
      ClaimService.setStoredEvaluationResponse({
        status: evaluationResult.status,
        contract: evaluationResult.contract,
        rejection_reasons: evaluationResult.rejection_reasons,
        journey_booked_flightids: validOriginalFlights.map((f) => f.id),
        journey_fact_flightids: requiresAlternativeFlights
          ? flightStore.selectedFlights.map((f) => f.id)
          : [],
        information_received_at: informedDate,
        travel_status: travelStatus,
        journey_fact_type: (() => {
          switch (travelStatus) {
            case 'none':
              return 'none';
            case 'self':
              return 'self';
            case 'provided':
              return 'provided';
            case 'took_alternative_own':
              return 'self';
            default:
              return 'none';
          }
        })(),
        guid: evaluationResult.guid,
        recommendation_guid: evaluationResult.recommendation_guid,
      });

      // Update HubSpot deal with evaluation results
      const dealId = sessionStorage.getItem('hubspot_deal_id');
      if (dealId) {
        try {
          // First update the contact information
          const contactResponse = await fetch(
            '/.netlify/functions/hubspot-integration/contact',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId: sessionStorage.getItem('hubspot_contact_id'),
                ...mainStore.personalDetails,
              }),
            }
          );

          if (!contactResponse.ok) {
            console.error(
              'Failed to update HubSpot contact:',
              await contactResponse.text()
            );
          }

          // Then update the deal
          const hubspotResponse = await fetch(
            '/.netlify/functions/hubspot-integration/deal',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId: sessionStorage.getItem('hubspot_contact_id'),
                dealId,
                originalFlights: validOriginalFlights,
                selectedFlights: flightStore.selectedFlights,
                evaluationResponse: evaluationResult,
                stage: 'evaluation',
                status:
                  evaluationResult.status === 'accept'
                    ? 'qualified'
                    : 'rejected',
                personalDetails: mainStore.personalDetails,
              }),
            }
          );

          if (!hubspotResponse.ok) {
            console.error(
              'Failed to update HubSpot deal:',
              await hubspotResponse.text()
            );
          }
        } catch (error) {
          console.error('Error updating HubSpot deal:', error);
        }
      }

      // Get the next URL based on evaluation result
      const isAccepted = evaluationResult.status === 'accept';
      const nextUrl = isAccepted
        ? `/${lang}/phases/claim-success`
        : `/${lang}/phases/claim-rejected`;

      // Save final validation state
      const finalValidationState = {
        ...validationStates,
        stepValidation: {
          ...travelStatusStepValidation,
          2: true,
          3: true,
        },
        stepInteraction: {
          ...travelStatusStepInteraction,
          2: true,
          3: true,
        },
        2: true,
        3: true,
        _timestamp: Date.now(),
      };

      // Update store with final validation state
      phase4Store.updateValidationState({
        travelStatusStepValidation: {
          ...travelStatusStepValidation,
          2: true,
        },
        informedDateStepValidation: {
          ...informedDateStepValidation,
          3: true,
        },
        travelStatusStepInteraction: {
          ...travelStatusStepInteraction,
          2: true,
        },
        informedDateStepInteraction: {
          ...informedDateStepInteraction,
          3: true,
        },
        travelStatusShowingSuccess: true,
        travelStatusIsValid: true,
        informedDateShowingSuccess: true,
        informedDateIsValid: true,
      });

      // Save to localStorage
      localStorage.setItem(
        'phase4ValidationState',
        JSON.stringify(finalValidationState)
      );

      // Navigate to next page
      router.push(nextUrl);
    } catch (error) {
      console.error('Error during claim evaluation:', error);
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
        selectedFlight={flightStore.selectedFlights[0] || null}
        phase={4}
      />
    ),
    [
      questions,
      handleTripExperienceComplete,
      travelStatusAnswers,
      flightStore.selectedFlights,
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
