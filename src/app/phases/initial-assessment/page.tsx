'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AccordionCard } from '@/components/shared/AccordionCard';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import FlightSelector from '@/components/booking/FlightSelector';
import { QAWizardWrapper } from '@/components/wizard/QAWizardWrapper';
import { getWizardQuestions } from '@/constants/wizardQuestions';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import type { Question } from '@/types/experience';
import { useRouter } from 'next/navigation';
import { pushToDataLayer } from '@/utils/gtm';
import { useStore, PHASE_TO_URL, getLanguageAwareUrl } from '@/lib/state/store';
import type {
  StoreStateValues,
  ValidationStateSteps,
  ValidationState,
} from '@/lib/state/store';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { accordionConfig } from '@/config/accordion';
import { useAccordion } from '@/components/shared/AccordionContext';
import { useTranslation } from '@/hooks/useTranslation';

interface LocationData {
  value: string;
  label: string;
}

interface FlightSelectorProps {
  onSelect: (flights: Flight | Flight[] | null) => void;
  onInteract: () => void;
  showFlightSearch?: boolean;
  showResults?: boolean;
  showFlightDetails?: boolean;
  selectedFlight?: Flight | null;
  currentPhase?: number;
  stepNumber: ValidationStateSteps;
  setValidationState: (
    state:
      | Record<number, boolean>
      | ((prev: Record<number, boolean>) => Record<number, boolean>)
  ) => void;
}

interface QAWizardProps {
  questions: Question[];
  onComplete: (answers: Answer[]) => void;
  onInteract: () => void;
  phase: number;
  stepNumber: ValidationStateSteps;
  selectedFlights: Flight[];
}

interface PersonalDetailsFormProps {
  onComplete: (details: PassengerDetails | null) => void;
  onInteract: () => void;
  isClaimSuccess?: boolean;
  showAdditionalFields?: boolean;
}

interface TermsAndConditionsProps {
  onInteract: () => void;
}

type StepComponent =
  | typeof FlightSelector
  | typeof QAWizardWrapper
  | typeof PersonalDetailsForm
  | React.FC<TermsAndConditionsProps>;

interface Step {
  id: ValidationStateSteps;
  name: string;
  title: string;
  subtitle?: string;
  component: StepComponent;
  props:
    | FlightSelectorProps
    | QAWizardProps
    | PersonalDetailsFormProps
    | TermsAndConditionsProps;
  getSummary: (state: StoreStateValues) => string;
  shouldStayOpen: boolean;
  isOpenByDefault: boolean;
}

