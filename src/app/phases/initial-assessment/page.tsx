'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import type { RootState } from '@/store';
import { AccordionCard } from '@/components/shared/AccordionCard';
import {
  setWizardAnswers as setWizardAnswersAction,
  setPersonalDetails,
  setTermsAccepted,
  setPrivacyAccepted,
  setMarketingAccepted,
  setSelectedFlight,
  setFromLocation,
  setToLocation,
} from '@/store/slices/bookingSlice';
import {
  setCurrentPhase,
  completeStep,
  markStepIncomplete,
  completePhase,
} from '@/store/slices/progressSlice';
import type { Flight, Answer, PassengerDetails } from '@/types/store';
import { FlightSelector } from '@/components/booking/FlightSelector';
import { QAWizardWrapper } from '@/components/wizard/QAWizardWrapper';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import type { Question } from '@/types/experience';
import { accordionConfig } from '@/config/accordion';
import { useStepValidation } from '@/hooks/useStepValidation';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { usePhaseManagement } from '@/hooks/usePhaseManagement';
import {
  selectFromLocation,
  selectToLocation,
} from '@/store/selectors/locationSelectors';
import { useRouter } from 'next/navigation';
import { pushToDataLayer } from '@/utils/gtm';

// Extend the existing RootState type instead of redeclaring it
declare module '@/store' {
  interface BookingState {
    fromLocation: LocationData | null;
    toLocation: LocationData | null;
  }
}

interface StepProps {
  onSelect?: (flight: Flight | Flight[]) => void;
  onComplete?:
    | ((answers: Answer[]) => void)
    | ((details: PassengerDetails) => void);
  onInteract?: () => void;
  questions?: Question[];
  phase?: number;
  stepNumber?: number;
  showResults?: boolean;
  showFlightSearch?: boolean;
  showFlightDetails?: boolean;
  disabled?: boolean;
  selectedFlight?: Flight | null;
  currentPhase?: number;
}

interface Step {
  id: number;
  name: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<StepProps>;
  props: StepProps;
  getSummary: (state: RootState['booking']) => string;
  shouldStayOpen?: boolean;
  isOpenByDefault?: boolean;
}

interface LocationData {
  value: string;
  label: string;
  description?: string;
  city?: string;
  fromLocation?: {
    value: string;
    label: string;
    description?: string;
    city?: string;
  };
  toLocation?: {
    value: string;
    label: string;
    description?: string;
    city?: string;
  };
}

