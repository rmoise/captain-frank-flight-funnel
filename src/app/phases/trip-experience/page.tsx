'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useEffect, useState } from 'react';
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

const questions: Question[] = [
  {
    id: 'travel_status',
    text: 'Please select what happened:',
    type: 'radio',
    options: [
      {
        id: 'none',
        value: 'none',
        label: "I didn't travel at all",
        showConfetti: true,
      },
      {
        id: 'self',
        value: 'self',
        label: 'I took the flights I booked',
      },
      {
        id: 'provided',
        value: 'provided',
        label: "I traveled differently at the airline's expense",
        showConfetti: true,
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
    showIf: (answers: Answer[]) =>
      answers.some(
        (a: Answer) => a.questionId === 'travel_status' && a.value === 'none'
      ),
  },
  {
    id: 'ticket_cost',
    text: 'How much did you pay for your ticket?',
    type: 'money',
    showIf: (answers: Answer[]) => {
      const hasNoneTravel = answers.some(
        (a: Answer) => a.questionId === 'travel_status' && a.value === 'none'
      );
      const hasNoRefund = answers.some(
        (a: Answer) => a.questionId === 'refund_status' && a.value === 'no'
      );
      console.log('=== ticket_cost showIf evaluation ===', {
        answers,
        hasNoneTravel,
        hasNoRefund,
        shouldShow: hasNoneTravel && hasNoRefund,
      });
      return hasNoneTravel && hasNoRefund;
    },
  },
  {
    id: 'alternative_flight_airline_expense',
    text: 'Please search for the alternative flight provided by the airline.',
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
    text: 'Please search for the alternative flight you took at your own expense.',
    type: 'flight_selector',
    relatedQuestions: [
      {
        id: 'trip_costs',
        text: 'Please enter the costs you spent on your trip',
        type: 'money',
      },
    ],
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
    text: 'On what date were you first informed by the airline?',
    type: 'radio',
    options: [
      {
        id: 'on_departure',
        value: 'on_departure',
        label: 'On the day of departure',
        showCheck: true,
      },
      {
        id: 'specific_date',
        value: 'specific_date',
        label: 'On a specific date',
        showCheck: true,
      },
    ],
  },
  {
    id: 'specific_informed_date',
    text: 'Please select the date you were informed',
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
    completedPhases,
    validationState,
    updateValidationState,
    goToPreviousPhase,
    completePhase,
    setCurrentPhase,
    setEvaluationResult,
    currentPhase,
    setWizardAnswers,
  } = useStore();

  // Filter answers for each wizard
  const tripExperienceAnswers = useMemo(
    () =>
      wizardAnswers?.filter((a) => a.questionId.startsWith('travel_status')) ??
      [],
    [wizardAnswers]
  );

  const informedDateAnswers = useMemo(
    () =>
      wizardAnswers?.filter((a) => a.questionId.startsWith('informed_date')) ??
      [],
    [wizardAnswers]
  );

  // Handler functions for completing steps
  const handleTripExperienceComplete = useCallback(() => {
    // Update validation state for travel status
    const store = useStore.getState();
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

  const handleInformedDateComplete = useCallback(() => {
    // Update validation state for informed date
    const store = useStore.getState();
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

  // Initialize state and restore validation
  useEffect(() => {
    if (!mounted) {
      const initializeState = async () => {
        try {
          // Set current phase
          setCurrentPhase(4);

          // If we have answers, validate them
          if (tripExperienceAnswers.length > 0) {
            const store = useStore.getState();
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
          if (informedDateAnswers.length > 0) {
            const store = useStore.getState();
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

          setMounted(true);
        } catch (error) {
          console.error('Error initializing trip experience page:', error);
        }
      };

      initializeState();
    }
  }, [mounted, setCurrentPhase, tripExperienceAnswers, informedDateAnswers]);

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

      // Log the travel status for debugging
      console.log('Trip Experience - Travel Status:', {
        travelStatus,
        allTripExperienceAnswers: tripExperienceAnswers,
        allWizardAnswers: useStore.getState().wizardAnswers,
      });

      // Get the booked flight IDs based on travel status
      const bookedFlightIds: string[] = [];
      if (selectedFlights[0]) {
        bookedFlightIds.push(selectedFlights[0].id);
      }

      console.log('Trip Experience - Flight IDs:', {
        bookedFlightIds,
        selectedFlights,
      });

      // Validate flight IDs
      if (bookedFlightIds.length === 0) {
        console.error('No flight IDs available');
        return;
      }

      // Get the informed date
      const informedDate = informedDateAnswers
        .find((a) => a.questionId === 'informed_date')
        ?.value?.toString();

      console.log('Trip Experience - Raw Date Information:', {
        informedDate,
        informedDateAnswers: informedDateAnswers.map((a) => ({
          questionId: a.questionId,
          value: a.value,
          shouldShow: a.shouldShow,
        })),
        selectedFlightDate: selectedFlights[0]?.date,
        allAnswers: useStore.getState().wizardAnswers.map((a) => ({
          questionId: a.questionId,
          value: a.value,
          shouldShow: a.shouldShow,
        })),
      });

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

        console.log('Trip Experience - Specific Date Processing:', {
          specificDateAnswer: specificDateAnswer
            ? {
                questionId: specificDateAnswer.questionId,
                value: specificDateAnswer.value,
                shouldShow: specificDateAnswer.shouldShow,
              }
            : undefined,
          informedDateAnswers: informedDateAnswers.map((a) => ({
            questionId: a.questionId,
            value: a.value,
            shouldShow: a.shouldShow,
          })),
          allWizardAnswers: useStore
            .getState()
            .wizardAnswers.filter((a) => a.questionId.includes('informed_date'))
            .map((a) => ({
              questionId: a.questionId,
              value: a.value,
              shouldShow: a.shouldShow,
            })),
        });

        if (specificDateAnswer?.value) {
          formattedDate = specificDateAnswer.value.toString();
          console.log('Found specific date:', {
            rawValue: specificDateAnswer.value,
            formattedDate,
            isValid: isValidYYYYMMDD(formattedDate),
          });
        } else {
          console.error('No specific date found in answers. Current state:', {
            informedDate,
            informedDateAnswers: informedDateAnswers.map((a) => ({
              questionId: a.questionId,
              value: a.value,
              shouldShow: a.shouldShow,
            })),
            allAnswers: useStore
              .getState()
              .wizardAnswers.filter((a) =>
                a.questionId.includes('informed_date')
              )
              .map((a) => ({
                questionId: a.questionId,
                value: a.value,
                shouldShow: a.shouldShow,
              })),
          });
        }
      }

      console.log('Trip Experience - Date Processing Result:', {
        informedDate,
        formattedDate,
        isValidFormat: formattedDate ? isValidYYYYMMDD(formattedDate) : false,
        allAnswers: informedDateAnswers.map((a) => ({
          questionId: a.questionId,
          value: a.value,
          shouldShow: a.shouldShow,
        })),
      });

      // Validate formatted date
      if (!formattedDate || !isValidYYYYMMDD(formattedDate)) {
        console.error('Date validation failed:', {
          informedDate,
          informedDateAnswers,
          selectedFlightDate: selectedFlights[0]?.date,
          formattedDate,
          allAnswers: useStore.getState().wizardAnswers,
        });
        throw new Error('No valid date available');
      }

      // Verify the date format matches YYYY-MM-DD
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formattedDate)) {
        console.error('Invalid date format:', {
          formattedDate,
          originalSpecificDate: informedDate,
          informedDate,
          selectedFlightDate: selectedFlights[0]?.date,
        });
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }

      // Validate that the date is a valid date
      const dateObj = new Date(formattedDate);
      if (isNaN(dateObj.getTime())) {
        console.error('Invalid date value:', {
          formattedDate,
          dateObj,
          originalSpecificDate: informedDate,
          selectedFlightDate: selectedFlights[0]?.date,
        });
        throw new Error('Invalid date value. Please select a valid date.');
      }

      console.log('Trip Experience - Formatted Date:', {
        formattedDate,
        originalSpecificDate: informedDate,
        selectedFlightDate: selectedFlights[0]?.date,
        dateObj,
      });

      // Create the current evaluation data
      const currentEvalData = {
        journey_booked_flightids: bookedFlightIds,
        journey_fact_flightids: [], // Always empty for no travel
        information_received_at: formattedDate,
        travel_status:
          travelStatus === 'none' ? 'no_travel' : travelStatus?.toString(),
        delay_duration: '240', // Always set for no travel claims
        lang: 'en',
      };

      // Remove undefined values from the request
      const cleanedEvalData = Object.fromEntries(
        Object.entries(currentEvalData).filter(([, v]) => v !== undefined)
      );

      console.log(
        'Trip Experience - Full Evaluation Request:',
        cleanedEvalData
      );

      // Check if we have a stored evaluation result with the same data
      const storedEvalResult = useStore.getState().evaluationResult;
      const hasDataChanged =
        !storedEvalResult ||
        JSON.stringify(cleanedEvalData) !==
          JSON.stringify({
            journey_booked_flightids: storedEvalResult.journey_booked_flightids,
            journey_fact_flightids: storedEvalResult.journey_fact_flightids,
            information_received_at: storedEvalResult.information_received_at,
            travel_status: storedEvalResult.travel_status,
            delay_duration: storedEvalResult.delay_duration,
          });

      let result = storedEvalResult;

      // Only make the API call if the data has changed
      if (hasDataChanged) {
        console.log('Evaluation data has changed, making API call');
        // Call the evaluate claim API using the Netlify function
        const response = await fetch(
          '/.netlify/functions/evaluateeuflightclaim',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(cleanedEvalData),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to evaluate claim');
        }

        result = await response.json();
        console.log('New claim evaluation result:', result);

        setEvaluationResult({
          ...result,
          journey_booked_flightids: currentEvalData.journey_booked_flightids,
          information_received_at: currentEvalData.information_received_at,
          travel_status: currentEvalData.travel_status,
        });
      } else {
        console.log('Using stored evaluation result:', result);
      }

      // Complete the current phase
      completePhase(currentPhase);

      // Get the next phase URL based on evaluation result
      const nextPhase = currentPhase + 1;
      const nextUrl =
        result.status === 'accept'
          ? PHASE_TO_URL[nextPhase]
          : '/phases/claim-rejected';

      if (nextUrl) {
        // Set the next phase in the store and navigate
        setCurrentPhase(nextPhase);
        if (result.status === 'reject') {
          // Add rejection reasons to URL
          const searchParams = new URLSearchParams();
          searchParams.set('reasons', JSON.stringify(result));
          router.push(`${nextUrl}?${searchParams.toString()}`);
        } else {
          router.push(nextUrl);
        }
      }
    } catch (error) {
      console.error('Error during claim evaluation:', error);
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
        <PhaseNavigation currentPhase={4} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Let's talk about your trip experience. This will help us understand what happened and how we can help you." />

            {/* Trip Experience Wizard */}
            <AccordionCard
              title="Travel Status"
              subtitle="Tell us what happened with your travel plans"
              isOpen={true}
              shouldStayOpen={true}
              isCompleted={validationState.stepValidation[2]}
              hasInteracted={validationState.stepInteraction[2]}
              stepId="travel-status"
              className={accordionConfig.padding.wrapper}
            >
              <QAWizard
                questions={questions}
                onComplete={(answers) => {
                  setWizardAnswers(answers);
                  handleTripExperienceComplete();
                }}
                onInteract={handleTripExperienceInteract}
                initialAnswers={tripExperienceAnswers}
                selectedFlight={selectedFlights[0] || null}
              />
            </AccordionCard>

            {/* Informed Date Wizard */}
            <AccordionCard
              title="Informed Date"
              subtitle="When were you informed about the changes?"
              isOpen={true}
              shouldStayOpen={true}
              isCompleted={validationState.stepValidation[3]}
              hasInteracted={validationState.stepInteraction[3]}
              stepId="informed-date"
              className={accordionConfig.padding.wrapper}
            >
              <QAWizard
                questions={informedDateQuestions}
                onComplete={(answers) => {
                  setWizardAnswers(answers);
                  handleInformedDateComplete();
                }}
                onInteract={handleInformedDateInteract}
                initialAnswers={informedDateAnswers}
              />
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
