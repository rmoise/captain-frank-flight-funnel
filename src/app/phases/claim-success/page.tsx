'use client';

import React, { Suspense, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import type { PassengerDetails } from '@/types/store';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { accordionConfig } from '@/config/accordion';
import { pushToDataLayer } from '@/utils/gtm';
import { BackButton } from '@/components/shared/BackButton';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { useTranslation } from '@/hooks/useTranslation';
import { StoreState, StoreActions } from '@/lib/state/store';

// Extend the store state type properly
type ExtendedStore = StoreState &
  StoreActions & {
    _isClaimSuccess?: boolean;
    _preventPhaseChange?: boolean;
  };

function ClaimSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    completedPhases,
    setCurrentPhase,
    completePhase,
    setPersonalDetails,
    compensationAmount,
    isStepValid,
    wizardAnswers,
  } = useStore();

  const { t, lang } = useTranslation();
  const [claimDetails, setClaimDetails] = React.useState({
    amount: 0,
    currency: 'EUR',
    provision: '',
    bookingReference: '',
    departureAirport: '',
    arrivalAirport: '',
    scheduledDepartureTime: '',
  });
  const [error, setError] = React.useState<string | null>(null);
  const [openSteps, setOpenSteps] = React.useState<number[]>([1]);
  const [interactedSteps, setInteractedSteps] = React.useState<number[]>([]);

  // Initialize answers from wizard answers
  useEffect(() => {
    if (wizardAnswers) {
    }
  }, [wizardAnswers]);

  // Initialize phase and claim details
  React.useEffect(() => {
    const CLAIM_SUCCESS_PHASE = 5;

    // Set phase immediately to ensure rendering
    useStore.setState({
      currentPhase: CLAIM_SUCCESS_PHASE,
      _preventPhaseChange: true,
      _isClaimSuccess: true,
      completedPhases: Array.from(
        new Set([...useStore.getState().completedPhases, 1, 2, 3, 4])
      ),
      validationState: {
        ...useStore.getState().validationState,
        isFlightValid: true,
        isWizardValid: true,
        isTermsValid:
          useStore.getState().validationState?.isTermsValid || false,
        isSignatureValid:
          useStore.getState().validationState?.isSignatureValid || false,
        1: true,
        2: true,
        3: true,
        4: true,
      },
    } as Partial<ExtendedStore>);

    // Subscribe to store changes to force phase 5
    const unsubscribe = useStore.subscribe((state) => {
      if (
        state.currentPhase !== CLAIM_SUCCESS_PHASE &&
        (state as ExtendedStore)._isClaimSuccess
      ) {
        console.log('Forcing phase back to 5');
        useStore.setState({
          currentPhase: CLAIM_SUCCESS_PHASE,
          _preventPhaseChange: true,
        } as Partial<ExtendedStore>);
      }
    });

    // Initialize claim details from URL parameters
    const amount = searchParams?.get('amount');
    const currency = searchParams?.get('currency');
    const provision = searchParams?.get('provision');
    const bookingRef = searchParams?.get('bookingRef');
    const depAirport = searchParams?.get('depAirport');
    const arrAirport = searchParams?.get('arrAirport');
    const depTime = searchParams?.get('depTime');

    setClaimDetails({
      amount: amount ? parseInt(amount, 10) : compensationAmount || 0,
      currency: currency || 'EUR',
      provision: provision || '',
      bookingReference: bookingRef || '',
      departureAirport: depAirport || '',
      arrivalAirport: arrAirport || '',
      scheduledDepartureTime: depTime || '',
    });

    return () => {
      unsubscribe();
      useStore.setState({
        _preventPhaseChange: false,
        _isClaimSuccess: false,
      } as Partial<ExtendedStore>);
    };
  }, [searchParams, compensationAmount]);

  // Handle personal details updates
  const handlePersonalDetailsComplete = useCallback(
    (details: PassengerDetails | null) => {
      setPersonalDetails(details);
    },
    [setPersonalDetails]
  );

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (err) {
      return `${amount} ${currency}`;
    }
  };

  // Handle continue button click
  const handleContinue = useCallback(() => {
    console.log('=== Handle Continue ===');
    console.log('Validation state before continue:', {
      isStepValid: isStepValid(1),
      interactedSteps,
      completedPhases,
    });

    if (!isStepValid(1)) {
      console.log('Cannot continue - step 1 is not valid');
      return;
    }

    try {
      // Complete all required phases
      [1, 2, 3, 4, 5].forEach((phase) => {
        console.log(`Completing phase ${phase}`);
        completePhase(phase);
      });

      // Set current phase to 6
      console.log('Setting current phase to 6');
      setCurrentPhase(6);

      // Update localStorage with completed phases
      const updatedCompletedPhases = [...completedPhases, 1, 2, 3, 4, 5];
      console.log('Updating completed phases:', updatedCompletedPhases);
      localStorage.setItem(
        'completedPhases',
        JSON.stringify(updatedCompletedPhases)
      );
      localStorage.setItem('currentPhase', '6');

      // Create URL with all necessary parameters
      const searchParams = new URLSearchParams();
      searchParams.set('bypass_phase_check', 'true');
      searchParams.set('redirected', 'true');
      searchParams.set('completed_phases', '1,2,3,4,5');
      searchParams.set('current_phase', '6');

      const nextUrl = `/${lang}/phases/agreement?${searchParams.toString()}`;
      console.log('Navigating to:', nextUrl);

      // Use replace instead of push to prevent history stack issues
      router.replace(nextUrl);
    } catch (err) {
      console.error('Error in continue handler:', err);
      setError(
        'An error occurred while navigating to the agreement page. Please try again.'
      );
    }
    console.log('=== End Handle Continue ===');
  }, [
    setCurrentPhase,
    completePhase,
    isStepValid,
    interactedSteps,
    completedPhases,
    lang,
    router,
    setError,
  ]);

  useEffect(() => {
    pushToDataLayer({
      step_position: 4,
      dlv_provision: compensationAmount,
    });
  }, [compensationAmount]);

  return (
    <PhaseGuard phase={5}>
      <div className="min-h-screen flex flex-col bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={5} completedPhases={completedPhases} />
        <main className="flex-grow max-w-3xl mx-auto px-4 pt-8 pb-24">
          {error ? (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <BackButton onClick={() => router.back()} />
            </div>
          ) : (
            <>
              <div className="mt-4 sm:mt-8 mb-8">
                <SpeechBubble message={t.phases.claimSuccess.speechBubble} />
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {t.phases.claimSuccess.summary.estimatedCompensation}
                  </h2>
                  <div className="text-2xl font-bold text-[#F54538]">
                    {formatAmount(claimDetails.amount, claimDetails.currency)}
                  </div>
                  <p className="text-gray-600 mt-2">
                    {t.phases.claimSuccess.description}
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    {t.phases.claimSuccess.nextSteps.title}
                  </h2>
                  <div className="text-left space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                        1
                      </div>
                      <p className="text-gray-700">
                        {
                          t.phases.claimSuccess.nextSteps.steps.review
                            .description
                        }
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                        2
                      </div>
                      <p className="text-gray-700">
                        {
                          t.phases.claimSuccess.nextSteps.steps.airline
                            .description
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <AccordionCard
                  title={t.phases.claimSuccess.nextSteps.steps.review.title}
                  eyebrow={t.phases.initialAssessment.step.replace(
                    '{number}',
                    '1'
                  )}
                  summary={
                    t.phases.claimSuccess.nextSteps.steps.review.description
                  }
                  isCompleted={isStepValid(1)}
                  hasInteracted={interactedSteps.includes(1)}
                  className={accordionConfig.padding.wrapper}
                  shouldStayOpen={false}
                  isOpenByDefault={true}
                  isOpen={openSteps.includes(1)}
                  stepId="personal-details"
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
                    <PersonalDetailsForm
                      onComplete={handlePersonalDetailsComplete}
                      onInteract={() => {
                        if (!interactedSteps.includes(1)) {
                          setInteractedSteps((prev) => [...prev, 1]);
                        }
                      }}
                      isClaimSuccess={true}
                      showAdditionalFields={true}
                    />
                  </div>
                </AccordionCard>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
                <BackButton
                  onClick={() => router.push(`/${lang}/phases/trip-experience`)}
                  text={t.phases.claimSuccess.navigation.back}
                />
                <ContinueButton
                  onClick={handleContinue}
                  disabled={!isStepValid(1)}
                  text={t.phases.claimSuccess.navigation.viewStatus}
                />
              </div>
            </>
          )}
        </main>
      </div>
    </PhaseGuard>
  );
}

export default function ClaimSuccessPage() {
  const hideLoading = useStore((state) => state.hideLoading);

  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClaimSuccessContent />
    </Suspense>
  );
}
