'use client';

import React, { Suspense, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { ClaimService } from '@/services/claimService';

const CLAIM_SUCCESS_PHASE = 5;

// Update store type to include new fields
type ExtendedStore = StoreState &
  StoreActions & {
    _isClaimSuccess?: boolean;
    _preventPhaseChange?: boolean;
    provisionPercentage?: number;
  };

function ClaimSuccessContent() {
  const router = useRouter();
  const params = useParams();
  const lang = params?.lang?.toString() || '';
  const store = useStore() as ExtendedStore;
  const mountedRef = React.useRef(true);
  const initializedRef = React.useRef(false);
  const isUpdatingRef = React.useRef(false);

  const { completedPhases, compensationAmount, isStepValid, wizardAnswers } =
    store;

  const { t } = useTranslation();
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
  const [isLoading, setIsLoading] = React.useState(true);

  // Initialize answers from wizard answers
  useEffect(() => {
    if (wizardAnswers) {
    }
  }, [wizardAnswers]);

  // Initialize phase and claim details
  React.useEffect(() => {
    if (!mountedRef.current || initializedRef.current) {
      return;
    }

    const initializeState = async () => {
      try {
        // Get evaluation result from ClaimService
        let evaluationResult;
        try {
          evaluationResult = ClaimService.getLastEvaluationResponse();
          console.log('Retrieved evaluation result:', evaluationResult);
        } catch (error) {
          console.error('Error getting evaluation response:', error);
          if (mountedRef.current) {
            router.replace(`/${lang}/phases/compensation-estimate`);
          }
          return;
        }

        if (
          !evaluationResult ||
          !evaluationResult.contract ||
          evaluationResult.status !== 'accept'
        ) {
          console.error('Invalid evaluation result:', evaluationResult);
          if (mountedRef.current) {
            router.replace(`/${lang}/phases/compensation-estimate`);
          }
          return;
        }

        const { amount, provision } = evaluationResult.contract;

        // Check existing personal details validation
        const existingPersonalDetails = store.personalDetails || null;
        const requiredFields = [
          'salutation',
          'firstName',
          'lastName',
          'email',
          'phone',
          'address',
          'postalCode',
          'city',
          'country',
        ];

        // Validate all required fields are present and not empty
        const hasAllRequiredFields = existingPersonalDetails
          ? requiredFields.every((field) =>
              existingPersonalDetails[field as keyof PassengerDetails]?.trim()
            )
          : false;

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailValid = existingPersonalDetails?.email
          ? emailRegex.test(existingPersonalDetails.email)
          : false;

        // Overall validation state
        const isPersonalValid = hasAllRequiredFields && isEmailValid;

        // Set initial state with proper validation
        const initialValidationState = {
          ...store.validationState,
          isFlightValid: true,
          isWizardValid: true,
          isTermsValid: store.validationState?.isTermsValid || false,
          isSignatureValid: store.validationState?.isSignatureValid || false,
          isPersonalValid: isPersonalValid,
          stepValidation: {
            ...store.validationState?.stepValidation,
            1: isPersonalValid,
            2: true,
            3: true,
            4: true,
            5: true,
          },
          stepInteraction: {
            ...store.validationState?.stepInteraction,
            1: existingPersonalDetails !== null,
          },
          fieldErrors: !isPersonalValid
            ? requiredFields.reduce(
                (errors, field) => {
                  if (
                    !existingPersonalDetails?.[
                      field as keyof PassengerDetails
                    ]?.trim()
                  ) {
                    errors[field] = `${field} is required`;
                  }
                  return errors;
                },
                {} as Record<string, string>
              )
            : {},
          _timestamp: Date.now(),
        };

        // Set initial state
        useStore.setState({
          phase: CLAIM_SUCCESS_PHASE,
          currentPhase: CLAIM_SUCCESS_PHASE,
          _preventPhaseChange: true,
          _isClaimSuccess: true,
          compensationAmount: amount,
          provisionPercentage: provision,
          bookingReference:
            evaluationResult.journey_booked_flightids?.[0] || '',
          completedPhases: Array.from(
            new Set([...store.completedPhases, 1, 2, 3, 4, CLAIM_SUCCESS_PHASE])
          ),
          phasesCompletedViaContinue: Array.from(
            new Set([...store.phasesCompletedViaContinue, 1, 2, 3, 4])
          ),
          validationState: initialValidationState,
          personalDetails: existingPersonalDetails,
        } as Partial<StoreState & StoreActions>);

        // Subscribe to store changes with update guard
        const unsubscribe = useStore.subscribe((state: ExtendedStore) => {
          if (
            !isUpdatingRef.current &&
            state._isClaimSuccess &&
            state.currentPhase !== CLAIM_SUCCESS_PHASE &&
            !state._preventPhaseChange
          ) {
            try {
              isUpdatingRef.current = true;
              useStore.setState({
                phase: CLAIM_SUCCESS_PHASE,
                currentPhase: CLAIM_SUCCESS_PHASE,
                _preventPhaseChange: true,
                validationState: {
                  ...state.validationState,
                  isPersonalValid:
                    state.validationState?.isPersonalValid || false,
                  stepValidation: {
                    ...state.validationState?.stepValidation,
                    1: state.validationState?.isPersonalValid || false,
                  },
                  _timestamp: Date.now(),
                },
              } as Partial<StoreState & StoreActions>);
            } finally {
              isUpdatingRef.current = false;
            }
          }
        });

        // Then update local state if component is still mounted
        if (mountedRef.current) {
          setClaimDetails({
            amount,
            currency: 'EUR',
            provision: provision?.toString() || '',
            bookingReference:
              evaluationResult.journey_booked_flightids?.[0] || '',
            departureAirport: '',
            arrivalAirport: '',
            scheduledDepartureTime: '',
          });
          setIsLoading(false);
          initializedRef.current = true;
        }

        return () => {
          unsubscribe();
          if (mountedRef.current) {
            useStore.setState({
              _isClaimSuccess: false,
              _preventPhaseChange: false,
            } as Partial<StoreState & StoreActions>);
          }
        };
      } catch (error) {
        console.error('Error initializing claim success page:', error);
        if (mountedRef.current) {
          setError(
            'Failed to initialize claim success page. Please try again.'
          );
          setIsLoading(false);
          initializedRef.current = true;
        }
      }
    };

    // Initialize state immediately
    initializeState();

    return () => {
      mountedRef.current = false;
    };
  }, [router, lang, store.completedPhases, store.phasesCompletedViaContinue]);

  // Add debug logging
  React.useEffect(() => {
    console.log('Claim Success Page State:', {
      isLoading,
      error,
      claimDetails,
      storeState: {
        currentPhase: store.currentPhase,
        completedPhases: store.completedPhases,
        compensationAmount: store.compensationAmount,
        isStepValid: isStepValid(1),
      },
    });
  }, [isLoading, error, claimDetails, store, isStepValid]);

  // Handle personal details updates
  const handlePersonalDetailsComplete = useCallback(
    (details: PassengerDetails | null) => {
      if (!details || isUpdatingRef.current) {
        return;
      }

      try {
        isUpdatingRef.current = true;

        // Get current state
        const currentState = useStore.getState() as ExtendedStore;
        const currentValidationState = currentState.validationState || {};

        // Debug log current state
        console.log('=== Personal Details Validation Start ===');
        console.log('Current details:', details);
        console.log('Current validation state:', currentValidationState);

        // Only update if the details have actually changed
        const currentDetails = currentState.personalDetails;
        if (JSON.stringify(currentDetails) === JSON.stringify(details)) {
          console.log('No changes detected in details, skipping update');
          return;
        }

        // Validate all required fields for claim success
        const requiredFields = [
          'salutation',
          'firstName',
          'lastName',
          'email',
          'phone',
          'address',
          'postalCode',
          'city',
          'country',
        ] as const;

        // Check each field individually and log its state
        const fieldValidation = requiredFields.map((field) => {
          const value = details[field]?.trim();
          const isValid = !!value;
          console.log(`Field ${field}: value="${value}", isValid=${isValid}`);
          return isValid;
        });

        // Check if all required fields are present and not empty
        const isValid = fieldValidation.every(Boolean);
        console.log('All fields valid:', isValid);

        // Email validation
        const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
        const isEmailValid = emailRegex.test(details.email?.trim() || '');
        console.log('Email validation:', {
          email: details.email,
          isEmailValid,
        });

        // Generate field errors
        const fieldErrors: Record<string, string> = {};
        requiredFields.forEach((field) => {
          if (!details[field]?.trim()) {
            fieldErrors[field] = 'This field is required';
          }
        });

        if (!isEmailValid && details.email?.trim()) {
          fieldErrors.email = 'Please enter a valid email address';
        }

        console.log('Field errors:', fieldErrors);

        // Final validation state
        const finalValidationState = {
          ...currentValidationState,
          isPersonalValid: isValid && isEmailValid,
          stepValidation: {
            ...currentValidationState.stepValidation,
            1: isValid && isEmailValid,
          },
          stepInteraction: {
            ...currentValidationState.stepInteraction,
            1: true,
          },
          1: isValid && isEmailValid,
          fieldErrors,
          _timestamp: Date.now(),
        };

        console.log('Final validation state:', finalValidationState);

        // Force validation state update
        useStore.setState({
          personalDetails: details,
          validationState: finalValidationState,
          _lastUpdate: Date.now(),
        });

        // Track step completion
        if (!interactedSteps.includes(1)) {
          setInteractedSteps([...interactedSteps, 1]);
        }

        console.log('=== Personal Details Validation End ===');

        // Update HubSpot contact if details are valid
        if (isValid && isEmailValid) {
          const contactId = sessionStorage.getItem('hubspot_contact_id');

          console.log('=== HubSpot Personal Details Update ===', {
            contactId,
            details,
            timestamp: new Date().toISOString(),
          });

          if (contactId) {
            fetch('/.netlify/functions/hubspot-integration/contact', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId,
                email: details.email,
                firstName: details.firstName,
                lastName: details.lastName,
                salutation: details.salutation,
                phone: details.phone || '',
                mobilephone: details.phone || '',
                address: details.address || '',
                city: details.city || '',
                postalCode: details.postalCode || '',
                country: details.country || '',
                arbeitsrecht_marketing_status: false,
              }),
            })
              .then((response) => response.json())
              .then((data) => {
                console.log('HubSpot update response:', data);
              })
              .catch((error) => {
                console.error('Error updating HubSpot contact:', error);
              });
          }
        }
      } finally {
        isUpdatingRef.current = false;
      }
    },
    [interactedSteps]
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
  const handleContinue = async () => {
    if (isLoading) return;

    try {
      const compensationAmount = useStore.getState().compensationAmount || 0;
      const dealId = sessionStorage.getItem('hubspot_deal_id');
      const contactId = sessionStorage.getItem('hubspot_contact_id');
      const personalDetails = useStore.getState().personalDetails;
      const marketingAccepted = useStore.getState().marketingAccepted;

      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      if (dealId) {
        console.log('Updating HubSpot deal with final status:', {
          dealId,
          contactId,
          amount: compensationAmount,
          stage: 'closedwon',
          personalDetails,
          marketingStatus: marketingAccepted,
          timestamp: new Date().toISOString(),
        });

        try {
          // Check if personalDetails exists
          if (!personalDetails) {
            throw new Error('Personal details are required');
          }

          // First update the contact with all details
          const contactResponse = await fetch(
            '/.netlify/functions/hubspot-integration/contact',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId,
                email: personalDetails.email,
                firstname: personalDetails.firstName,
                lastname: personalDetails.lastName,
                salutation: personalDetails.salutation,
                phone: personalDetails.phone || '',
                mobilephone: personalDetails.phone || '',
                address: personalDetails.address || '',
                city: personalDetails.city || '',
                zip: personalDetails.postalCode || '',
                country: personalDetails.country || '',
                arbeitsrecht_marketing_status: marketingAccepted,
              }),
            }
          );

          if (!contactResponse.ok) {
            console.error(
              'Failed to update HubSpot contact:',
              await contactResponse.text()
            );
          }

          // Then update the deal
          const updateResponse = await fetch(
            '/.netlify/functions/hubspot-integration/deal',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contactId,
                dealId,
                amount: compensationAmount,
                action: 'update',
                stage: 'closedwon',
                personalDetails,
                marketingStatus: marketingAccepted,
              }),
            }
          );

          if (updateResponse.ok) {
            console.log('HubSpot deal update successful');
          } else {
            const errorText = await updateResponse.text();
            console.error('Error updating HubSpot deal:', errorText);
            throw new Error(`Failed to update deal: ${errorText}`);
          }
        } catch (error) {
          console.error('Error updating HubSpot deal:', error);
          throw error;
        }
      }

      // Complete all required phases
      [1, 2, 3, 4, 5].forEach((phase) => {
        console.log(`Completing phase ${phase}`);
        useStore.setState({
          currentPhase: phase,
          completedPhases: Array.from(
            new Set([...useStore.getState().completedPhases, phase])
          ),
          phasesCompletedViaContinue: Array.from(
            new Set([...useStore.getState().phasesCompletedViaContinue, phase])
          ),
          validationState: {
            ...useStore.getState().validationState,
            stepValidation: {
              ...useStore.getState().validationState.stepValidation,
              [phase]: true,
            },
            stepInteraction: {
              ...useStore.getState().validationState.stepInteraction,
              [phase]: false,
            },
          },
        });
      });

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
      setIsLoading(false);
    }
  };

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
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#F54538]"></div>
            </div>
          ) : error ? (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <BackButton
                onClick={() => {
                  // Set phase back to 4 before navigation
                  useStore.setState({
                    currentPhase: 4,
                    _isClaimSuccess: false,
                    _preventPhaseChange: false,
                  } as Partial<StoreState & StoreActions>);
                  router.push(`/${lang}/phases/trip-experience`);
                }}
                text={t.phases.claimSuccess.navigation.back}
              />
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
                  onClick={() => {
                    // Set phase back to 4 before navigation
                    useStore.setState({
                      currentPhase: 4,
                      _isClaimSuccess: false,
                      _preventPhaseChange: false,
                    } as Partial<StoreState & StoreActions>);
                    router.push(`/${lang}/phases/trip-experience`);
                  }}
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
  return (
    <PhaseGuard phase={CLAIM_SUCCESS_PHASE}>
      <Suspense fallback={null}>
        <ClaimSuccessContent />
      </Suspense>
    </PhaseGuard>
  );
}
