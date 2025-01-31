'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { AccordionCard } from '@/components/shared/AccordionCard';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import { ModularFlightSelector } from '@/components/booking/ModularFlightSelector';
import { QAWizardWrapper } from '@/components/wizard/QAWizardWrapper';
import { getWizardQuestions } from '@/constants/wizardQuestions';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import type { Question } from '@/types/experience';
import { useRouter } from 'next/navigation';
import { pushToDataLayer } from '@/utils/gtm';
import { useStore } from '@/lib/state/store';
import type { StoreStateValues, ValidationStateSteps } from '@/lib/state/store';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { AccordionProvider } from '@/components/shared/AccordionContext';
import { accordionConfig } from '@/config/accordion';
import { useAccordion } from '@/components/shared/AccordionContext';
import { useTranslation } from '@/hooks/useTranslation';
import type { FlightSelectorProps } from '@/components/booking/ModularFlightSelector/types';
import { useFlightStore } from '@/lib/state/flightStore';
import type { LocationData } from '@/types/store';

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
  | typeof ModularFlightSelector
  | typeof QAWizardWrapper
  | typeof PersonalDetailsForm
  | React.FC<TermsAndConditionsProps>;

type Step = {
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
  shouldStayOpen?: boolean;
  isOpenByDefault?: boolean;
};

