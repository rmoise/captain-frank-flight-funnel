'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type { RootState } from '@/store';
import {
  setStep,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
  completeStep,
  markStepIncomplete,
} from '@/store/bookingSlice';
import type { BookingState } from '@/types/store';
import type { Flight, PassengerDetails } from '@/types';
import FlightSelector from '@/components/booking/FlightSelector';
import { QAWizard } from '@/components/wizard/QAWizard';
import { useSteps } from '@/context/StepsContext';
import { ProgressTracker } from '@/components/booking/ProgressTracker';
import { wizardQuestions } from '@/constants/wizardQuestions';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { SpeechBubble } from '@/components/SpeechBubble';
import type { Answer } from '@/types/wizard';
import type { Question } from '@/types/experience';

interface StepProps {
  onSelect?: (flight: Flight | Flight[]) => void;
  onComplete?:
    | ((answers: Answer[]) => void)
    | ((details: PassengerDetails) => void);
  onInteract?: () => void;
  questions?: Question[];
}

interface Step {
  id: number;
  name: string;
  title: string;
  subtitle?: string;
  component: React.ComponentType<StepProps>;
  props: StepProps;
  getSummary: (state: BookingState) => string;
  shouldStayOpen?: boolean;
  isOpenByDefault?: boolean;
}

// Define steps configuration outside component to prevent unnecessary re-renders
const createSteps = (
  dispatch: any,
  handleStepInteraction: (stepId: number) => void,
  pathname: string
) => [
  {
    id: 1,
    name: 'FlightSelector',
    title: 'Tell us about your flight',
    component: FlightSelector as React.ComponentType<StepProps>,
    props: {
      onSelect: (flight: Flight | Flight[]) => {
        dispatch(setSelectedFlight(Array.isArray(flight) ? flight[0] : flight));
        dispatch(completeStep(1));
        setTimeout(() => {
          dispatch(setStep(2));
          const nextStep = document.querySelector('[data-step="2"]');
          if (nextStep) {
            const windowHeight = window.innerHeight;
            const cardHeight = nextStep.getBoundingClientRect().height;
            const scrollPosition =
              nextStep.getBoundingClientRect().top +
              window.pageYOffset -
              (windowHeight - cardHeight) / 2;

            window.scrollTo({
              top: Math.max(0, scrollPosition),
              behavior: 'smooth',
            });
          }
        }, 500);
      },
      onInteract: () => handleStepInteraction(1),
    },
    getSummary: (state: BookingState) =>
      state.selectedFlight
        ? `${state.selectedFlight.flightNumber} • ${state.selectedFlight.departureCity} → ${state.selectedFlight.arrivalCity}`
        : '',
  },
  {
    id: 2,
    name: 'QAWizard',
    title: 'What happened with your flight?',
    component: QAWizard as React.ComponentType<StepProps>,
    props: {
      questions: wizardQuestions,
      onComplete: (answers: Answer[]) => {
        dispatch(setWizardAnswers(answers));
        if (answers.length > 0) {
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
          if (allQuestionsAnswered) {
            dispatch(completeStep(2));
            // Let the accordion close animation finish before moving to next step
            setTimeout(() => {
              dispatch(setStep(3));
            }, 1000);
          } else {
            dispatch(markStepIncomplete(2));
          }
        } else {
          dispatch(markStepIncomplete(2));
        }
      },
      onInteract: () => handleStepInteraction(2),
    },
    getSummary: (state: BookingState) => {
      if (!state.wizardAnswers?.length) return '';

      // Get active questions based on current answers
      const activeQuestions = wizardQuestions.filter(
        (q) => !q.showIf || q.showIf(state.wizardAnswers)
      );

      // Count answers that match active questions
      const answeredCount = activeQuestions.filter((q) =>
        state.wizardAnswers.some((a) => a.questionId === q.id && a.value)
      ).length;

      return answeredCount ? `${answeredCount} questions answered` : '';
    },
    shouldStayOpen: false,
  },
  {
    id: 3,
    name: 'PersonalDetails',
    title: 'Personal Details',
    subtitle:
      'Please provide your contact details so we can keep you updated about your claim.',
    component: PersonalDetailsForm as unknown as React.ComponentType<StepProps>,
    props: {
      onComplete: (details: PassengerDetails | null) => {
        dispatch(setPersonalDetails(details || null));

        if (details) {
          const isComplete = !!(
            details.firstName?.trim() &&
            details.lastName?.trim() &&
            details.email?.trim() &&
            /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(details.email)
          );

          if (isComplete) {
            dispatch(completeStep(3));
          } else {
            dispatch(markStepIncomplete(3));
          }
        } else {
          dispatch(markStepIncomplete(3));
        }
      },
      onInteract: () => handleStepInteraction(3),
    },
    getSummary: (state: BookingState) =>
      state.personalDetails
        ? `${state.personalDetails.firstName} ${
            state.personalDetails.lastName
          }${
            state.personalDetails.email
              ? ` • ${state.personalDetails.email}`
              : ''
          }`
        : '',
    shouldStayOpen: true,
    isOpenByDefault: true,
  },
];

