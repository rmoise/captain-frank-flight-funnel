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
import { accordionConfig } from '@/config/accordion';
import { useRouter } from 'next/navigation';
import { pushToDataLayer } from '@/utils/gtm';
import { useStore, PHASE_TO_URL } from '@/lib/state/store';
import type { StoreStateValues, ValidationStateSteps } from '@/lib/state/store';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { ContinueButton } from '@/components/shared/ContinueButton';

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

// Add summaryInitialState
const summaryInitialState: StoreStateValues = {
  selectedType: 'direct',
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: new Date(),
    selectedFlight: null,
  },
  flightSegments: [
    {
      fromLocation: null,
      toLocation: null,
      date: new Date(),
      selectedFlight: null,
    },
  ],
  currentSegmentIndex: 0,
  fromLocation: null,
  toLocation: null,
  selectedDate: null,
  selectedFlights: [],
  selectedFlight: null,
  flightDetails: null,
  delayDuration: null,
  wizardCurrentSteps: {},
  wizardAnswers: [],
  wizardIsCompleted: false,
  wizardSuccessMessage: '',
  wizardIsEditingMoney: false,
  wizardLastActiveStep: null,
  wizardShowingSuccess: false,
  wizardValidationState: {},
  wizardIsValidating: false,
  personalDetails: null,
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
  currentPhase: 1,
  completedPhases: [],
  currentStep: 1,
  completedSteps: [],
  openSteps: [1],
  locationError: null,
  validationState: {
    isFlightValid: false,
    isWizardValid: false,
    isPersonalValid: false,
    isTermsValid: false,
    isSignatureValid: false,
    isBookingValid: false,
    stepValidation: {
      1: false,
      2: false,
      3: false,
      4: false,
    },
    stepInteraction: {
      1: false,
      2: false,
      3: false,
      4: false,
    },
    fieldErrors: {},
    1: false,
    2: false,
    3: false,
    4: false,
  },
  isValidating: false,
  bookingNumber: '',
  lastAnsweredQuestion: null,
  compensationAmount: null,
  compensationLoading: false,
  compensationError: null,
  isInitializing: false,
  isTransitioningPhases: false,
  wizardIsValid: false,
  completedWizards: {},
  compensationCache: {
    amount: null,
    flightData: null,
  },
  signature: '',
  hasSignature: false,
  tripExperienceAnswers: [],
  lastValidAnswers: [],
  lastValidStep: 0,
  wizardSuccessStates: {
    travel_status: { showing: false, message: '' },
    informed_date: { showing: false, message: '' },
    issue: { showing: false, message: '' },
    phase1: { showing: false, message: '' },
    default: { showing: false, message: '' },
  },
  evaluationResult: {
    status: null,
  },
  isLoading: false,
};