export default function InitialAssessment() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [isFirstVisit, setIsFirstVisit] = useState(true);
  const initialAccordion = '1';
  const wizardQuestions = getWizardQuestions(t);

  const mainStore = useStore();
  const flightStore = useFlightStore();
  const [isInitialized, setIsInitialized] = useState(false);

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
    markWizardComplete,
    isStepValid,
    canProceedToNextPhase,
    completedSteps,
    updateValidationState,
    currentPhase,
    completedPhases,
    batchUpdateWizardState,
    setCurrentPhase,
  } = mainStore;

  const { activeAccordion } = useAccordion();

  // Update flight selection handler
  const handleFlightSelect = useCallback(
    (flight: Flight | Flight[]) => {
      console.log('=== DEBUG: handleFlightSelect START ===', {
        flight: Array.isArray(flight) ? flight[0] : flight,
        timestamp: new Date().toISOString(),
      });

      const flights = Array.isArray(flight) ? flight : [flight];
      setSelectedFlights(flights);

      if (flights.length > 0) {
        const firstFlight = flights[0];
        const fromLocation = {
          value: firstFlight.departureCity,
          label: firstFlight.departureCity,
          city: firstFlight.departureCity,
          description:
            firstFlight.departureAirport || firstFlight.departureCity,
          dropdownLabel: `${firstFlight.departureAirport || firstFlight.departureCity} (${firstFlight.departureCity})`,
        };
        const toLocation = {
          value: firstFlight.arrivalCity,
          label: firstFlight.arrivalCity,
          city: firstFlight.arrivalCity,
          description: firstFlight.arrivalAirport || firstFlight.arrivalCity,
          dropdownLabel: `${firstFlight.arrivalAirport || firstFlight.arrivalCity} (${firstFlight.arrivalCity})`,
        };

        console.log('=== DEBUG: Setting Location Data ===', {
          fromLocation,
          toLocation,
          timestamp: new Date().toISOString(),
        });

        // Set locations in store
        mainStore.setFromLocation(JSON.stringify(fromLocation));
        mainStore.setToLocation(JSON.stringify(toLocation));

        // Set direct flight data
        if (flights.length === 1) {
          mainStore.setSelectedType('direct');
          const directFlightData = {
            fromLocation,
            toLocation,
            date: new Date(firstFlight.date),
            selectedFlight: firstFlight,
          };
          console.log('=== DEBUG: Setting Direct Flight Data ===', {
            directFlightData,
            timestamp: new Date().toISOString(),
          });
          mainStore.setDirectFlight(directFlightData);
        }

        // Force immediate re-render for summary update
        setMounted((prev) => !prev);

        // Update validation state for step 1
        updateValidationState({
          ...validationState,
          stepValidation: {
            ...validationState.stepValidation,
            1: true,
          },
          stepInteraction: {
            ...validationState.stepInteraction,
            1: true,
          },
          isFlightValid: true,
          _timestamp: Date.now(),
        });
      }
    },
    [
      setSelectedFlights,
      mainStore,
      updateValidationState,
      validationState,
      setMounted,
    ]
  );

  // Handle QA wizard completion
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      // Immediately open step 3 before any state updates
      const accordionContext = (window as any).__accordionContext;
      if (accordionContext?.setOpenAccordions) {
        accordionContext.setOpenAccordions(new Set(['1', '2', '3']));
      }

      setWizardAnswers(answers);
      markWizardComplete('initial_assessment');

      // Update validation state for step 2
      updateValidationState({
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          2: true,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          2: true,
        },
        isWizardValid: true,
        isWizardSubmitted: true,
        _timestamp: Date.now(),
      });

      // Set interacted steps
      setInteractedSteps((prev) => [...new Set([...prev, 2])]);
    },
    [
      setWizardAnswers,
      markWizardComplete,
      updateValidationState,
      validationState,
      setInteractedSteps,
    ]
  );

  // Handle personal details completion
  const handlePersonalDetailsComplete = useCallback(
    (details: PassengerDetails) => {
      if (!details) return;

      // Immediately open step 4 before any state updates
      const accordionContext = (window as any).__accordionContext;
      if (accordionContext?.setOpenAccordions) {
        accordionContext.setOpenAccordions(new Set(['1', '2', '3', '4']));
      }

      setPersonalDetails(details);

      // Update validation state for step 3
      updateValidationState({
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          3: true,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          3: true,
        },
        isPersonalValid: true,
        _timestamp: Date.now(),
      });

      // Set interacted steps
      setInteractedSteps((prev) => [...new Set([...prev, 3])]);
    },
    [
      setPersonalDetails,
      updateValidationState,
      validationState,
      setInteractedSteps,
    ]
  );

  // Handle terms acceptance
  const handleTermsChange = useCallback(
    (field: string) => (checked: boolean) => {
      let newTermsAccepted = termsAccepted;
      let newPrivacyAccepted = privacyAccepted;

      switch (field) {
        case 'hasAcceptedTerms':
          setTermsAccepted(checked);
          newTermsAccepted = checked;
          break;
        case 'hasAcceptedPrivacy':
          setPrivacyAccepted(checked);
          newPrivacyAccepted = checked;
          break;
        case 'hasAcceptedMarketing':
          setMarketingAccepted(checked);
          break;
      }

      const validationResult = {
        isValid: newTermsAccepted && newPrivacyAccepted,
      };

      // Update validation state for step 4
      updateValidationState({
        ...validationState,
        stepValidation: {
          ...validationState.stepValidation,
          4: validationResult.isValid,
        },
        stepInteraction: {
          ...validationState.stepInteraction,
          4: true,
        },
        isTermsValid: validationResult.isValid,
        _timestamp: Date.now(),
      });

      // Set interacted steps
      setInteractedSteps((prev) => [...new Set([...prev, 4])]);
    },
    [
      termsAccepted,
      privacyAccepted,
      setTermsAccepted,
      setPrivacyAccepted,
      setMarketingAccepted,
      updateValidationState,
      validationState,
      setInteractedSteps,
    ]
  );

  // Save validation state and completed steps when they change
  useEffect(() => {
    if (mounted && validationState._timestamp) {
      try {
        // Save validation state
        const stateToSave = {
          validationState,
          completedSteps,
          wizardAnswers,
          wizardSuccessStates: mainStore.wizardSuccessStates,
          isWizardSubmitted: validationState.isWizardSubmitted,
          isWizardValid: validationState.isWizardValid,
          wizardIsCompleted: mainStore.wizardIsCompleted,
          wizardSuccessMessage: mainStore.wizardSuccessMessage,
          timestamp: validationState._timestamp,
        };

        console.log('=== Saving State to LocalStorage ===', {
          stateToSave,
          timestamp: new Date().toISOString(),
        });

        localStorage.setItem(
          'initialAssessmentValidation',
          JSON.stringify(stateToSave)
        );
      } catch (error) {
        console.error('Error saving state to localStorage:', error);
      }
    }
  }, [
    mounted,
    validationState._timestamp,
    completedSteps,
    wizardAnswers,
    mainStore.wizardSuccessStates,
    mainStore.wizardIsCompleted,
    mainStore.wizardSuccessMessage,
  ]);

  // Initialize state
  useEffect(() => {
    // Set mounted state only once on component mount
    if (!mounted) {
      setMounted(true);

      // Check if this is the first visit - only do this once when mounting
      const hasVisited = localStorage.getItem('hasVisitedInitialAssessment');
      if (!hasVisited) {
        localStorage.setItem('hasVisitedInitialAssessment', 'true');
      } else {
        setIsFirstVisit(false);
      }
    }

    // Skip if already initialized
    if (isInitialized) {
      console.log('=== Initial Assessment - Already Initialized ===');
      return;
    }

    console.log('=== Initial Assessment - Initialization START ===', {
      wizardAnswers: mainStore.wizardAnswers,
      validationState: mainStore.validationState,
      completedSteps: mainStore.completedSteps,
    });

    try {
      // Set current phase
      mainStore.setCurrentPhase(1);

      // Only access localStorage in browser environment
      if (typeof window !== 'undefined') {
        // First try to restore validation state
        const savedValidationState = localStorage.getItem(
          'initialAssessmentValidation'
        );
        if (savedValidationState) {
          try {
            const parsedValidation = JSON.parse(savedValidationState);
            console.log('=== Found Saved Validation State ===', {
              parsedValidation,
              timestamp: new Date().toISOString(),
            });

            // Restore wizard state if it exists
            if (parsedValidation.wizardAnswers) {
              setWizardAnswers(parsedValidation.wizardAnswers);
              if (parsedValidation.isWizardSubmitted) {
                markWizardComplete('initial_assessment');
              }
            }

            // Restore wizard success states if they exist
            if (parsedValidation.wizardSuccessStates) {
              console.log('=== Restoring Wizard Success States ===', {
                states: parsedValidation.wizardSuccessStates,
                isWizardCompleted: parsedValidation.wizardIsCompleted,
                successMessage: parsedValidation.wizardSuccessMessage,
                timestamp: new Date().toISOString(),
              });

              batchUpdateWizardState({
                wizardSuccessStates: parsedValidation.wizardSuccessStates,
                wizardIsCompleted: parsedValidation.wizardIsCompleted || false,
                wizardSuccessMessage:
                  parsedValidation.wizardSuccessMessage || '',
                wizardIsValid: parsedValidation.isWizardValid || false,
                wizardShowingSuccess:
                  parsedValidation.wizardIsCompleted || false,
              });
            }

            if (parsedValidation.validationState?.isTermsValid) {
              // Restore terms acceptance state
              setTermsAccepted(true);
              setPrivacyAccepted(true);
            }

            // Update validation state
            updateValidationState({
              ...parsedValidation.validationState,
              _timestamp: Date.now(),
            });

            console.log('=== Initial Assessment - Restored State ===', {
              wizardAnswers: parsedValidation.wizardAnswers,
              wizardSuccessStates: parsedValidation.wizardSuccessStates,
              isWizardSubmitted: parsedValidation.isWizardSubmitted,
              isWizardValid: parsedValidation.isWizardValid,
              wizardIsCompleted: parsedValidation.wizardIsCompleted,
              wizardSuccessMessage: parsedValidation.wizardSuccessMessage,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Error parsing validation state:', error);
          }
        }

        // Then load other saved state
        const savedState = localStorage.getItem('phase1State');
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            console.log('=== Initial Assessment - Found Saved State ===', {
              selectedType: parsedState.selectedType,
              flightSegments: parsedState.flightSegments?.length,
              timestamp: new Date().toISOString(),
            });

            // Extract flight data
            const selectedFlights = parsedState.flightSegments
              ?.map((segment: any) => segment.selectedFlight)
              .filter(Boolean);

            if (selectedFlights?.length) {
              flightStore.setOriginalFlights(selectedFlights);
              flightStore.setSelectedFlights(selectedFlights);
            }

            // Update main store
            mainStore.setFlightSegments(parsedState.flightSegments || []);
          } catch (error) {
            console.error('Error parsing saved state:', error);
          }
        }

        // Load completed steps
        const savedCompletedSteps = localStorage.getItem(
          'initialAssessmentCompletedSteps'
        );
        if (savedCompletedSteps) {
          try {
            const completedSteps = JSON.parse(savedCompletedSteps);
            completedSteps.forEach((step: number) =>
              mainStore.completePhase(step)
            );
          } catch (error) {
            console.error('Error parsing completed steps:', error);
          }
        }
      }

      setIsInitialized(true);
      console.log('=== Initial Assessment - Initialization COMPLETE ===');
    } catch (error) {
      console.error('Error during initialization:', error);
    }
  }, [
    mainStore,
    flightStore,
    isInitialized,
    setTermsAccepted,
    setPrivacyAccepted,
    updateValidationState,
    batchUpdateWizardState,
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
    console.log('=== Rendering Step ===', {
      stepId: step.id,
      currentState: {
        selectedType: currentState.selectedType,
        fromLocation: currentState.fromLocation,
        toLocation: currentState.toLocation,
        directFlight: currentState.directFlight,
        flightSegments: currentState.flightSegments,
        mounted: mounted,
        isStepCompleted:
          validationState.stepValidation[step.id] &&
          validationState.stepInteraction[step.id],
      },
      timestamp: new Date().toISOString(),
    });

    const isStepCompleted =
      step.id === 2
        ? validationState.stepValidation[2] &&
          validationState.stepInteraction[2]
        : step.id === 3
          ? validationState.stepValidation[3] &&
            validationState.stepInteraction[3]
          : validationState.stepValidation[step.id] &&
            validationState.stepInteraction[step.id];

    const isCurrentStepValid =
      step.id === 2
        ? isQAWizardValid
        : step.id === 3
          ? validationState.isPersonalValid &&
            validationState.stepInteraction[3]
          : validationState.stepValidation[step.id];

    const summary = step.getSummary(currentState);
    console.log('=== Step Summary Generated ===', {
      stepId: step.id,
      summary,
      isStepCompleted,
      isCurrentStepValid,
      timestamp: new Date().toISOString(),
    });

    return (
      <AccordionCard
        key={step.id}
        title={step.title}
        subtitle={step.subtitle}
        stepId={step.id.toString()}
        isCompleted={isStepCompleted}
        hasInteracted={interactedSteps.includes(step.id)}
        isValid={isCurrentStepValid}
        summary={summary}
        shouldStayOpen={false}
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

  useEffect(() => {
    pushToDataLayer({ step_position: 1 });
  }, []);

  // Define steps configuration
  const createSteps = useCallback(() => {
    const allSteps = [
      {
        id: 1 as ValidationStateSteps,
        name: t.phases.initialAssessment.flightDetails,
        title: t.phases.initialAssessment.title,
        subtitle: t.phases.initialAssessment.description,
        component: ModularFlightSelector,
        props: {
          onSelect: handleFlightSelect,
          onInteract: () => {
            setInteractedSteps((prev) => [...new Set([...prev, 1])]);
          },
          showFlightSearch: true,
          showFlightDetails: true,
          currentPhase: 1 as number,
          stepNumber: 1 as ValidationStateSteps,
          setValidationState: (
            state:
              | Record<number, boolean>
              | ((prev: Record<number, boolean>) => Record<number, boolean>)
          ) => {
            if (typeof state === 'function') {
              const newState = state({} as Record<number, boolean>);
              updateValidationState({
                stepValidation: {
                  ...validationState.stepValidation,
                  1: newState[1] || false,
                },
                stepInteraction: {
                  ...validationState.stepInteraction,
                  1: true,
                },
                _timestamp: Date.now(),
              });
            } else {
              updateValidationState({
                stepValidation: {
                  ...validationState.stepValidation,
                  1: state[1] || false,
                },
                stepInteraction: {
                  ...validationState.stepInteraction,
                  1: true,
                },
                _timestamp: Date.now(),
              });
            }
          },
        },
        getSummary: (state: StoreStateValues) => {
          console.log('=== ModularFlightSelector - Getting Summary START ===', {
            selectedType: state.selectedType,
            directFlight: state.directFlight,
            flightSegments: state.flightSegments,
            fromLocation: state.fromLocation,
            toLocation: state.toLocation,
            timestamp: new Date().toISOString(),
          });

          const parseLocation = (
            loc: LocationData | string | null
          ): LocationData | null => {
            if (!loc) return null;
            if (typeof loc === 'string') {
              try {
                return JSON.parse(loc);
              } catch (e) {
                return null;
              }
            }
            return loc;
          };

          const getLocationLabel = (
            loc: LocationData | string | null
          ): string => {
            const parsedLoc = parseLocation(loc);
            if (!parsedLoc) return '';
            return parsedLoc.label || parsedLoc.value || '';
          };

          // For direct flights
          if (state.selectedType === 'direct') {
            console.log('=== Direct flight locations ===', {
              fromLocation: state.fromLocation,
              toLocation: state.toLocation,
              directFlight: state.directFlight,
              timestamp: new Date().toISOString(),
            });

            // Try to get locations from different sources
            let fromLocation = state.directFlight?.fromLocation;
            let toLocation = state.directFlight?.toLocation;

            // If not in directFlight, try parsing from state
            if (!fromLocation && state.fromLocation) {
              try {
                fromLocation =
                  typeof state.fromLocation === 'string'
                    ? JSON.parse(state.fromLocation)
                    : state.fromLocation;
              } catch (e) {
                console.error('Failed to parse fromLocation:', e);
              }
            }

            if (!toLocation && state.toLocation) {
              try {
                toLocation =
                  typeof state.toLocation === 'string'
                    ? JSON.parse(state.toLocation)
                    : state.toLocation;
              } catch (e) {
                console.error('Failed to parse toLocation:', e);
              }
            }

            console.log('=== Parsed locations ===', {
              fromLocation,
              toLocation,
              timestamp: new Date().toISOString(),
            });

            const fromLabel = fromLocation?.label || fromLocation?.value;
            const toLabel = toLocation?.label || toLocation?.value;

            if (!fromLabel || !toLabel) {
              console.log('=== Missing location labels ===', {
                fromLabel,
                toLabel,
                fromLocation,
                toLocation,
                timestamp: new Date().toISOString(),
              });
              return '';
            }

            const summary = t.phases.initialAssessment.summary.directFlight
              .replace('{from}', fromLabel)
              .replace('{to}', toLabel);

            console.log('=== Generated Summary ===', {
              summary,
              fromLabel,
              toLabel,
              timestamp: new Date().toISOString(),
            });
            return summary;
          }

          // For multi-segment flights
          if (state.selectedType === 'multi' && state.flightSegments) {
            console.log('=== Multi-segment flight segments ===', {
              segments: state.flightSegments,
              timestamp: new Date().toISOString(),
            });

            const segments = state.flightSegments.filter(
              (segment) => segment.fromLocation && segment.toLocation
            );

            if (segments.length === 0) {
              console.log('=== No valid segments found ===');
              return '';
            }

            const segmentSummaries = segments
              .map((segment) => {
                if (!segment.fromLocation || !segment.toLocation) return '';
                const fromLabel = getLocationLabel(segment.fromLocation);
                const toLabel = getLocationLabel(segment.toLocation);
                if (!fromLabel || !toLabel) return '';
                return `${fromLabel} → ${toLabel}`;
              })
              .filter(Boolean);

            if (segmentSummaries.length === 0) {
              console.log('=== No valid segment summaries generated ===');
              return '';
            }

            const summary = t.phases.initialAssessment.summary.multiSegment
              .replace('{count}', segments.length.toString())
              .replace('{s}', segments.length > 1 ? 'en' : '')
              .replace('{segments}', segmentSummaries.join(' | '));

            console.log('=== Generated Summary ===', {
              summary,
              timestamp: new Date().toISOString(),
            });
            return summary;
          }

          console.log('=== No valid flight configuration found ===');
          return '';
        },
        shouldStayOpen: true,
        isOpenByDefault: isFirstVisit,
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
        shouldStayOpen: true,
        isOpenByDefault: false,
      },
      {
        id: 3 as ValidationStateSteps,
        name: 'PersonalDetails',
        title: t.phases.initialAssessment.personalDetails.title,
        subtitle: t.phases.initialAssessment.personalDetails.subtitle,
        component: PersonalDetailsForm,
        props: {
          onComplete: handlePersonalDetailsComplete,
          onInteract: () => {
            setInteractedSteps((prev) => [...new Set([...prev, 3])]);
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
        shouldStayOpen: true,
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
                onChange={handleTermsChange('hasAcceptedTerms')}
                required={true}
              />
              <ConsentCheckbox
                id="privacy"
                type="privacy"
                label={t.phases.initialAssessment.termsAndConditions.privacy}
                checked={privacyAccepted}
                onChange={handleTermsChange('hasAcceptedPrivacy')}
                required={true}
              />
              <ConsentCheckbox
                id="marketing"
                type="marketing"
                label={t.phases.initialAssessment.termsAndConditions.marketing}
                checked={marketingAccepted}
                onChange={handleTermsChange('hasAcceptedMarketing')}
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
        shouldStayOpen: true,
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
    validationState,
    t,
    wizardQuestions,
  ]);

  // Define steps with memoization
  const steps = useMemo(() => createSteps(), [createSteps]);

  // Handle continue button click
  const handleContinue = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      // Get latest state
      const currentState = useStore.getState();
      console.log('=== DEBUG: handleContinue Current State ===', {
        fromLocation: currentState.fromLocation,
        toLocation: currentState.toLocation,
        directFlight: currentState.directFlight
          ? {
              fromLocation: currentState.directFlight.fromLocation,
              toLocation: currentState.directFlight.toLocation,
            }
          : null,
        selectedType: currentState.selectedType,
        timestamp: new Date().toISOString(),
      });

      // Parse location data from state first
      let fromLocation = null;
      let toLocation = null;

      try {
        // First try to get from directFlight
        if (
          currentState.directFlight?.fromLocation &&
          currentState.directFlight?.toLocation
        ) {
          fromLocation = currentState.directFlight.fromLocation;
          toLocation = currentState.directFlight.toLocation;
        }
        // Then try to parse from state strings
        else if (currentState.fromLocation && currentState.toLocation) {
          fromLocation =
            typeof currentState.fromLocation === 'string'
              ? JSON.parse(currentState.fromLocation)
              : currentState.fromLocation;
          toLocation =
            typeof currentState.toLocation === 'string'
              ? JSON.parse(currentState.toLocation)
              : currentState.toLocation;
        }

        console.log('=== DEBUG: Parsed Location Data ===', {
          fromLocation,
          toLocation,
          timestamp: new Date().toISOString(),
        });

        // Fallback to DOM data if needed
        if (!fromLocation || !toLocation) {
          const flightLocations = document.querySelector(
            '[data-flight-locations]'
          );
          const fromLocationStr =
            flightLocations?.getAttribute('data-from-location');
          const toLocationStr =
            flightLocations?.getAttribute('data-to-location');

          if (fromLocationStr) fromLocation = JSON.parse(fromLocationStr);
          if (toLocationStr) toLocation = JSON.parse(toLocationStr);

          console.log('=== DEBUG: DOM Location Data ===', {
            fromLocation,
            toLocation,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error('Failed to parse location data:', error);
        setIsLoading(false);
        return;
      }

      // Validate parsed data
      if (!fromLocation?.value || !toLocation?.value) {
        console.error('Invalid location data:', { fromLocation, toLocation });
        setIsLoading(false);
        return;
      }

      // Update the store with the validated location data
      useStore.setState({
        fromLocation: JSON.stringify(fromLocation),
        toLocation: JSON.stringify(toLocation),
        directFlight: {
          ...currentState.directFlight,
          fromLocation,
          toLocation,
        },
      });

      // Get the updated state
      const updatedState = useStore.getState();

      // Phase 2 validation
      const isValid =
        updatedState.selectedType === 'multi'
          ? updatedState.flightSegments.length >= 2 &&
            updatedState.flightSegments.every(
              (segment) => segment.fromLocation && segment.toLocation
            )
          : updatedState.selectedType === 'direct' &&
            fromLocation?.value &&
            toLocation?.value;

      if (!isValid) {
        console.error('Invalid flight data state during transition');
        setIsLoading(false);
        return;
      }

      // Prepare complete state data
      const completeStateData = {
        selectedType: updatedState.selectedType,
        flightSegments:
          updatedState.flightSegments?.map((segment) => ({
            fromLocation: segment.fromLocation,
            toLocation: segment.toLocation,
            date: segment.date,
            selectedFlight: segment.selectedFlight,
          })) || [],
        directFlight: {
          fromLocation,
          toLocation,
          date: updatedState.directFlight?.date,
          selectedFlight: updatedState.directFlight?.selectedFlight,
        },
        fromLocation: JSON.stringify(fromLocation),
        toLocation: JSON.stringify(toLocation),
        validationState: updatedState.validationState,
      };

      // Save state to localStorage
      try {
        localStorage.setItem(
          'flightSelectionState',
          JSON.stringify(completeStateData)
        );
        console.log('Successfully saved state to localStorage');
      } catch (error) {
        console.error('Failed to save state to localStorage:', error);
        setIsLoading(false);
        return;
      }

      // Proceed with phase transition
      setCurrentPhase(2);
      router.push('/phases/compensation-estimate');
    } catch (error) {
      console.error('Error during phase transition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = (step: Step) => {
    if (step.component === ModularFlightSelector) {
      const props = step.props as FlightSelectorProps;
      const currentState = useStore.getState();
      const fromLocationData =
        currentState.directFlight?.fromLocation || currentState.fromLocation;
      const toLocationData =
        currentState.directFlight?.toLocation || currentState.toLocation;

      return (
        <div
          data-flight-locations
          data-from-location={
            fromLocationData ? JSON.stringify(fromLocationData) : null
          }
          data-to-location={
            toLocationData ? JSON.stringify(toLocationData) : null
          }
        >
          <ModularFlightSelector
            onSelect={props.onSelect}
            onInteract={props.onInteract}
            showFlightSearch={props.showFlightSearch}
            showFlightDetails={props.showFlightDetails}
            currentPhase={props.currentPhase}
            stepNumber={props.stepNumber}
            setValidationState={props.setValidationState}
          />
        </div>
      );
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

  // Return null if not mounted (during SSR)
  if (!mounted) {
    return null;
  }

  return (
    <AccordionProvider initialActiveAccordion={initialAccordion}>
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
