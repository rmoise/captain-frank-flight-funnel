'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AccordionCard } from '@/components/shared/AccordionCard';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import FlightSelector from '@/components/booking/FlightSelector';
import { QAWizardWrapper } from '@/components/wizard/QAWizardWrapper';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import type { Question } from '@/types/experience';
import { useRouter } from 'next/navigation';
import { pushToDataLayer } from '@/utils/gtm';
import { useStore, PHASE_TO_URL } from '@/lib/state/store';
import type { StoreStateValues, ValidationStateSteps } from '@/lib/state/store';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { accordionConfig } from '@/config/accordion';

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
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const [initialAccordion, setInitialAccordion] = useState<string | null>(null);

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
  } = useStore();

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!mounted) {
          await initializeStore();
          setCurrentPhase(1);

          // Check if this is actually first visit by looking at store state
          const hasExistingData =
            selectedFlights.length > 0 ||
            wizardAnswers.length > 0 ||
            personalDetails !== null ||
            termsAccepted;
          setIsFirstVisit(!hasExistingData);

          // If we have existing wizard answers, revalidate them
          if (wizardAnswers.length > 0) {
            markWizardComplete('initial_assessment');
            validateQAWizard();
          }

          // Get the last active accordion from session storage
          if (typeof window !== 'undefined') {
            const lastActiveAccordion =
              sessionStorage.getItem('activeAccordion');
            setInitialAccordion(
              lastActiveAccordion || (hasExistingData ? null : '1')
            );
          }

          setMounted(true);
        }
      } catch (error) {}
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
  ]);

  const handleAutoTransition = useCallback(
    (currentStepId: string) => {
      const currentStepNumber = parseInt(currentStepId) as ValidationStateSteps;
      const nextStepNumber = (currentStepNumber + 1) as ValidationStateSteps;

      console.log('InitialAssessment - handleAutoTransition:', {
        currentStepId,
        currentStepNumber,
        nextStepNumber,
        isCurrentStepValid: isStepValid(currentStepNumber),
        willTransition: nextStepNumber <= 4 && isStepValid(currentStepNumber),
        validationState: validationState.stepValidation,
        currentStep,
        completedSteps,
      });

      // Only return next step if it exists and current step is valid
      if (nextStepNumber <= 4 && isStepValid(currentStepNumber)) {
        console.log('InitialAssessment - Transitioning to next step:', {
          from: currentStepNumber,
          to: nextStepNumber,
          validationState: validationState.stepValidation,
        });
        return nextStepNumber.toString();
      }
      return null;
    },
    [isStepValid, validationState.stepValidation, currentStep, completedSteps]
  );

  // Remove any validation effects that might be interfering with toggling
  useEffect(() => {
    if (!mounted) return;
  }, [mounted]);

  const isQAWizardValid = useMemo(() => {
    if (!validationState.stepValidation[2]) return false;

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
  }, [validationState.stepValidation, wizardAnswers]);

  const renderStep = (step: Step) => {
    const currentState = useStore.getState();

    return (
      <AccordionCard
        key={step.id}
        title={step.title}
        subtitle={step.subtitle}
        stepId={step.id.toString()}
        isCompleted={completedSteps.includes(step.id)}
        hasInteracted={interactedSteps.includes(step.id)}
        isValid={step.id === 2 ? isQAWizardValid : isStepValid(step.id)}
        summary={step.getSummary(currentState)}
        shouldStayOpen={false}
        isOpenByDefault={isFirstVisit && step.id === 1}
        className={accordionConfig.padding.wrapper}
        eyebrow={`Schritt ${step.id}`}
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

      // Store the answers and let the store handle validation
      setWizardAnswers(answers);
      markWizardComplete('initial_assessment');
      validateQAWizard();
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);

      // Update validation state to trigger auto-transition
      updateValidationState({
        stepValidation: {
          ...validationState.stepValidation,
          2: true,
        },
        2: true,
      });
    },
    [
      setWizardAnswers,
      markWizardComplete,
      validateQAWizard,
      validationState.stepValidation,
      updateValidationState,
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
        name: 'FlightDetails',
        title: 'Erzähle uns von deinem Flug',
        subtitle: 'Please provide your flight information.',
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

            return `Direktflug von ${getLocationLabel(fromData)} nach ${getLocationLabel(toData)}`;
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

            return `Flug mit ${segments.length} Segment${segments.length > 1 ? 'en' : ''}: ${segmentSummaries.join(' | ')}`;
          }

          return '';
        },
        shouldStayOpen: false,
        isOpenByDefault: true,
      },
      {
        id: 2 as ValidationStateSteps,
        name: 'QAWizard',
        title: 'Was ist mit deinem Flug passiert?',
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

          return answeredCount ? `${answeredCount} Fragen beantwortet` : '';
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
      {
        id: 3 as ValidationStateSteps,
        name: 'PersonalDetails',
        title: 'Persönliche Angaben',
        subtitle:
          'Bitte gib uns deine Kontaktdaten, damit wir dich über deinen Anspruch auf dem Laufenden halten können.',
        component: PersonalDetailsForm,
        props: {
          onComplete: (details: PassengerDetails | null) => {
            console.log('PersonalDetails completed:', {
              details,
              currentValidation: validationState.stepValidation,
            });
            setPersonalDetails(details);
            setInteractedSteps((prev) => [...new Set([...prev, 3])]);
            if (details) {
              // Update validation state to trigger auto-transition
              updateValidationState({
                stepValidation: {
                  ...validationState.stepValidation,
                  3: true,
                },
                3: true,
              });
            }
          },
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 3])]),
          isClaimSuccess: true,
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
        name: 'Allgemeine Geschäftsbedingungen',
        title: 'Allgemeine Geschäftsbedingungen',
        subtitle:
          'Bitte überprüfe und akzeptiere die Bedingungen, um fortzufahren.',
        component: function TermsAndConditions() {
          return (
            <div className="space-y-4">
              <ConsentCheckbox
                id="terms"
                type="terms"
                label="Ich habe die Allgemeinen Geschäftsbedingungen gelesen und akzeptiere sie."
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
                label="Ich habe die Datenschutzerklärung gelesen und akzeptiere sie."
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
                label="Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe Datenschutzerklärung). Ich kann diese Einwilligung jederzeit widerrufen."
                checked={marketingAccepted}
                onChange={(checked: boolean) => {
                  setMarketingAccepted(checked);
                  setInteractedSteps((prev) => [...new Set([...prev, 4])]);
                }}
                details="Bleibe über unsere neuesten Dienstleistungen und Reisetipps auf dem Laufenden. Du kannst dich jederzeit abmelden."
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
          return 'Bedingungen und Datenschutzerklärung akzeptiert';
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
    validationState.stepValidation,
  ]);

  // Define steps with memoization
  const steps = useMemo(() => createSteps(), [createSteps]);

  // Handle continue button click
  const handleContinue = useCallback(async () => {
    setIsLoading(true);
    try {
      completePhase(1);
      await new Promise((resolve) => setTimeout(resolve, 300));
      router.push(PHASE_TO_URL[2]);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  }, [completePhase, router]);

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
        <PhaseNavigation />
        <div className="relative">
          <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
            <div className="space-y-6">
              <SpeechBubble message="Hi, ich bin Captain Frank. Ich helfe dir herauszufinden, ob du Anspruch auf eine Entschädigung für deine Flugunterbrechung hast. Los geht's!" />
              {steps.map(renderStep)}
              <div className="mt-8 flex justify-end">
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!canProceedToNextPhase()}
                  isLoading={isLoading}
                  text="Zur Ersteinschätzung"
                />
              </div>
            </div>
          </main>
        </div>
      </div>
    </AccordionProvider>
  );
}
