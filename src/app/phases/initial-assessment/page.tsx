'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
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
  currentPhase: 1,
  isSearchModalOpen: false,
  searchTerm: '',
  displayedFlights: [],
  allFlights: [],
  loading: false,
  errorMessage: null,
  errorMessages: {},
  selectedFlights: [],
  selectedFlight: null,
  fromLocation: null,
  toLocation: null,
  selectedDate: null,
  currentSegmentIndex: 0,
  isTransitioningPhases: false,
  isInitializing: false,
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
  completedSteps: [],
  bookingNumber: '',
  phasesCompletedViaContinue: [],
  locationError: null,
  completedWizards: {},
  signature: '',
  hasSignature: false,
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
  completedPhases: [],
  currentStep: 1,
  openSteps: [1],
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
  flightDetails: null,
  delayDuration: null,
  wizardIsValid: false,
  lastAnsweredQuestion: null,
  compensationAmount: null,
  compensationLoading: false,
  compensationError: null,
  compensationCache: {
    amount: null,
    flightData: null,
  },
  isValidating: false,
};

export default function InitialAssessment() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const initRef = useRef(false);

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
    updateValidationState,
  } = useStore();

  // Single initialization effect
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!mounted) {
          await initializeStore();
          setCurrentPhase(1);
          setMounted(true);
        }
      } catch (error) {}
    };

    initialize();
  }, [mounted, initializeStore, setCurrentPhase]);

  // Initialize with step 1 open
  useEffect(() => {
    if (!mounted && !initRef.current) {
      initRef.current = true;
      setOpenSteps([1]);
    }
  }, [mounted, setOpenSteps]);

  // Keep steps open when completed and handle transitions
  useEffect(() => {
    console.log('Validation state changed:', validationState.stepValidation);
    console.log('Current open steps:', openSteps);

    const completedStepIds = Object.entries(validationState.stepValidation)
      .filter(([, isValid]) => isValid)
      .map(([id]) => parseInt(id));

    console.log('Completed step IDs:', completedStepIds);

    if (completedStepIds.length > 0) {
      const newOpenSteps = [...openSteps];
      let hasChanges = false;

      completedStepIds.forEach((id) => {
        // Keep completed steps open
        if (!openSteps.includes(id)) {
          console.log(`Step ${id} is validated, adding to open steps`);
          newOpenSteps.push(id);
          hasChanges = true;
        }

        // Open next step when current step is completed
        const nextStep = id + 1;
        if (nextStep <= 4 && !openSteps.includes(nextStep)) {
          console.log(`Opening next step ${nextStep}`);
          newOpenSteps.push(nextStep);
          hasChanges = true;
        }
      });

      if (hasChanges) {
        const uniqueSteps = Array.from(new Set(newOpenSteps)).sort(
          (a, b) => a - b
        );
        console.log('Setting new open steps:', uniqueSteps);
        setOpenSteps(uniqueSteps);
      }
    }
  }, [validationState.stepValidation, openSteps, setOpenSteps]);

  // State logging effect
  useEffect(() => {
    if (!mounted) return;

    // Log overall state
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
      // Store the answers and let the store handle validation
      setWizardAnswers(answers);
      markWizardComplete('initial_assessment');
      validateQAWizard();
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);
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
            if (typeof state === 'function') {
              const newState = state({} as Record<number, boolean>);
              updateValidationState({
                stepValidation: {
                  1: newState[1] || false,
                  2: false,
                  3: false,
                  4: false,
                },
                1: newState[1] || false,
              });
            } else {
              updateValidationState({
                stepValidation: {
                  1: state[1] || false,
                  2: false,
                  3: false,
                  4: false,
                },
                1: state[1] || false,
              });
            }
          },
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
            setPersonalDetails(details);
          },
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 3])]),
          isClaimSuccess: true,
          showAdditionalFields: false,
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
          eyebrow={`Schritt ${step.id}`}
          isOpen={isOpen}
          isCompleted={isCompleted}
          hasInteracted={hasInteracted}
          summary={summary}
          shouldStayOpen={false}
          isOpenByDefault={step.id === 1}
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
              ? openSteps.filter((id) => id !== step.id)
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
      <PhaseNavigation />
      <div className="relative">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="space-y-6">
            <SpeechBubble message="Hi, ich bin Captain Frank. Ich helfe dir herauszufinden, ob du Anspruch auf eine Entschädigung für deine Flugunterbrechung hast. Los geht's!" />
            {steps.map(renderStep)}

            {/* Continue Button */}
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
  );
}
