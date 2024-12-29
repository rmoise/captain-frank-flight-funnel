'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setWizardAnswers as setTripDetails } from '@/store/slices/bookingSlice';
import {
  completeStep,
  markStepIncomplete,
  setCurrentPhase,
  completePhase,
} from '@/store/slices/progressSlice';
import { Answer } from '@/types/wizard';
import { Question } from '@/types/experience';
import { QAWizard } from '@/components/wizard/QAWizard';
import { RootState } from '@/store';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { BackButton } from '@/components/shared/BackButton';
import { useStepValidation } from '@/hooks/useStepValidation';
import type { Flight } from '@/types/store';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { pushToDataLayer } from '@/utils/gtm';
import { accordionConfig } from '@/config/accordion';

const questions: Question[] = [
  {
    id: 'travel_status',
    text: 'Please select what happened:',
    type: 'radio',
    options: [
      { id: 'no_travel', value: 'no_travel', label: "I didn't travel at all" },
      {
        id: 'took_booked',
        value: 'took_booked',
        label: 'I took the flights I booked',
      },
      {
        id: 'airline_expense',
        value: 'airline_expense',
        label: "I traveled differently at the airline's expense",
      },
      {
        id: 'own_expense',
        value: 'own_expense',
        label: 'I traveled differently at my own expense',
      },
    ],
  },
  {
    id: 'refund_status',
    text: 'Were your ticket costs refunded?',
    type: 'radio',
    options: [
      { id: 'yes', value: 'yes', label: 'Yes' },
      { id: 'no', value: 'no', label: 'No' },
    ],
    showIf: (answers) =>
      answers.some(
        (a) => a.questionId === 'travel_status' && a.value === 'no_travel'
      ),
  },
  {
    id: 'ticket_cost',
    text: 'How much did you pay for your ticket?',
    type: 'money',
    showIf: (answers) =>
      answers.some(
        (a) => a.questionId === 'travel_status' && a.value === 'no_travel'
      ) &&
      answers.some((a) => a.questionId === 'refund_status' && a.value === 'no'),
  },
  {
    id: 'alternative_flight_airline_expense',
    text: 'Please search for the alternative flight provided by the airline.',
    label: 'Alternative Flight',
    type: 'flight_selector',
    showIf: (answers) =>
      answers.some(
        (a) => a.questionId === 'travel_status' && a.value === 'airline_expense'
      ),
  },
  {
    id: 'alternative_flight_own_expense',
    text: 'Please search for the alternative flight you took at your own expense.',
    type: 'flight_selector',
    relatedQuestions: [
      {
        id: 'trip_costs',
        text: 'Please enter the costs you spent on your trip',
        type: 'money',
      },
    ],
    showIf: (answers) =>
      answers.some(
        (a) => a.questionId === 'travel_status' && a.value === 'own_expense'
      ),
  },
];

const informedDateQuestions: Question[] = [
  {
    id: 'informed_date',
    text: 'On what date were you first informed by the airline?',
    type: 'radio',
    options: [
      {
        id: 'on_departure',
        value: 'on_departure',
        label: 'On the day of departure',
      },
      {
        id: 'specific_date',
        value: 'specific_date',
        label: 'On a specific date',
      },
    ],
  },
  {
    id: 'specific_informed_date',
    text: 'Please select the date you were informed',
    type: 'date',
    showIf: (answers) =>
      answers.some(
        (a) => a.questionId === 'informed_date' && a.value === 'specific_date'
      ),
  },
];