export default function InitialAssessment() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);

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
    openSteps,
    completedPhases,
    validationState,
    setWizardAnswers,
    setPersonalDetails,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    setSelectedFlights,
    setOpenSteps,
    setCurrentPhase,
    completePhase,
    initializeStore,
    markWizardComplete,
    validateQAWizard,
    isStepValid,
    canProceedToNextPhase,
    completedSteps,
  } = useStore();

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!mounted) {
          console.log('\n=== Initializing Initial Assessment Page ===');
          await initializeStore();
          setCurrentPhase(1);
          setMounted(true);
          console.log('=== Initialization Complete ===\n');
        }
      } catch (error) {
        console.error('Failed to initialize state:', error);
      }
    };

    initialize();
  }, [mounted, initializeStore, setCurrentPhase]);

  // State logging effect
  useEffect(() => {
    if (!mounted) return;

    // Log overall state
    console.log('\n=== Initial Assessment Step State ===');
    console.log('Completed Steps:', completedSteps);
    console.log('Current Step:', currentStep);
    console.log('Flight State:', {
      fromLocation,
      toLocation,
      selectedFlights,
      isValid: isStepValid(1),
    });
    console.log('Wizard State:', {
      wizardAnswers,
      isValid: isStepValid(2),
    });
    console.log('Personal Details State:', {
      personalDetails,
      isValid: isStepValid(3),
    });
    console.log('Terms State:', {
      termsAccepted,
      privacyAccepted,
      marketingAccepted,
      isValid: isStepValid(4),
    });
    console.log('Validation State:', validationState);
    console.log('=== End Initial Assessment Step State ===\n');
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
      console.log('\n=== QAWizard Completion ===');
      console.log('Answers:', answers);

      // Store the answers and let the store handle validation
      setWizardAnswers(answers);
      markWizardComplete('initial_assessment');
      validateQAWizard();
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);

      console.log('=== End QAWizard Completion ===\n');
    },
    [setWizardAnswers, markWizardComplete, validateQAWizard]
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
        title: 'Flight Details',
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
        },
        getSummary: (state: StoreStateValues) => {
          const from = state.fromLocation;
          const to = state.toLocation;
          if (!from || !to) return '';

          const parseLocation = (loc: string | null) => {
            if (!loc) return null;
            try {
              return JSON.parse(loc);
            } catch {
              return loc;
            }
          };

          const fromData = parseLocation(from);
          const toData = parseLocation(to);

          if (!fromData || !toData) return '';

          const getLocationLabel = (loc: LocationData | string): string => {
            if (typeof loc === 'string') return loc;
            return loc.label || loc.value || '';
          };

          return `Flight from ${getLocationLabel(fromData)} to ${getLocationLabel(toData)}`;
        },
        shouldStayOpen: false,
        isOpenByDefault: true,
      },
      {
        id: 2 as ValidationStateSteps,
        name: 'QAWizard',
        title: 'What happened with your flight?',
        component: QAWizardWrapper,
        props: {
          questions: wizardQuestions,
          onComplete: handleComplete,
          onInteract: () => {
            console.log('QAWizard onInteract called');
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

          return answeredCount ? `${answeredCount} questions answered` : '';
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
      {
        id: 3 as ValidationStateSteps,
        name: 'PersonalDetails',
        title: 'Personal Details',
        subtitle:
          'Please provide your contact details so we can keep you updated about your claim.',
        component: PersonalDetailsForm,
        props: {
          onComplete: (details: PassengerDetails | null) => {
            setPersonalDetails(details);
          },
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 3])]),
        } as PersonalDetailsFormProps,
        getSummary: (state: StoreStateValues) => {
          const details = state.personalDetails;
          if (!details) return '';

          return details.firstName && details.lastName
            ? `${details.firstName} ${details.lastName}`
            : '';
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
      {
        id: 4 as ValidationStateSteps,
        name: 'TermsAndConditions',
        title: 'Terms and Conditions',
        subtitle: 'Please review and accept the terms to proceed.',
        component: function TermsAndConditions() {
          return (
            <div className="space-y-4">
              <ConsentCheckbox
                id="terms"
                type="terms"
                label="I have read and agree to the terms and conditions."
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
                label="I have read and agree to the privacy policy."
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
                label="I agree that Captain Frank may send me advertising about Captain Frank's services, promotions and satisfaction surveys by email. Captain Frank will process my personal data for this purpose (see privacy policy). I can revoke this consent at any time."
                checked={marketingAccepted}
                onChange={(checked: boolean) => {
                  setMarketingAccepted(checked);
                  setInteractedSteps((prev) => [...new Set([...prev, 4])]);
                }}
                details="Stay updated with our latest services and travel tips. You can unsubscribe at any time."
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
          return 'Terms and Privacy Policy accepted';
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
      console.error('Error completing phase:', error);
    } finally {
      setIsLoading(false);
    }
  }, [completePhase, router]);

  // Update the renderStep function
  const renderStep = (step: Step) => {
    const isCompleted = isStepValid(step.id as ValidationStateSteps);
    const hasInteracted = interactedSteps.includes(step.id);
    const summary = step.getSummary({
      ...summaryInitialState,
      wizardAnswers,
      personalDetails,
      selectedFlights,
      termsAccepted,
      privacyAccepted,
      marketingAccepted,
      fromLocation,
      toLocation,
      validationState,
      currentPhase: 1,
    });

    const isOpen = openSteps.includes(step.id);

    const renderStepContent = () => {
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
      const TermsComponent =
        step.component as React.FC<TermsAndConditionsProps>;
      return <TermsComponent {...(step.props as TermsAndConditionsProps)} />;
    };

    return (
      <div
        key={step.id}
        className="mb-0"
        data-step={step.id}
        style={{
          scrollMarginTop: '1rem',
          scrollSnapAlign: 'start',
          scrollSnapStop: 'always',
        }}
      >
        <AccordionCard
          title={step.title}
          subtitle={step.subtitle}
          eyebrow={`Step ${step.id}`}
          isOpen={isOpen}
          isCompleted={isCompleted}
          hasInteracted={hasInteracted}
          summary={summary}
          shouldStayOpen={step.shouldStayOpen}
          isOpenByDefault={step.isOpenByDefault}
          className={accordionConfig.padding.wrapper}
          stepId={
            step.id === 1
              ? 'flight-selection'
              : step.id === 2
                ? 'qa-wizard'
                : step.id === 3
                  ? 'passenger-info'
                  : `step-${step.id}`
          }
          onToggle={() => {
            const isCurrentlyOpen = openSteps.includes(step.id);
            const newOpenSteps = isCurrentlyOpen
              ? openSteps.filter((id: number) => id !== step.id)
              : [...openSteps, step.id];
            setOpenSteps(newOpenSteps);
          }}
        >
          <div className={accordionConfig.padding.content}>
            {renderStepContent()}
          </div>
        </AccordionCard>
      </div>
    );
  };

  useEffect(() => {
    pushToDataLayer({ step_position: 1 });
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <PhaseNavigation currentPhase={1} completedPhases={completedPhases} />
      <div className="relative">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Welcome to Captain Frank! Let's start by gathering some information about your flight." />
            {steps.map(renderStep)}

            {/* Continue Button */}
            <div className="mt-8 flex justify-end">
              <ContinueButton
                onClick={handleContinue}
                disabled={!canProceedToNextPhase()}
                isLoading={isLoading}
                text="Continue to Compensation Estimate"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