export default function InitialAssessmentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const bookingState = useAppSelector((state: RootState) => state.booking);
  const {
    currentStep,
    selectedFlight,
    wizardAnswers,
    completedSteps,
    personalDetails,
  } = bookingState;
  const [interactedSteps, setInteractedSteps] = useState<number[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingAccepted, setMarketingAccepted] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const handleStepInteraction = useCallback((stepId: number) => {
    setInteractedSteps((prev) => {
      if (prev.includes(stepId)) return prev;
      return [...prev, stepId];
    });
  }, []);

  // Create steps with memoized callbacks
  const STEPS = useMemo(
    () => createSteps(dispatch, handleStepInteraction, pathname),
    [dispatch, handleStepInteraction, pathname]
  );

  // Force step 1 on mount
  useEffect(() => {
    dispatch(setStep(1));
  }, [dispatch]);

  // Update current step based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      const stepElements = document.querySelectorAll('[data-step]');
      const viewportHeight = window.innerHeight;
      const scrollPosition = window.scrollY;

      stepElements.forEach((element) => {
        const rect = element.getBoundingClientRect();
        const stepId = parseInt(element.getAttribute('data-step') || '1');

        // Check if element is in viewport
        if (
          rect.top <= viewportHeight / 2 &&
          rect.bottom >= viewportHeight / 2
        ) {
          dispatch(setStep(stepId));
        }
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [dispatch]);

  // Prevent navigation on mount
  useEffect(() => {
    const preventNavigation = () => {
      window.history.pushState(null, '', window.location.pathname);
    };

    // Push initial state
    preventNavigation();

    // Handle popstate
    window.addEventListener('popstate', preventNavigation);
    return () => window.removeEventListener('popstate', preventNavigation);
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      dispatch(setStep(currentStep - 1));
    }
  }, [currentStep, dispatch]);

  // Compute disabled state based on current step
  const showBackButton = useMemo(() => currentStep > 1, [currentStep]);

  // Compute continue state
  const canContinue = useMemo(() => {
    const hasValidPersonalDetails = !!(
      personalDetails?.firstName?.trim() &&
      personalDetails?.lastName?.trim() &&
      personalDetails?.email?.trim() &&
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(personalDetails.email)
    );

    const allStepsComplete = [1, 2, 3].every((stepId) =>
      completedSteps.includes(stepId)
    );

    const requiredCheckboxesAccepted = termsAccepted && privacyAccepted;

    return (
      !!selectedFlight &&
      !!wizardAnswers?.length &&
      hasValidPersonalDetails &&
      allStepsComplete &&
      requiredCheckboxesAccepted
    );
  }, [
    selectedFlight,
    wizardAnswers,
    personalDetails,
    completedSteps,
    termsAccepted,
    privacyAccepted,
  ]);

  // Handle navigation
  const handleStepChange = useCallback(() => {
    if (!termsAccepted || !privacyAccepted) {
      setShowErrors(true);
      return;
    }
    if (!canContinue) return;
    router.push('/phases/compensation-estimate');
  }, [canContinue, router, termsAccepted, privacyAccepted]);

  return (
    <div className="flex flex-col min-h-screen">
      <main className="max-w-3xl mx-auto px-4 pt-4 pb-32 flex-grow">
        <div className="space-y-4">
          <div className="mt-4 sm:mt-8">
            <SpeechBubble message="Hi, my name is Captain Frank and I'm dealing with your flight disaster. So that I can give you a free initial assessment of your possible claim, please answer three questions." />
          </div>

          {/* Step Cards */}
          {STEPS.map((step) => {
            const StepComponent = step.component;
            const isCompleted = completedSteps.includes(step.id);
            const hasInteracted = interactedSteps.includes(step.id);
            const isCurrentStep = currentStep === step.id;

            return (
              <AccordionCard
                key={step.id}
                className={step.id === 1 ? '-mt-2' : 'mt-6'}
                isCompleted={isCompleted}
                isActive={isCurrentStep}
                title={step.title}
                subtitle={step.subtitle}
                eyebrow={`Step ${step.id}`}
                summary={step.getSummary(bookingState)}
                shouldStayOpen={step.shouldStayOpen}
                hasInteracted={hasInteracted}
                isOpenByDefault={step.isOpenByDefault}
              >
                <div className="[&>section]:!p-0 [&>section]:!pb-0 [&>section]:!m-0">
                  <StepComponent {...step.props} />
                </div>
              </AccordionCard>
            );
          })}

          {/* Consent Checkboxes */}
          <div className="space-y-4 mt-6">
            <ConsentCheckbox
              text="I have read and agree to the"
              linkText="terms and conditions"
              link="/terms"
              required={true}
              error={showErrors && !termsAccepted}
              onChange={setTermsAccepted}
            />
            <ConsentCheckbox
              text="I have read and agree to the"
              linkText="privacy policy"
              link="/privacy"
              required={true}
              error={showErrors && !privacyAccepted}
              onChange={setPrivacyAccepted}
            />
            <ConsentCheckbox
              text="I agree that Captain Frank may send me advertising about Captain Frank's services, promotions and satisfaction surveys by email. Captain Frank will process my personal data for this purpose (see"
              linkText="privacy policy"
              link="/privacy"
              details="). I can revoke this consent at any time."
              onChange={setMarketingAccepted}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-end items-center gap-4 mt-12">
            {showBackButton ? (
              <button
                type="button"
                onClick={handleBack}
                className="w-[160px] px-12 py-4 rounded-lg transition-colors text-[#F54538] hover:bg-[#F54538]/10"
              >
                Back
              </button>
            ) : null}
            <button
              onClick={handleStepChange}
              disabled={!canContinue}
              className={`w-[160px] px-12 py-4 rounded-lg transition-colors ${
                canContinue
                  ? 'bg-[#F54538] hover:bg-[#E03F33] text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Continue
            </button>
          </div>
        </div>
      </main>

      {/* Progress Tracker */}
      <div className="mt-auto">
        <ProgressTracker
          phaseData={{
            currentPhase: 1,
            totalPhases: 6,
            phaseName: 'Initial Assessment',
            completedSteps,
            totalStepsInPhase: STEPS.length,
            phaseProgress: bookingState.phaseProgress['claim-details'],
            stepInPhase: currentStep,
          }}
        />
      </div>
    </div>
  );
}