export default function TripExperiencePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { completedSteps, completedPhases } = useAppSelector(
    (state: RootState) => state.progress
  );
  const { selectedFlight } = useAppSelector(
    (state: RootState) => state.booking
  );
  const [initialized, setInitialized] = useState(false);
  const [step1Answers, setStep1Answers] = useState<Answer[]>([]);
  const [step2Answers, setStep2Answers] = useState<Answer[]>([]);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [openSteps, setOpenSteps] = useState<number[]>([]);
  const lastProcessedTripDetailsRef = useRef<string>('');
  const { validateStep, isStepCompleted } = useStepValidation();

  // Add effect to manage open steps
  useEffect(() => {
    const completedStepIds = [1, 2].filter((stepId) => isStepCompleted(stepId));
    const nextIncompleteStep = [1, 2].find(
      (stepId) => !isStepCompleted(stepId)
    );

    const initialOpenSteps = [1, 2].filter((stepId) => {
      // Keep completed steps open
      if (isStepCompleted(stepId)) return true;

      // Always open step 1 if it's not completed
      if (stepId === 1 && !isStepCompleted(stepId)) return true;

      // Open step 2 if step 1 is completed
      if (stepId === 2 && isStepCompleted(1)) return true;

      // Open the current step if it's the next incomplete one and the previous step is completed
      if (stepId === nextIncompleteStep) {
        const previousStep = stepId - 1;
        return previousStep === 0 || isStepCompleted(previousStep);
      }

      return false;
    });

    console.log('Setting open steps:', {
      completedStepIds,
      nextIncompleteStep,
      initialOpenSteps,
    });

    setOpenSteps(initialOpenSteps);
  }, [isStepCompleted]);

  // Add effect to watch for step 1 completion
  useEffect(() => {
    if (isStepCompleted(1)) {
      setOpenSteps((prev) => {
        const newSteps = [...new Set([...prev, 1, 2])];
        return newSteps;
      });
    }
  }, [isStepCompleted]);

  // State for each step's answers and selected flights
  const [selectedAirlineExpenseFlight, setSelectedAirlineExpenseFlight] =
    useState<Flight | null>(null);
  const [selectedOwnExpenseFlight, setSelectedOwnExpenseFlight] =
    useState<Flight | null>(null);

  // Load saved data on mount
  useLayoutEffect(() => {
    const savedStep1Answers = localStorage.getItem(
      'tripExperience_step1Answers'
    );
    const savedStep2Answers = localStorage.getItem(
      'tripExperience_step2Answers'
    );
    const savedInteractedSteps = localStorage.getItem(
      'tripExperience_interactedSteps'
    );

    if (savedStep1Answers) {
      setStep1Answers(JSON.parse(savedStep1Answers));
    }
    if (savedStep2Answers) {
      setStep2Answers(JSON.parse(savedStep2Answers));
    }
    if (savedInteractedSteps) {
      setInteractedSteps(JSON.parse(savedInteractedSteps));
    }

    // Load saved flight selections
    const savedAirlineExpenseFlight = localStorage.getItem(
      'tripExperience_airlineExpenseFlight'
    );
    const savedOwnExpenseFlight = localStorage.getItem(
      'tripExperience_ownExpenseFlight'
    );

    if (savedAirlineExpenseFlight) {
      setSelectedAirlineExpenseFlight(JSON.parse(savedAirlineExpenseFlight));
    }
    if (savedOwnExpenseFlight) {
      setSelectedOwnExpenseFlight(JSON.parse(savedOwnExpenseFlight));
    }

    setInitialized(true);
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    if (!initialized) return;

    localStorage.setItem(
      'tripExperience_step1Answers',
      JSON.stringify(step1Answers)
    );
    localStorage.setItem(
      'tripExperience_step2Answers',
      JSON.stringify(step2Answers)
    );
    localStorage.setItem(
      'tripExperience_interactedSteps',
      JSON.stringify(interactedSteps)
    );

    // Save flight selections
    if (selectedAirlineExpenseFlight) {
      localStorage.setItem(
        'tripExperience_airlineExpenseFlight',
        JSON.stringify(selectedAirlineExpenseFlight)
      );
    }
    if (selectedOwnExpenseFlight) {
      localStorage.setItem(
        'tripExperience_ownExpenseFlight',
        JSON.stringify(selectedOwnExpenseFlight)
      );
    }
  }, [
    initialized,
    step1Answers,
    step2Answers,
    interactedSteps,
    selectedAirlineExpenseFlight,
    selectedOwnExpenseFlight,
  ]);

  // Validate step 1
  const validateStep1 = useCallback(
    (answers: Answer[]) => {
      const travelStatus = answers.find(
        (a) => a.questionId === 'travel_status'
      )?.value;
      if (!travelStatus) return false;

      // Validate based on travel status
      switch (travelStatus) {
        case 'no_travel':
          const refundStatus = answers.find(
            (a) => a.questionId === 'refund_status'
          )?.value;
          if (!refundStatus) return false;
          if (refundStatus === 'no') {
            const ticketCost = answers.find(
              (a) => a.questionId === 'ticket_cost'
            )?.value;
            return (
              !!ticketCost &&
              parseFloat(ticketCost.replace(/[^0-9.-]+/g, '')) > 0
            );
          }
          return true;
        case 'airline_expense':
          return !!selectedAirlineExpenseFlight;
        case 'own_expense':
          const hasOwnExpenseFlight = !!selectedOwnExpenseFlight;
          const tripCosts = answers.find(
            (a) => a.questionId === 'trip_costs'
          )?.value;
          return (
            hasOwnExpenseFlight &&
            !!tripCosts &&
            parseFloat(tripCosts.replace(/[^0-9.-]+/g, '')) > 0
          );
        case 'took_booked':
          return true;
        default:
          return false;
      }
    },
    [selectedAirlineExpenseFlight, selectedOwnExpenseFlight]
  );

  // Validate step 2
  const validateStep2 = useCallback((answers: Answer[]) => {
    const informedDate = answers.find(
      (a) => a.questionId === 'informed_date'
    )?.value;
    if (!informedDate) return false;

    if (informedDate === 'specific_date') {
      const specificDate = answers.find(
        (a) => a.questionId === 'specific_informed_date'
      )?.value;
      return !!specificDate;
    }
    return true;
  }, []);

  // Handle step 1 answer changes
  const handleAnswerChange = useCallback(
    (answers: Answer[]) => {
      // Format money values to always include decimals
      const formattedAnswers = answers.map((answer) => {
        if (
          answer.questionId === 'ticket_cost' ||
          answer.questionId === 'trip_costs'
        ) {
          if (answer.value && !answer.value.includes('€')) {
            const numericValue = parseFloat(
              answer.value.replace(/[^0-9.-]+/g, '')
            );
            if (!isNaN(numericValue)) {
              return {
                ...answer,
                value: `€${numericValue}`,
              };
            }
          }
        }
        return answer;
      });

      setStep1Answers(formattedAnswers);

      // Create a map of existing answers from step 2 by questionId
      const step2AnswersMap = new Map(
        step2Answers.map((answer) => [answer.questionId, answer])
      );

      // Create a map of new answers by questionId
      const newAnswersMap = new Map(
        formattedAnswers.map((answer) => [answer.questionId, answer])
      );

      // Combine answers without duplicates
      const combinedAnswers = Array.from(
        new Set([...step2AnswersMap.values(), ...newAnswersMap.values()])
      );

      // Validate and save
      const isValid = validateStep1(formattedAnswers);
      if (isValid) {
        dispatch(completeStep(1));
      } else {
        dispatch(markStepIncomplete(1));
      }

      dispatch(setTripDetails(combinedAnswers));
      localStorage.setItem('tripDetails', JSON.stringify(combinedAnswers));
    },
    [dispatch, step2Answers, validateStep1]
  );

  // Handle step 2 answer changes
  const handleStep2Change = useCallback(
    (answers: Answer[]) => {
      setStep2Answers(answers);

      // Combine with step 1 answers
      const combinedAnswers = [...step1Answers, ...answers];

      // Validate and save
      const isValid = validateStep2(answers);
      if (isValid) {
        dispatch(completeStep(2));
      } else {
        dispatch(markStepIncomplete(2));
      }

      dispatch(setTripDetails(combinedAnswers));
      localStorage.setItem('tripDetails', JSON.stringify(combinedAnswers));
    },
    [dispatch, step1Answers, validateStep2]
  );

  // Initialization effect
  useLayoutEffect(() => {
    console.log('=== Initialization Effect Running ===');

    const initializeState = async () => {
      // Get stored trip details
      const tripDetailsStr = localStorage.getItem('tripDetails');

      if (!tripDetailsStr) {
        console.log('No trip details found');
        setInitialized(true);
        return;
      }

      try {
        const parsedTripDetails = JSON.parse(tripDetailsStr);

        // Only process if we have new details and they are valid
        if (tripDetailsStr !== lastProcessedTripDetailsRef.current) {
          console.log('Processing new trip details');
          lastProcessedTripDetailsRef.current = tripDetailsStr;

          // Ensure we have valid trip details before dispatching
          if (
            Array.isArray(parsedTripDetails) &&
            parsedTripDetails.length > 0
          ) {
            // Format money values
            const formattedDetails = parsedTripDetails.map((answer) => {
              if (
                answer.questionId === 'ticket_cost' ||
                answer.questionId === 'trip_costs'
              ) {
                if (answer.value && !answer.value.includes('€')) {
                  const numericValue = parseFloat(
                    answer.value.replace(/[^0-9.-]+/g, '')
                  );
                  if (!isNaN(numericValue)) {
                    return {
                      ...answer,
                      value: `€${numericValue.toFixed(2)}`,
                    };
                  }
                }
              }
              return answer;
            });

            // Split answers into step 1 and step 2
            const step1 = formattedDetails.filter((a) =>
              [
                'travel_status',
                'refund_status',
                'ticket_cost',
                'alternative_flight_airline_expense',
                'alternative_flight_own_expense',
                'trip_costs',
              ].includes(a.questionId)
            );
            const step2 = formattedDetails.filter((a) =>
              ['informed_date', 'specific_informed_date'].includes(a.questionId)
            );

            setStep1Answers(step1);
            setStep2Answers(step2);

            // Validate both steps
            validateStep(1, validateStep1(step1));
            validateStep(2, validateStep2(step2));

            await dispatch(setTripDetails(formattedDetails));
          } else {
            console.log('Invalid trip details format');
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('Error initializing trip experience state:', error);
        setInitialized(true);
      }
    };

    initializeState();
  }, [dispatch, validateStep, validateStep1, validateStep2]);

  // Get the appropriate selected flight based on travel status
  const getSelectedFlight = (
    answers: Answer[]
  ): Flight | Flight[] | null | undefined => {
    const travelStatus = answers.find(
      (a) => a.questionId === 'travel_status'
    )?.value;
    if (travelStatus === 'airline_expense') {
      return selectedAirlineExpenseFlight;
    } else if (travelStatus === 'own_expense') {
      return selectedOwnExpenseFlight;
    }
    return null;
  };

  // Navigation handlers
  const handleBack = useCallback(() => {
    // Save current state before going back
    localStorage.setItem(
      'tripExperience_step1Answers',
      JSON.stringify(step1Answers)
    );
    localStorage.setItem(
      'tripExperience_step2Answers',
      JSON.stringify(step2Answers)
    );
    localStorage.setItem(
      'tripExperience_completedSteps',
      JSON.stringify(completedSteps)
    );
    localStorage.setItem(
      'tripExperience_interactedSteps',
      JSON.stringify(interactedSteps)
    );

    router.push('/phases/flight-details');
  }, [router, step1Answers, step2Answers, completedSteps, interactedSteps]);

  const canContinue = useCallback(() => {
    return isStepCompleted(1) && isStepCompleted(2);
  }, [isStepCompleted]);

  const handleContinue = async () => {
    if (!canContinue) return;

    try {
      // Get the travel status from step 1 answers
      const travelStatus = step1Answers.find(
        (a) => a.questionId === 'travel_status'
      )?.value;

      // Get the booked flight IDs
      const bookedFlightIds = selectedFlight ? [selectedFlight.id] : [];

      // Validate that we have flight IDs
      if (!bookedFlightIds.length) {
        console.error(
          'No flight IDs available for travel status:',
          travelStatus
        );
        const searchParams = new URLSearchParams();
        const reasons = {
          general: 'Unable to evaluate your claim',
          reasons: [
            'No flight details were found for your travel situation. Please make sure you have selected a flight in the previous step.',
          ],
          has_prerequisites: false,
        };
        searchParams.set(
          'reasons',
          encodeURIComponent(JSON.stringify(reasons))
        );
        router.push(`/claim-rejected?${searchParams.toString()}`);
        return;
      }

      // Get the informed date
      const informedDate = step2Answers.find(
        (a) => a.questionId === 'informed_date'
      )?.value;
      const specificDate = step2Answers.find(
        (a) => a.questionId === 'specific_informed_date'
      )?.value;

      // Get the delay duration from wizard answers
      const delayDuration = localStorage.getItem('wizardAnswers')
        ? JSON.parse(localStorage.getItem('wizardAnswers') || '[]').find(
            (a: Answer) => a.questionId === 'delay_duration'
          )?.value
        : undefined;

      // Format the informed date as YYYY-MM-DD
      const informationReceivedAt =
        informedDate === 'on_departure'
          ? new Date().toISOString().split('T')[0] // Use current date for "on departure"
          : specificDate
            ? new Date(specificDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];

      // Map travel status to API values
      const mapTravelStatus = (status: string) => {
        switch (status) {
          case 'took_booked':
            return 'took_booked';
          case 'airline_expense':
            return 'took_alternative_airline';
          case 'own_expense':
            return 'took_alternative_own';
          case 'no_travel':
            return 'no_travel';
          default:
            console.error('Unknown travel status:', status);
            return 'took_booked'; // Default to took_booked as fallback
        }
      };

      // Log the request data before sending
      console.log('Sending evaluation request:', {
        journey_booked_flightids: bookedFlightIds,
        information_received_at: informationReceivedAt,
        delay_duration: delayDuration || 'gt3',
        travel_status: mapTravelStatus(travelStatus || ''),
      });

      // Evaluate the claim
      const response = await fetch(
        '/.netlify/functions/evaluateeuflightclaim',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            journey_booked_flightids: bookedFlightIds,
            information_received_at: informationReceivedAt,
            delay_duration: delayDuration || 'gt3', // Default to >3 hours if not specified
            travel_status: mapTravelStatus(travelStatus || ''),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.status === 'accept') {
        // Clear saved data since we're moving to success page
        localStorage.removeItem('tripExperience_step1Answers');
        localStorage.removeItem('tripExperience_step2Answers');
        localStorage.removeItem('tripExperience_completedSteps');
        localStorage.removeItem('tripExperience_interactedSteps');

        // Store the evaluation result
        localStorage.setItem('evaluationResult', JSON.stringify(result));

        // Update progress state
        dispatch(setCurrentPhase(5));
        dispatch(completePhase(4));

        // Format success details
        const searchParams = new URLSearchParams();
        searchParams.set('amount', (result.contract?.amount || 0).toString());
        searchParams.set('currency', 'EUR');
        searchParams.set(
          'provision',
          (result.contract?.provision || 0).toString()
        );
        if (selectedFlight?.departureAirport) {
          searchParams.set('depAirport', selectedFlight.departureAirport);
        }
        if (selectedFlight?.arrivalAirport) {
          searchParams.set('arrAirport', selectedFlight.arrivalAirport);
        }
        if (selectedFlight?.scheduledDepartureTime) {
          searchParams.set('depTime', selectedFlight.scheduledDepartureTime);
        }
        if (selectedFlight?.bookingReference) {
          searchParams.set('bookingRef', selectedFlight.bookingReference);
        }
        router.push(`/claim-success?${searchParams.toString()}`);
      } else {
        // Handle rejection
        const searchParams = new URLSearchParams();
        const reasons = {
          general: 'Your claim was not accepted',
          reasons: [
            'Based on the information provided, your situation does not qualify for compensation under EU Regulation 261/2004.',
            result.message || 'The claim evaluation was unsuccessful.',
          ],
          has_prerequisites: false,
        };
        searchParams.set(
          'reasons',
          encodeURIComponent(JSON.stringify(reasons))
        );
        router.push(`/claim-rejected?${searchParams.toString()}`);
      }
    } catch (error) {
      console.error('Error during claim evaluation:', error);
      const searchParams = new URLSearchParams();
      const reasons = {
        error:
          'An error occurred while evaluating your claim. Please try again later.',
      };
      searchParams.set('reasons', encodeURIComponent(JSON.stringify(reasons)));
      router.push(`/claim-rejected?${searchParams.toString()}`);
    }
  };

  useEffect(() => {
    pushToDataLayer({ step_position: 3 });
  }, []);

  return (
    <PhaseGuard phase={4}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={4} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Let's talk about your trip experience. This will help us understand what happened and how we can help you." />

            {/* Step 1: Travel Status */}
            <AccordionCard
              title="Travel Experience"
              eyebrow="Step 1"
              summary="Tell us about your experience"
              isCompleted={completedSteps.includes(1)}
              hasInteracted={interactedSteps.includes(1)}
              isOpenByDefault={!completedSteps.includes(1)}
              shouldStayOpen={false}
              stepId="experience-details"
              isOpen={openSteps.includes(1)}
              className={accordionConfig.padding.wrapper}
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
                {initialized && (
                  <QAWizard
                    questions={questions}
                    initialAnswers={step1Answers}
                    onComplete={handleAnswerChange}
                    selectedFlight={getSelectedFlight(step1Answers)}
                    onInteract={() =>
                      setInteractedSteps((prev) =>
                        prev.includes(1) ? prev : [...prev, 1]
                      )
                    }
                    phase={4}
                    stepNumber={1}
                  />
                )}
              </div>
            </AccordionCard>

            {/* Step 2: Informed Date */}
            <AccordionCard
              title="When were you informed?"
              eyebrow="Step 2"
              summary="Tell us when you were informed about the changes"
              isCompleted={completedSteps.includes(2)}
              hasInteracted={interactedSteps.includes(2)}
              isOpenByDefault={false}
              shouldStayOpen={false}
              stepId="informed-date"
              isOpen={openSteps.includes(2)}
              className={accordionConfig.padding.wrapper}
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
                {initialized && (
                  <QAWizard
                    questions={informedDateQuestions}
                    initialAnswers={step2Answers}
                    onComplete={handleStep2Change}
                    onInteract={() =>
                      setInteractedSteps((prev) =>
                        prev.includes(2) ? prev : [...prev, 2]
                      )
                    }
                    phase={4}
                    stepNumber={2}
                  />
                )}
              </div>
            </AccordionCard>

            {/* Navigation */}
            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton onClick={handleBack} />
              <ContinueButton
                onClick={handleContinue}
                disabled={!canContinue()}
                text="Check Claim"
              />
            </div>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