export default function InitialAssessmentPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [openSteps, setOpenSteps] = useState<number[]>([]);
  const { completedPhases } = usePhaseManagement();
  const bookingState = useAppSelector((state: RootState) => state.booking);
  const fromLocation = useAppSelector(selectFromLocation);
  const toLocation = useAppSelector(selectToLocation);
  const {
    wizardAnswers = [],
    termsAccepted = false,
    privacyAccepted = false,
    marketingAccepted = false,
    selectedFlight = null,
    personalDetails = null,
  } = bookingState;

  const bookingStateForStorage = useMemo(
    () => ({
      ...bookingState,
    }),
    [bookingState]
  );

  const { validationRules, isStepCompleted } = useStepValidation();

  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);

  // Track current validation state to prevent unnecessary updates
  const validationStateRef = useRef({
    isFlightValid: false,
    isWizardValid: false,
    isPersonalValid: false,
    isTermsValid: false,
  });

  // Add new effect to watch for step 2 completion
  useEffect(() => {
    if (isStepCompleted(2)) {
      setOpenSteps((prev) => {
        const newSteps = [...new Set([...prev, 2, 3])];
        return newSteps;
      });
      setCurrentStep(3);
    }
  }, [isStepCompleted]);

  // Add new effect to watch for step 3 completion
  useEffect(() => {
    if (isStepCompleted(3)) {
      console.log('Step 3 completed, opening step 4');
      setOpenSteps((prev) => {
        const newSteps = [...new Set([...prev, 4])];
        console.log('New open steps:', newSteps);
        return newSteps;
      });
      setCurrentStep(4);
    }
  }, [isStepCompleted]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleComplete = useCallback(
    (answers: Answer[]) => {
      console.log('QAWizard onComplete called with:', answers);

      // Always save answers to both Redux and localStorage, even if empty
      dispatch(setWizardAnswersAction(answers));
      localStorage.setItem('wizardAnswers', JSON.stringify(answers));

      // Check if answers are valid for step completion
      const activeQuestions = wizardQuestions.filter(
        (q) => !q.showIf || q.showIf(answers)
      );

      const allQuestionsAnswered = activeQuestions.every((q) =>
        answers.some((a) => {
          if (a.questionId === q.id && a.value) {
            if (a.value.startsWith('€')) {
              const amount = parseFloat(a.value.slice(1));
              return !isNaN(amount) && amount > 0;
            }
            return true;
          }
          return false;
        })
      );

      // Only mark as complete if all questions are answered AND the user clicked Complete
      if (allQuestionsAnswered && answers.length === activeQuestions.length) {
        // Mark step 2 as complete first
        dispatch(completeStep(2));

        // Save completed steps
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        if (!existingSteps.includes(2)) {
          existingSteps.push(2);
          existingSteps.sort((a: number, b: number) => a - b);
          localStorage.setItem('completedSteps', JSON.stringify(existingSteps));
        }

        // Wait for completion message to show, then open step 3
        setTimeout(() => {
          setOpenSteps((prev) => {
            // Keep step 2 open and add step 3
            const newSteps = [...prev];
            if (!newSteps.includes(2)) newSteps.push(2);
            if (!newSteps.includes(3)) newSteps.push(3);
            return newSteps;
          });
          setCurrentStep(3);
        }, 100); // Small delay to ensure completion message shows first
      } else {
        dispatch(markStepIncomplete(2));
        // Remove step 2 from completed steps
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        const updatedSteps = existingSteps.filter((step: number) => step !== 2);
        localStorage.setItem('completedSteps', JSON.stringify(updatedSteps));
      }

      // Save entire booking state
      const updatedBookingState = {
        ...bookingStateForStorage,
        wizardAnswers: answers,
      };
      localStorage.setItem('bookingState', JSON.stringify(updatedBookingState));

      // Log the saved state for debugging
      console.log('=== Saved QA State ===', {
        answers,
        bookingState: updatedBookingState,
        localStorage: {
          wizardAnswers: localStorage.getItem('wizardAnswers'),
          bookingState: localStorage.getItem('bookingState'),
          completedSteps: localStorage.getItem('completedSteps'),
        },
      });
    },
    [dispatch, bookingStateForStorage, setOpenSteps, setCurrentStep]
  );

  // Effect to handle step completion status updates
  useEffect(() => {
    if (!mounted) return;

    // Check and update personal details step completion
    if (personalDetails) {
      const hasValidEmail =
        personalDetails.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(personalDetails.email);

      const isComplete = !!(
        personalDetails.firstName?.trim() &&
        personalDetails.lastName?.trim() &&
        hasValidEmail &&
        personalDetails.salutation?.trim()
      );

      if (isComplete) {
        dispatch(completeStep(3));
      } else {
        dispatch(markStepIncomplete(3));
      }
    }

    // Remove automatic wizard step completion from here
    // The step should only complete when handleComplete is called
  }, [mounted, personalDetails, dispatch]);

  // Define steps configuration
  const createSteps = useCallback((): Step[] => {
    const allSteps = [
      {
        id: 1,
        name: 'FlightSelection',
        title: 'Tell us about your flight',
        component: FlightSelector as unknown as React.ComponentType<StepProps>,
        props: {
          onSelect: (flight: Flight | Flight[]) => {
            console.log('Flight selection handler called with:', flight);

            if (!flight) {
              console.log('No flight data provided');
              dispatch(markStepIncomplete(1));
              return;
            }

            const flightData = Array.isArray(flight) ? flight[0] : flight;

            // Create location data from flight
            const fromLocationData = {
              value: flightData.departure || '',
              label: flightData.departureCity || '',
              description: flightData.departureCity || '',
              city: flightData.departureCity || '',
            };

            const toLocationData = {
              value: flightData.arrival || '',
              label: flightData.arrivalCity || '',
              description: flightData.arrivalCity || '',
              city: flightData.arrivalCity || '',
            };

            // Save flight data with proper date handling
            const flightToSave = Array.isArray(flight)
              ? {
                  ...flight[0],
                  date: flight[0].date
                    ? new Date(flight[0].date).toISOString()
                    : new Date().toISOString(),
                  price: flight[0].price || 0,
                }
              : {
                  ...flightData,
                  date: flightData.date
                    ? new Date(flightData.date).toISOString()
                    : new Date().toISOString(),
                  price: flightData.price || 0,
                };

            localStorage.setItem(
              'selectedFlights',
              JSON.stringify([flightToSave])
            );
            dispatch(setSelectedFlight(flightToSave));

            // Save locations
            dispatch(setFromLocation(JSON.stringify(fromLocationData)));
            dispatch(setToLocation(JSON.stringify(toLocationData)));
            setInteractedSteps((prev) => [...new Set([...prev, 1])]);

            // Mark step as complete if we have valid locations
            if (
              fromLocationData.value &&
              toLocationData.value &&
              fromLocationData.value !== toLocationData.value
            ) {
              dispatch(completeStep(1));
            } else {
              dispatch(markStepIncomplete(1));
            }
          },
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 1])]),
          showFlightSearch: !selectedFlight,
          showResults: !selectedFlight,
          showFlightDetails: !selectedFlight,
          selectedFlight,
          currentPhase: 1,
        },
        getSummary: (state: RootState['booking']) => {
          const from = state.fromLocation;
          const to = state.toLocation;

          if (!from || !to) return '';

          try {
            let fromLabel, toLabel;

            if (typeof from === 'string') {
              const parsedFrom = JSON.parse(from);
              fromLabel = parsedFrom.label || parsedFrom.name || '';
            } else if (from && typeof from === 'object') {
              const locationFrom = from as { label?: string; name?: string };
              fromLabel = locationFrom.label || locationFrom.name || '';
            }

            if (typeof to === 'string') {
              const parsedTo = JSON.parse(to);
              toLabel = parsedTo.label || parsedTo.name || '';
            } else if (to && typeof to === 'object') {
              const locationTo = to as { label?: string; name?: string };
              toLabel = locationTo.label || locationTo.name || '';
            }

            if (!fromLabel || !toLabel) return '';
            return `${fromLabel} → ${toLabel}`;
          } catch (error) {
            console.error('Error parsing location data:', error);
            return '';
          }
        },
        shouldStayOpen: false,
        isOpenByDefault: true,
      },
      {
        id: 2,
        name: 'QAWizard',
        title: 'What happened with your flight?',
        component: QAWizardWrapper as React.ComponentType<StepProps>,
        props: {
          questions: wizardQuestions,
          onComplete: handleComplete,
          onInteract: () => {
            console.log('QAWizard onInteract called');
            setInteractedSteps((prev) => [...new Set([...prev, 2])]);
          },
          phase: 1,
          stepNumber: 2,
          selectedFlight: selectedFlight,
        },
        getSummary: (state: RootState['booking']) => {
          if (!state.wizardAnswers?.length) return '';

          const activeQuestions = wizardQuestions.filter(
            (q) => !q.showIf || q.showIf(state.wizardAnswers)
          );

          const answeredCount = activeQuestions.filter((q) =>
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
        id: 3,
        name: 'PersonalDetails',
        title: 'Personal Details',
        subtitle:
          'Please provide your contact details so we can keep you updated about your claim.',
        component:
          PersonalDetailsForm as unknown as React.ComponentType<StepProps>,
        props: {
          onComplete: (details: PassengerDetails | null) => {
            if (!details) {
              dispatch(markStepIncomplete(3));
              return;
            }

            const hasValidEmail =
              details.email &&
              /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(details.email);

            const isComplete = !!(
              details.firstName?.trim() &&
              details.lastName?.trim() &&
              hasValidEmail &&
              details.salutation?.trim()
            );

            if (isComplete) {
              dispatch(setPersonalDetails(details));
              dispatch(completeStep(3));
            } else {
              dispatch(setPersonalDetails(details));
              dispatch(markStepIncomplete(3));
            }
          },
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 3])]),
        },
        getSummary: (state: RootState['booking']) => {
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
        id: 4,
        name: 'TermsAndConditions',
        title: 'Terms and Conditions',
        subtitle: 'Please review and accept the terms to proceed.',
        component: function TermsAndConditions() {
          return (
            <div className="space-y-4">
              <ConsentCheckbox
                id="terms"
                label="I have read and agree to the terms and conditions."
                checked={termsAccepted}
                onChange={(checked) => {
                  dispatch(setTermsAccepted(checked));
                  // Save to localStorage
                  const newConsent = {
                    terms: checked,
                    privacy: privacyAccepted,
                    marketing: marketingAccepted,
                  };
                  localStorage.setItem(
                    'userConsent',
                    JSON.stringify(newConsent)
                  );

                  // Update step 4 completion
                  if (checked && privacyAccepted) {
                    dispatch(completeStep(4));
                    // Ensure step 4 is saved in localStorage
                    const existingSteps = JSON.parse(
                      localStorage.getItem('completedSteps') || '[]'
                    );
                    if (!existingSteps.includes(4)) {
                      existingSteps.push(4);
                      existingSteps.sort((a: number, b: number) => a - b);
                      localStorage.setItem(
                        'completedSteps',
                        JSON.stringify(existingSteps)
                      );
                    }
                  } else {
                    dispatch(markStepIncomplete(4));
                    // Remove step 4 from localStorage
                    const existingSteps = JSON.parse(
                      localStorage.getItem('completedSteps') || '[]'
                    );
                    const updatedSteps = existingSteps.filter(
                      (step: number) => step !== 4
                    );
                    localStorage.setItem(
                      'completedSteps',
                      JSON.stringify(updatedSteps)
                    );
                  }
                }}
                required={true}
                error={showErrors && !termsAccepted}
              />
              <ConsentCheckbox
                id="privacy"
                label="I have read and agree to the privacy policy."
                checked={privacyAccepted}
                onChange={(checked) => {
                  dispatch(setPrivacyAccepted(checked));
                  // Save to localStorage
                  const newConsent = {
                    terms: termsAccepted,
                    privacy: checked,
                    marketing: marketingAccepted,
                  };
                  localStorage.setItem(
                    'userConsent',
                    JSON.stringify(newConsent)
                  );

                  // Update step 4 completion
                  if (termsAccepted && checked) {
                    dispatch(completeStep(4));
                    // Ensure step 4 is saved in localStorage
                    const existingSteps = JSON.parse(
                      localStorage.getItem('completedSteps') || '[]'
                    );
                    if (!existingSteps.includes(4)) {
                      existingSteps.push(4);
                      existingSteps.sort((a: number, b: number) => a - b);
                      localStorage.setItem(
                        'completedSteps',
                        JSON.stringify(existingSteps)
                      );
                    }
                  } else {
                    dispatch(markStepIncomplete(4));
                    // Remove step 4 from localStorage
                    const existingSteps = JSON.parse(
                      localStorage.getItem('completedSteps') || '[]'
                    );
                    const updatedSteps = existingSteps.filter(
                      (step: number) => step !== 4
                    );
                    localStorage.setItem(
                      'completedSteps',
                      JSON.stringify(updatedSteps)
                    );
                  }
                }}
                required={true}
                error={showErrors && !privacyAccepted}
              />
              <ConsentCheckbox
                id="marketing"
                label="I agree that Captain Frank may send me advertising about Captain Frank's services, promotions and satisfaction surveys by email. Captain Frank will process my personal data for this purpose (see privacy policy). I can revoke this consent at any time."
                checked={marketingAccepted}
                onChange={(checked) => {
                  dispatch(setMarketingAccepted(checked));
                  // Save to localStorage
                  const newConsent = {
                    terms: termsAccepted,
                    privacy: privacyAccepted,
                    marketing: checked,
                  };
                  localStorage.setItem(
                    'userConsent',
                    JSON.stringify(newConsent)
                  );
                }}
                details="Stay updated with our latest services and travel tips. You can unsubscribe at any time."
              />
            </div>
          );
        } as unknown as React.ComponentType<StepProps>,
        props: {
          onInteract: () =>
            setInteractedSteps((prev) => [...new Set([...prev, 4])]),
        },
        getSummary: (state: RootState['booking']) => {
          if (!state.termsAccepted || !state.privacyAccepted) return '';
          return 'Terms and Privacy Policy accepted';
        },
        shouldStayOpen: false,
        isOpenByDefault: false,
      },
    ];

    return allSteps;
  }, [
    dispatch,
    selectedFlight,
    handleComplete,
    setInteractedSteps,
    marketingAccepted,
    privacyAccepted,
    showErrors,
    termsAccepted,
  ]);

  // Define steps with memoization
  const steps = useMemo(() => createSteps(), [createSteps]);

  // Track current validation state to prevent unnecessary updates
  useEffect(() => {
    // Skip during initialization
    if (!mounted) return;

    // Get current validation state
    const newValidationState = {
      isFlightValid: isStepCompleted(1),
      isWizardValid: isStepCompleted(2),
      isPersonalValid: isStepCompleted(3),
      isTermsValid: isStepCompleted(4),
    };

    // Only update if validation state has changed
    if (
      JSON.stringify(validationStateRef.current) !==
      JSON.stringify(newValidationState)
    ) {
      console.log('\n=== Validation State Update ===');
      console.log('Current:', validationStateRef.current);
      console.log('New:', newValidationState);
      console.log('=== End Update ===\n');

      validationStateRef.current = newValidationState;

      // Log overall state
      console.log('\n=== Initial Assessment Step State ===');
      console.log('Completed Steps:', completedPhases);
      console.log('Current Step:', currentStep);
      console.log('Booking State:', bookingState);
      console.log('Validation State:', newValidationState);
      console.log('=== End Initial Assessment Step State ===\n');
    }
  }, [isStepCompleted, bookingState, completedPhases, currentStep, mounted]);

  // Initialize component
  useEffect(() => {
    if (mounted) return;

    const initializeState = async () => {
      try {
        // Set current phase to 1 (Initial Assessment)
        dispatch(setCurrentPhase(1));
        localStorage.setItem('currentPhase', '1');

        // Restore saved state in order of priority: bookingState > individual states
        const savedBookingState = localStorage.getItem('bookingState');
        const savedWizardAnswers = localStorage.getItem('wizardAnswers');
        const savedPersonalDetails = localStorage.getItem('personalDetails');
        const savedConsent = localStorage.getItem('userConsent');
        const savedCompletedSteps = localStorage.getItem('completedSteps');

        // First try to restore from bookingState
        if (savedBookingState) {
          try {
            const parsedBookingState = JSON.parse(savedBookingState);
            console.log('Restoring from bookingState:', parsedBookingState);

            if (parsedBookingState.wizardAnswers) {
              dispatch(
                setWizardAnswersAction(parsedBookingState.wizardAnswers)
              );
              // Remove automatic step completion during initialization
            }

            if (parsedBookingState.personalDetails) {
              dispatch(setPersonalDetails(parsedBookingState.personalDetails));
            }
            if (parsedBookingState.selectedFlight) {
              dispatch(setSelectedFlight(parsedBookingState.selectedFlight));
            }
            if (parsedBookingState.fromLocation) {
              dispatch(setFromLocation(parsedBookingState.fromLocation));
            }
            if (parsedBookingState.toLocation) {
              dispatch(setToLocation(parsedBookingState.toLocation));
            }
            if (parsedBookingState.termsAccepted) {
              dispatch(setTermsAccepted(parsedBookingState.termsAccepted));
            }
            if (parsedBookingState.privacyAccepted) {
              dispatch(setPrivacyAccepted(parsedBookingState.privacyAccepted));
            }
            if (parsedBookingState.marketingAccepted) {
              dispatch(
                setMarketingAccepted(parsedBookingState.marketingAccepted)
              );
            }
          } catch (error) {
            console.error('Error parsing bookingState:', error);
          }
        }

        // Then try to restore from individual states if not already restored
        if (savedWizardAnswers) {
          try {
            const parsedBookingState = savedBookingState
              ? JSON.parse(savedBookingState)
              : null;
            if (!parsedBookingState?.wizardAnswers) {
              const answers = JSON.parse(savedWizardAnswers);
              console.log('Restoring from individual wizardAnswers:', answers);
              dispatch(setWizardAnswersAction(answers));
              // Remove automatic step completion during initialization
            }
          } catch (error) {
            console.error('Failed to parse wizardAnswers:', error);
          }
        }

        if (savedPersonalDetails) {
          try {
            const parsedBookingState = savedBookingState
              ? JSON.parse(savedBookingState)
              : null;
            if (!parsedBookingState?.personalDetails) {
              const details = JSON.parse(savedPersonalDetails);
              if (
                details?.firstName?.trim() &&
                details?.lastName?.trim() &&
                details?.email?.trim()
              ) {
                dispatch(setPersonalDetails(details));
                dispatch(completeStep(3));
              }
            }
          } catch (error) {
            console.error('Error parsing personalDetails:', error);
          }
        }

        if (savedConsent) {
          try {
            const parsedBookingState = savedBookingState
              ? JSON.parse(savedBookingState)
              : null;
            if (!parsedBookingState?.termsAccepted) {
              const { terms, privacy, marketing } = JSON.parse(savedConsent);
              dispatch(setTermsAccepted(!!terms));
              dispatch(setPrivacyAccepted(!!privacy));
              dispatch(setMarketingAccepted(!!marketing));

              // If terms and privacy are accepted, mark step 4 as complete
              if (terms && privacy) {
                dispatch(completeStep(4));
              }
            }
          } catch (error) {
            console.error('Error parsing consent:', error);
          }
        }

        if (savedCompletedSteps) {
          try {
            const completedSteps = JSON.parse(savedCompletedSteps);
            completedSteps.forEach((step: number) => {
              dispatch(completeStep(step));
            });
          } catch (error) {
            console.error('Error parsing completedSteps:', error);
          }
        }

        // Log the restored state
        console.log('=== Restored Initial Assessment State ===', {
          bookingState: savedBookingState
            ? JSON.parse(savedBookingState)
            : null,
          wizardAnswers: savedWizardAnswers
            ? JSON.parse(savedWizardAnswers)
            : null,
          personalDetails: savedPersonalDetails
            ? JSON.parse(savedPersonalDetails)
            : null,
          consent: savedConsent ? JSON.parse(savedConsent) : null,
          completedSteps: savedCompletedSteps
            ? JSON.parse(savedCompletedSteps)
            : null,
        });

        setMounted(true);
      } catch (error) {
        console.error('Failed to initialize state:', error);
      }
    };

    initializeState();
  }, [dispatch, mounted]);

  // Update the useEffect for consent state changes
  useEffect(() => {
    // Skip during initialization
    if (!mounted) return;

    console.log('=== Consent State Changed ===');
    console.log('Current consent state:', {
      terms: termsAccepted,
      privacy: privacyAccepted,
      marketing: marketingAccepted,
    });

    try {
      const consentState = {
        terms: termsAccepted,
        privacy: privacyAccepted,
        marketing: marketingAccepted,
      };
      localStorage.setItem('userConsent', JSON.stringify(consentState));
      console.log('Saved consent state to localStorage');

      // Update step completion based on terms acceptance
      console.log('Validating step 4:', {
        terms: termsAccepted,
        privacy: privacyAccepted,
        isValid: termsAccepted && privacyAccepted,
      });

      if (termsAccepted && privacyAccepted) {
        dispatch(completeStep(4));
        // Ensure step 4 is saved in localStorage
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        if (!existingSteps.includes(4)) {
          existingSteps.push(4);
          existingSteps.sort((a: number, b: number) => a - b);
          localStorage.setItem('completedSteps', JSON.stringify(existingSteps));
        }
      } else {
        dispatch(markStepIncomplete(4));
        // Remove step 4 from localStorage
        const existingSteps = JSON.parse(
          localStorage.getItem('completedSteps') || '[]'
        );
        const updatedSteps = existingSteps.filter((step: number) => step !== 4);
        localStorage.setItem('completedSteps', JSON.stringify(updatedSteps));
      }

      // Save entire booking state
      localStorage.setItem(
        'bookingState',
        JSON.stringify(bookingStateForStorage)
      );
    } catch (error) {
      console.error('Failed to save consent states:', error);
    }
    console.log('=== Consent Update Complete ===');
  }, [
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    dispatch,
    mounted,
    bookingStateForStorage,
  ]);

  // Memoized continue button state
  const canContinue = useMemo(() => {
    // Check each step's validation
    const isStep1Valid = Boolean(
      fromLocation &&
        toLocation &&
        validationRules.locations(fromLocation, toLocation) &&
        isStepCompleted(1)
    );

    const isStep2Valid = Boolean(
      wizardAnswers?.length > 0 &&
        validationRules.wizardAnswers(wizardAnswers) &&
        isStepCompleted(2)
    );

    const isStep3Valid = Boolean(
      personalDetails &&
        validationRules.personalDetails(personalDetails) &&
        isStepCompleted(3)
    );

    const isStep4Valid = Boolean(
      termsAccepted &&
        privacyAccepted &&
        validationRules.terms(termsAccepted) &&
        validationRules.privacy(privacyAccepted) &&
        isStepCompleted(4)
    );

    // Detailed validation logging
    console.log('=== Continue Button Validation ===', {
      step1: {
        isValid: isStep1Valid,
        fromLocation,
        toLocation,
        locationValidation: validationRules.locations(fromLocation, toLocation),
        isCompleted: isStepCompleted(1),
      },
      step2: {
        isValid: isStep2Valid,
        answersLength: wizardAnswers?.length,
        answersValidation: validationRules.wizardAnswers(wizardAnswers),
        isCompleted: isStepCompleted(2),
      },
      step3: {
        isValid: isStep3Valid,
        hasPersonalDetails: !!personalDetails,
        detailsValidation: validationRules.personalDetails(personalDetails),
        isCompleted: isStepCompleted(3),
      },
      step4: {
        isValid: isStep4Valid,
        terms: termsAccepted,
        privacy: privacyAccepted,
        termsValidation: validationRules.terms(termsAccepted),
        privacyValidation: validationRules.privacy(privacyAccepted),
        isCompleted: isStepCompleted(4),
      },
    });

    const canProceed =
      isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid;
    console.log('Can proceed:', canProceed);
    return canProceed;
  }, [
    fromLocation,
    toLocation,
    wizardAnswers,
    personalDetails,
    termsAccepted,
    privacyAccepted,
    validationRules,
    isStepCompleted,
  ]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleContinue = useCallback(async () => {
    if (!canContinue) {
      setShowErrors(true);
      return;
    }

    try {
      setIsLoading(true);

      // Save current state before proceeding
      const currentState = {
        wizardAnswers,
        personalDetails,
        selectedFlight,
        termsAccepted,
        privacyAccepted,
        marketingAccepted,
        fromLocation,
        toLocation,
      };

      // Save to localStorage
      localStorage.setItem('bookingState', JSON.stringify(currentState));

      // Complete current phase and set up next phase
      dispatch(completePhase(1));
      dispatch(setCurrentPhase(2));

      // Get existing completed phases and add phase 1
      const existingCompletedPhases = JSON.parse(
        localStorage.getItem('completedPhases') || '[]'
      );
      const updatedCompletedPhases = [
        ...new Set([...existingCompletedPhases, 1]),
      ];

      // Save states to localStorage
      localStorage.setItem('currentPhase', '2');
      localStorage.setItem(
        'completedPhases',
        JSON.stringify(updatedCompletedPhases)
      );

      // Navigate to next phase
      await router.push('/phases/compensation-estimate');
    } catch (error) {
      console.error('Failed to proceed to next phase:', error);
      setShowErrors(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    canContinue,
    wizardAnswers,
    personalDetails,
    selectedFlight,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    router,
    dispatch,
    fromLocation,
    toLocation,
  ]);

  useEffect(() => {
    // Try to load saved answers from localStorage
    try {
      const savedAnswers = localStorage.getItem('wizardAnswers');
      if (savedAnswers) {
        const parsed = JSON.parse(savedAnswers);
        dispatch(setWizardAnswersAction(parsed));
      }
    } catch (error) {
      console.error('Failed to load saved answers:', error);
    }
  }, [dispatch]);

  // Initialize openSteps with steps that should be open by default
  useEffect(() => {
    const completedStepIds = steps
      .filter((step) => isStepCompleted(step.id))
      .map((step) => step.id);

    // Find the first incomplete step
    const nextIncompleteStep = steps.find(
      (step) => !isStepCompleted(step.id)
    )?.id;

    // Keep completed steps open and open the next incomplete step
    const initialOpenSteps = steps
      .filter((step) => {
        // Keep completed steps open
        if (isStepCompleted(step.id)) return true;

        // Always open step 1 if it's not completed
        if (step.id === 1 && !isStepCompleted(step.id)) return true;

        // Open step 3 if step 2 is completed
        if (step.id === 3 && isStepCompleted(2)) return true;

        // Open step 4 if step 3 is completed
        if (step.id === 4 && isStepCompleted(3)) {
          console.log('Opening step 4 because step 3 is completed');
          return true;
        }

        // Open the current step if it's the next incomplete one and the previous step is completed
        if (step.id === nextIncompleteStep) {
          const previousStep = step.id - 1;
          return previousStep === 0 || isStepCompleted(previousStep);
        }

        return false;
      })
      .map((step) => step.id);

    console.log('Setting open steps:', {
      completedStepIds,
      nextIncompleteStep,
      initialOpenSteps,
      step3Completed: isStepCompleted(3),
      step4ShouldOpen: isStepCompleted(3),
    });

    setOpenSteps(initialOpenSteps);
  }, [currentStep, isStepCompleted, steps]);

  // Add logging to step rendering
  const renderStep = (step: Step) => {
    const isCompleted = isStepCompleted(step.id);
    const hasInteracted = interactedSteps.includes(step.id);
    const summary = step.getSummary(bookingState);
    const isOpen = openSteps.includes(step.id);

    // Add logging to track step state
    console.log('\n=== Step Render State ===', {
      stepId: step.id,
      name: step.name,
      isCompleted,
      hasInteracted,
      summary,
      isOpen,
      currentStep,
      shouldStayOpen: step.shouldStayOpen,
      isOpenByDefault: step.isOpenByDefault,
      openSteps,
    });

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

            // Only update currentStep if we're opening
            if (!isCurrentlyOpen) {
              setCurrentStep(step.id);
              // Open immediately
              setOpenSteps((prev) => [...prev, step.id]);
            } else if (!step.shouldStayOpen) {
              // Close immediately
              setOpenSteps((prev) => prev.filter((id) => id !== step.id));
            }
          }}
        >
          <div className={accordionConfig.padding.content}>
            <step.component {...step.props} />
          </div>
        </AccordionCard>
      </div>
    );
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Save booking state to localStorage
    localStorage.setItem(
      'bookingState',
      JSON.stringify(bookingStateForStorage)
    );
  }, [bookingStateForStorage]);

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
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble message="Hi, I'm Captain Frank. I'll help you check if you're entitled to compensation for your flight disruption. Let's get started!" />
          </div>

          <div className="space-y-6">
            {steps.map(renderStep)}

            {/* Continue Button */}
            <div className="mt-8 flex justify-end">
              <ContinueButton
                onClick={handleContinue}
                disabled={!canContinue}
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