export default function InitialAssessment() {
  const { t, lang } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);
  const wizardQuestions = getWizardQuestions(t);

  const {
    wizardAnswers,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    selectedFlights,
    personalDetails,
    fromLocation,
    toLocation,
    currentStep,
    validationState,
    setWizardAnswers,
    setPersonalDetails,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    setSelectedFlights,
    setCurrentPhase,
    completePhase,
    initializeStore,
    markWizardComplete,
    validateQAWizard,
    isStepValid,
    canProceedToNextPhase,
    completedSteps,
    updateValidationState,
    currentPhase,
    completedPhases,
  } = useStore();

  const { autoTransition, activeAccordion } = useAccordion();

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!mounted) {
          console.log('Initializing store - before:', {
            wizardAnswers,
            validationState,
            completedSteps,
          });

          await initializeStore();
          setCurrentPhase(1);

          // Check if this is actually first visit by looking at store state
          const hasExistingData =
            selectedFlights.length > 0 ||
            wizardAnswers.length > 0 ||
            personalDetails !== null ||
            termsAccepted;
          setIsFirstVisit(!hasExistingData);

          // Get saved validation state from localStorage
          const savedValidationState = localStorage.getItem(
            'initialAssessmentValidation'
          );
          const savedCompletedSteps = localStorage.getItem(
            'initialAssessmentCompletedSteps'
          );

          // If we have saved state, restore it
          if (savedValidationState) {
            try {
              const parsedValidationState = JSON.parse(savedValidationState);
              updateValidationState(parsedValidationState);
            } catch (error) {
              console.error('Error parsing saved validation state:', error);
            }
          }

          // If we have saved completed steps, restore them
          if (savedCompletedSteps) {
            try {
              const parsedCompletedSteps = JSON.parse(savedCompletedSteps);
              parsedCompletedSteps.forEach((step: number) =>
                completePhase(step)
              );
            } catch (error) {
              console.error('Error parsing saved completed steps:', error);
            }
          }

          // Only validate wizard if it was previously submitted
          if (wizardAnswers.length > 0 && validationState.isWizardSubmitted) {
            console.log(
              'Validating wizard answers after reload - answers were previously submitted'
            );
            markWizardComplete('initial_assessment');
            validateQAWizard();
          } else {
            console.log('Skipping validation - answers not yet submitted');
          }

          console.log('Initialization complete - after:', {
            wizardAnswers,
            validationState,
            completedSteps,
          });

          // Don't set an initial accordion if we have existing data
          setInitialAccordion(hasExistingData ? null : '1');

          // Update interacted steps based on validation state
          const interactedStepsFromValidation = Object.entries(
            validationState.stepInteraction
          )
            .filter(([, hasInteracted]) => hasInteracted)
            .map(([step]) => parseInt(step))
            .filter((step) => !isNaN(step));

          setInteractedSteps(interactedStepsFromValidation);
          setMounted(true);
        }
      } catch (error) {
        console.error('Error during initialization:', error);
      }
    };

    initialize();
  }, [
    mounted,
    initializeStore,
    setCurrentPhase,
    selectedFlights,
    wizardAnswers,
    personalDetails,
    termsAccepted,
    markWizardComplete,
    validateQAWizard,
    validationState,
    completedSteps,
    wizardQuestions,
    completePhase,
    updateValidationState,
  ]);

  // Save active accordion when it changes
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      if (activeAccordion) {
        sessionStorage.setItem('activeAccordion', activeAccordion);
      } else {
        sessionStorage.removeItem('activeAccordion');
      }
    }
  }, [mounted, activeAccordion, wizardQuestions]);

  // Save validation state and completed steps when they change
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(
        'initialAssessmentValidation',
        JSON.stringify(validationState)
      );
      localStorage.setItem(
        'initialAssessmentCompletedSteps',
        JSON.stringify(completedSteps)
      );
    }
  }, [mounted, validationState, completedSteps, wizardQuestions]);

  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      const currentStepNumber = parseInt(currentStepId) as ValidationStateSteps;

      console.log('InitialAssessment - handleAutoTransition:', {
        currentStepId,
        currentStepNumber,
        isCurrentStepValid: isStepValid(currentStepNumber),
        isStep3Valid: isStepValid(3),
        validationState: {
          stepValidation: validationState.stepValidation,
          stepInteraction: validationState.stepInteraction,
          isPersonalValid: validationState.isPersonalValid,
        },
        currentStep,
        completedSteps,
        personalDetails,
      });

      // Only proceed if current step is valid
      if (!isStepValid(currentStepNumber)) {
        console.log('Current step not valid, stopping transition');
        return null;
      }

      // Special case: if we're on step 3 and it's valid, always try to go to step 4
      if (currentStepNumber === 3) {
        console.log('On step 3, checking validity:', {
          isStep3Valid: isStepValid(3),
          validationState: validationState.stepValidation[3],
          personalDetails,
          completedSteps,
        });
        if (isStepValid(3)) {
          console.log('Step 3 is valid, transitioning to step 4');
          return '4';
        }
      }

      // Find the next uncompleted step
      for (let nextStep = 1; nextStep <= 4; nextStep++) {
        // Skip the current step
        if (nextStep === currentStepNumber) {
          console.log(`Skipping current step ${nextStep}`);
          continue;
        }
        // Skip completed steps unless it's step 4 (we always want to transition to terms)
        if (nextStep !== 4 && completedSteps.includes(nextStep)) {
          console.log(`Skipping completed step ${nextStep}`);
          continue;
        }
        // Found the next uncompleted step
        console.log(`Found next step: ${nextStep}`);
        return nextStep.toString();
      }

      console.log('No next step found');
      return null;
    },
    [isStepValid, validationState, currentStep, completedSteps, personalDetails]
  );

  // Remove any validation effects that might be interfering with toggling
  useEffect(() => {
    if (!mounted) return;
  }, [mounted]);

  const isQAWizardValid = useMemo(() => {
    if (!validationState.stepValidation[2]) return false;
    if (!validationState.isWizardSubmitted) return false;

    // Check if all required questions are answered
    const issueType = wizardAnswers.find(
      (a) => a.questionId === 'issue_type'
    )?.value;

    if (!issueType) return false;

    // Additional validation based on issue type
    switch (issueType) {
      case 'delay':
        // Need delay duration
        return wizardAnswers.some((a) => a.questionId === 'delay_duration');

      case 'cancel':
        // Need cancellation notice and alternative flight info
        const hasCancellationNotice = wizardAnswers.some(
          (a) => a.questionId === 'cancellation_notice'
        );
        const hasAirlineAlternative = wizardAnswers.some(
          (a) => a.questionId === 'alternative_flight_airline_expense'
        );
        const hasRefundStatus = wizardAnswers.some(
          (a) => a.questionId === 'refund_status'
        );

        if (
          !hasCancellationNotice ||
          !hasAirlineAlternative ||
          !hasRefundStatus
        )
          return false;

        // If airline didn't provide alternative, need own alternative info
        const airlineProvidedAlternative =
          wizardAnswers.find(
            (a) => a.questionId === 'alternative_flight_airline_expense'
          )?.value === 'yes';

        if (!airlineProvidedAlternative) {
          return wizardAnswers.some(
            (a) => a.questionId === 'alternative_flight_own_expense'
          );
        }
        return true;

      case 'missed':
        // Need missed costs info
        const hasMissedCosts = wizardAnswers.some(
          (a) => a.questionId === 'missed_costs'
        );
        if (!hasMissedCosts) return false;

        // If they had costs, need amount
        const hadCosts =
          wizardAnswers.find((a) => a.questionId === 'missed_costs')?.value ===
          'yes';

        if (hadCosts) {
          return wizardAnswers.some(
            (a) => a.questionId === 'missed_costs_amount'
          );
        }
        return true;

      case 'other':
        // No additional questions needed for 'other'
        return true;

      default:
        return false;
    }
  }, [
    validationState.stepValidation,
    validationState.isWizardSubmitted,
    wizardAnswers,
  ]);

  const renderStep = (step: Step) => {
    const currentState = useStore.getState();
    const isStepCompleted =
      step.id === 2
        ? validationState.stepValidation[2] &&
          validationState.stepInteraction[2]
        : step.id === 3
          ? validationState.stepValidation[3] &&
            validationState.stepInteraction[3]
          : completedSteps.includes(step.id);

    const isCurrentStepValid =
      step.id === 2
        ? isQAWizardValid
        : step.id === 3
          ? validationState.isPersonalValid &&
            validationState.stepInteraction[3]
          : isStepValid(step.id);

    return (
      <AccordionCard
        key={step.id}
        title={step.title}
        subtitle={step.subtitle}
        stepId={step.id.toString()}
        isCompleted={isStepCompleted}
        hasInteracted={interactedSteps.includes(step.id)}
        isValid={isCurrentStepValid}
        summary={step.getSummary(currentState)}
        shouldStayOpen={false}
        isOpenByDefault={isFirstVisit && step.id === 1}
        className={accordionConfig.padding.wrapper}
        eyebrow={t.phases.initialAssessment.step.replace(
          '{number}',
          step.id.toString()
        )}
        isQA={step.id === 2}
      >
        <div className={accordionConfig.padding.content}>
          {renderStepContent(step)}
        </div>
      </AccordionCard>
    );
  };

  // State logging effect
  useEffect(() => {
    if (!mounted) return;
  }, [
    mounted,
    validationState,
    completedSteps,
    currentStep,
    wizardAnswers,
    personalDetails,
    selectedFlights,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    fromLocation,
    toLocation,
    isStepValid,
  ]);

  // QA Wizard completion handler
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log('QA Wizard completed:', {
        answers,
        currentValidation: validationState.stepValidation,
      });

      // Store the answers and mark as submitted
      setWizardAnswers(answers);
      markWizardComplete('initial_assessment');
      validateQAWizard();
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);

      // Update validation state to trigger auto-transition
      const newValidationState = {
        ...validationState,
        isWizardValid: true,
        isWizardSubmitted: true, // Add flag to track explicit submission
        stepValidation: {
          ...validationState.stepValidation,
          2: true,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: true,
        },
        2: true,
        _timestamp: Date.now(),
      };

      // Update validation state and completed steps atomically
      updateValidationState(newValidationState);

      // Force a transition after validation is updated
      setTimeout(() => {
        autoTransition('2', true, true);
      }, 100);
    },
    [
      setWizardAnswers,
      markWizardComplete,
      validateQAWizard,
      updateValidationState,
      autoTransition,
      setInteractedSteps,
      validationState,
    ]
  );

  // Update flight selection handler
  const handleFlightSelect = useCallback(
    (flight: Flight | Flight[]) => {
      const flights = Array.isArray(flight) ? flight : [flight];
      setSelectedFlights(flights);
      setInteractedSteps((prev) => [...new Set([...prev, 1])]);
    },
    [setSelectedFlights, setInteractedSteps]
  );

  // Define steps configuration
  const createSteps = useCallback(() => {
    const allSteps = [
      {
        id: 1 as ValidationStateSteps,
        name: t.phases.initialAssessment.flightDetails,
        title: t.phases.initialAssessment.title,
        subtitle: t.phases.initialAssessment.description,
        component: FlightSelector,
        props: {
          onSelect: handleFlightSelect,
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 1])]),
          showFlightSearch: selectedFlights.length === 0,
          showResults: selectedFlights.length === 0,
          showFlightDetails: selectedFlights.length === 0,
          selectedFlight: selectedFlights[0] || null,
          currentPhase: 1,
          stepNumber: 1 as ValidationStateSteps,
          setValidationState: (
            state:
              | Record<number, boolean>
              | ((prev: Record<number, boolean>) => Record<number, boolean>)
          ) => {
            // Update validation state for step 1
            const currentValidation = validationState.stepValidation;
            if (typeof state === 'function') {
              const newState = state({} as Record<number, boolean>);
              updateValidationState({
                stepValidation: {
                  1: newState[1] || false,
                  2: currentValidation[2] || false,
                  3: currentValidation[3] || false,
                  4: currentValidation[4] || false,
                  5: currentValidation[5] || false,
                },
                1: newState[1] || false,
              });
            } else {
              updateValidationState({
                stepValidation: {
                  1: state[1] || false,
                  2: currentValidation[2] || false,
                  3: currentValidation[3] || false,
                  4: currentValidation[4] || false,
                  5: currentValidation[5] || false,
                },
                1: state[1] || false,
              });
            }
          },
        },
        getSummary: (state: StoreStateValues) => {
          // For direct flights
          if (state.selectedType === 'direct' && state.directFlight) {
            const { fromLocation, toLocation } = state.directFlight;
            if (!fromLocation || !toLocation) return '';

            const parseLocation = (
              loc: LocationData | null | undefined
            ): LocationData | null => {
              if (!loc) return null;
              return {
                value: loc.value,
                label: loc.label,
              };
            };

            const fromData = parseLocation(fromLocation);
            const toData = parseLocation(toLocation);

            if (!fromData || !toData) return '';

            const getLocationLabel = (loc: LocationData): string => {
              return loc.label || loc.value || '';
            };

            return t.phases.initialAssessment.summary.directFlight
              .replace('{from}', getLocationLabel(fromData))
              .replace('{to}', getLocationLabel(toData));
          }

          // For multi-segment flights
          if (state.selectedType === 'multi' && state.flightSegments) {
            const segments = state.flightSegments.filter(
              (segment) => segment.fromLocation && segment.toLocation
            );

            if (segments.length === 0) return '';

            const parseLocation = (
              loc: LocationData | null | undefined
            ): LocationData | null => {
              if (!loc) return null;
              return {
                value: loc.value,
                label: loc.label,
              };
            };

            const getLocationLabel = (loc: LocationData): string => {
              return loc.label || loc.value || '';
            };

            const segmentSummaries = segments.map((segment) => {
              const fromData = parseLocation(segment.fromLocation);
              const toData = parseLocation(segment.toLocation);
              if (!fromData || !toData) return '';
              return `${getLocationLabel(fromData)} → ${getLocationLabel(toData)}`;
            });

            return t.phases.initialAssessment.summary.multiSegment
              .replace('{count}', segments.length.toString())
              .replace('{s}', segments.length > 1 ? 'en' : '')
              .replace('{segments}', segmentSummaries.join(' | '));
          }

          return '';
        },
        shouldStayOpen: false,
        isOpenByDefault: true,
      },
      {
        id: 2 as ValidationStateSteps,
        name: 'QAWizard',
        title: t.phases.initialAssessment.whatHappened,
        component: QAWizardWrapper,
        props: {
          questions: wizardQuestions,
          onComplete: handleComplete,
          onInteract: () => {
            setInteractedSteps((prev) => [...new Set([...prev, 2])]);
          },
          phase: 1,
          stepNumber: 2 as ValidationStateSteps,
          selectedFlights: selectedFlights,
        },
        getSummary: (state: StoreStateValues) => {
          if (!state.wizardAnswers?.length) return '';

          const activeQuestions = wizardQuestions.filter(
            (q: Question) => !q.showIf || q.showIf(state.wizardAnswers)
          );

          const answeredCount = activeQuestions.filter((q: Question) =>
            state.wizardAnswers.some(
              (a: Answer) => a.questionId === q.id && a.value
            )
          ).length;

          return answeredCount
            ? t.phases.initialAssessment.summary.questionsAnswered.replace(
                '{count}',
                answeredCount.toString()
              )
            : '';
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
      {
        id: 3 as ValidationStateSteps,
        name: 'PersonalDetails',
        title: t.phases.initialAssessment.personalDetails.title,
        subtitle: t.phases.initialAssessment.personalDetails.subtitle,
        component: PersonalDetailsForm,
        props: {
          onComplete: (details: PassengerDetails | null) => {
            console.log('PersonalDetails completed:', details);

            if (details) {
              // Set personal details first
              setPersonalDetails(details);

              // Update validation state
              const validationUpdate: Partial<ValidationState> = {
                isPersonalValid: true,
                stepValidation: {
                  ...validationState.stepValidation,
                  3: true,
                },
                stepInteraction: {
                  ...validationState.stepInteraction,
                  3: true,
                },
                3: true,
              };
              updateValidationState(validationUpdate);

              // Force a transition after state is updated
              setTimeout(() => {
                autoTransition('3', true);
              }, 100);
            } else {
              setPersonalDetails(null);
            }
          },
          onInteract: () => {
            // No-op - interaction is handled in onComplete
          },
          isClaimSuccess: false,
          showAdditionalFields: false,
        } as PersonalDetailsFormProps,
        getSummary: (state: StoreStateValues) => {
          const details = state.personalDetails;
          if (!details) return '';

          const parts = [];

          // Add name
          if (details.firstName && details.lastName) {
            parts.push(`${details.firstName} ${details.lastName}`);
          }

          // Add email
          if (details.email) {
            parts.push(details.email);
          }

          // Add phone if provided
          if (details.phone) {
            parts.push(details.phone);
          }

          return parts.join(' • ');
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
      {
        id: 4 as ValidationStateSteps,
        name: t.phases.initialAssessment.termsAndConditions.title,
        title: t.phases.initialAssessment.termsAndConditions.title,
        subtitle: t.phases.initialAssessment.termsAndConditions.subtitle,
        component: function TermsAndConditions() {
          return (
            <div className="space-y-4">
              <ConsentCheckbox
                id="terms"
                type="terms"
                label={t.phases.initialAssessment.termsAndConditions.terms}
                checked={termsAccepted}
                onChange={(checked: boolean) => {
                  setTermsAccepted(checked);
                  setInteractedSteps((prev) => [...new Set([...prev, 4])]);
                }}
                required={true}
              />
              <ConsentCheckbox
                id="privacy"
                type="privacy"
                label={t.phases.initialAssessment.termsAndConditions.privacy}
                checked={privacyAccepted}
                onChange={(checked: boolean) => {
                  setPrivacyAccepted(checked);
                  setInteractedSteps((prev) => [...new Set([...prev, 4])]);
                }}
                required={true}
              />
              <ConsentCheckbox
                id="marketing"
                type="marketing"
                label={t.phases.initialAssessment.termsAndConditions.marketing}
                checked={marketingAccepted}
                onChange={(checked: boolean) => {
                  setMarketingAccepted(checked);
                  setInteractedSteps((prev) => [...new Set([...prev, 4])]);
                }}
                details={
                  t.phases.initialAssessment.termsAndConditions.marketingDetails
                }
              />
            </div>
          );
        },
        props: {
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 4])]),
        } as TermsAndConditionsProps,
        getSummary: (state: StoreStateValues) => {
          if (!state.termsAccepted || !state.privacyAccepted) return '';
          return t.phases.initialAssessment.summary.termsAccepted;
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
    ];
    return allSteps;
  }, [
    handleFlightSelect,
    selectedFlights,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    setPersonalDetails,
    setInteractedSteps,
    handleComplete,
    updateValidationState,
    autoTransition,
    validationState,
    t,
    wizardQuestions,
  ]);

  // Define steps with memoization
  const steps = useMemo(() => createSteps(), [createSteps]);

  // Handle continue button click
  const handleContinue = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      await completePhase(1);
      router.push(getLanguageAwareUrl(PHASE_TO_URL[2], lang));
    } catch (error) {
      console.error('Error in handleContinue:', error);
    } finally {
      setIsLoading(false);
    }
  }, [completePhase, router, isLoading, lang]);

  const renderStepContent = (step: Step) => {
    if (step.component === FlightSelector) {
      return <FlightSelector {...(step.props as FlightSelectorProps)} />;
    }
    if (step.component === QAWizardWrapper) {
      return <QAWizardWrapper {...(step.props as QAWizardProps)} />;
    }
    if (step.component === PersonalDetailsForm) {
      return (
        <PersonalDetailsForm {...(step.props as PersonalDetailsFormProps)} />
      );
    }
    const TermsComponent = step.component as React.FC<TermsAndConditionsProps>;
    return <TermsComponent {...(step.props as TermsAndConditionsProps)} />;
  };

  useEffect(() => {
    pushToDataLayer({ step_position: 1 });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <AccordionProvider
      onAutoTransition={handleAutoTransition}
      initialActiveAccordion={initialAccordion}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PhaseNavigation
          currentPhase={currentPhase}
          completedPhases={completedPhases}
        />
        <div className="relative">
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble
                message={t.phases.initialAssessment.welcomeMessage}
              />
              {steps.map(renderStep)}
              <div className="mt-8 flex justify-end">
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!canProceedToNextPhase()}
                  isLoading={isLoading}
                  text={t.phases.initialAssessment.continueButton}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AccordionProvider>
  );
}
