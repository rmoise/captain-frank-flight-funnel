'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { validateForm } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import { PhaseGuard } from '@/components/guards/PhaseGuard';
import SignaturePad, {
  SignaturePadRef,
} from '@/components/shared/SignaturePad';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import api from '@/services/api';
import type { OrderClaimRequest } from '@/services/api';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { accordionConfig } from '@/config/accordion';
import { BackButton } from '@/components/shared/BackButton';
import { ContinueButton } from '@/components/shared/ContinueButton';

interface FormData {
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacy: boolean;
  hasAcceptedMarketing: boolean;
  [key: string]: unknown;
}

interface FormErrors {
  [key: string]: string[];
}

// Add type for validation rules
interface ValidationRule {
  test: (value: unknown) => boolean;
  message: string;
}

interface ValidationRules {
  [key: string]: ValidationRule[];
}

// Add type for state setters at the top of the file
type SetStateAction<T> = T | ((prevState: T) => T);
/* eslint-disable @typescript-eslint/no-unused-vars */
type SetStateFunction<T> = (action: SetStateAction<T>) => void;
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function AgreementPage() {
  const router = useRouter();
  const { showLoading, hideLoading } = useLoading();
  const {
    selectedFlight: flightDetails,
    selectedFlights,
    personalDetails,
    bookingNumber,
    completedPhases,
    setCurrentPhase,
    completePhase,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    validateTerms,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    validationState,
    setSignature,
    setHasSignature,
    validateSignature,
  } = useStore();

  const signatureRef = useRef<SignaturePadRef>(null);
  const [mounted, setMounted] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [openSteps, setOpenSteps] = React.useState<Array<number | string>>([1]);
  // Kept for consistency with other pages
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [interactedSteps, setInteractedSteps] = React.useState<number[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
    hasAcceptedTerms: false,
    hasAcceptedPrivacy: false,
    hasAcceptedMarketing: false,
  });
  const [hasInteractedWithSignature, setHasInteractedWithSignature] =
    useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);

  const validationRules = {
    hasAcceptedTerms: [
      {
        test: (value: unknown) => value === true,
        message: 'You must accept the terms and conditions',
      },
    ],
    hasAcceptedPrivacy: [
      {
        test: (value: unknown) => value === true,
        message: 'You must accept the privacy policy',
      },
    ],
  };

  // Initialize state
  useEffect(() => {
    if (!mounted) {
      const initializeState = async () => {
        try {
          // Set current phase to 6
          setCurrentPhase(6);

          // Initialize form data from store state
          const initialFormData = {
            hasAcceptedTerms: termsAccepted,
            hasAcceptedPrivacy: privacyAccepted,
            hasAcceptedMarketing: marketingAccepted,
          };
          setFormData(initialFormData);

          // If terms were already accepted in a previous phase, validate them
          if (termsAccepted && privacyAccepted) {
            const store = useStore.getState();
            store.updateValidationState({
              isTermsValid: true,
              stepValidation: {
                ...store.validationState.stepValidation,
                2: true,
              },
              stepInteraction: {
                ...store.validationState.stepInteraction,
                2: true,
              },
              2: true,
            });
          }

          // Validate initial state
          validateSignature();
          setMounted(true);
        } catch (error) {
          console.error('Error initializing agreement page:', error);
          router.push('/phases/initial-assessment');
        }
      };

      initializeState();
    }
  }, [
    mounted,
    router,
    setCurrentPhase,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    validateTerms,
    personalDetails,
    validateSignature,
    setHasInteractedWithSignature,
    validationState,
    setMounted,
  ]);

  // Add effect to sync form data with store state
  useEffect(() => {
    if (mounted) {
      setFormData(
        (prev: FormData): FormData => ({
          ...prev,
          hasAcceptedTerms: termsAccepted,
          hasAcceptedPrivacy: privacyAccepted,
          hasAcceptedMarketing: marketingAccepted,
        })
      );
    }
  }, [mounted, termsAccepted, privacyAccepted, marketingAccepted]);

  // Initialize phase state from URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isRedirected = searchParams.get('redirected') === 'true';
    const completedPhasesStr = searchParams.get('completed_phases');
    const currentPhaseStr = searchParams.get('current_phase');

    if (isRedirected && completedPhasesStr && currentPhaseStr) {
      // Parse completed phases
      const phases = completedPhasesStr.split(',').map(Number);
      console.log('Initializing completed phases:', phases);
      phases.forEach((phase) => completePhase(phase));

      // Set current phase
      const phase = parseInt(currentPhaseStr, 10);
      console.log('Setting current phase to:', phase);
      setCurrentPhase(phase);

      // Validate personal details
      const isValid = useStore.getState().validatePersonalDetails();
      console.log('Personal details validation on init:', {
        isValid,
        personalDetails,
      });

      if (isValid) {
        const store = useStore.getState();
        store.updateValidationState({
          isPersonalValid: true,
          stepValidation: {
            1: true,
            2: true,
            3: true,
            4: true,
          },
        });
      }
    }
  }, [completePhase, setCurrentPhase, personalDetails]);

  // Add effect to check flight details and validate personal details on mount
  useEffect(() => {
    if (mounted) {
      console.log('Flight details on mount:', {
        flightDetails,
        selectedFlights,
        completedPhases,
        personalDetails,
      });

      // Validate personal details
      const isValid = useStore.getState().validatePersonalDetails();
      console.log('Personal details validation on mount:', {
        isValid,
        personalDetails,
      });

      if (isValid) {
        const store = useStore.getState();
        store.updateValidationState({
          isPersonalValid: true,
          stepValidation: {
            1: true,
            2: true,
            3: true,
            4: true,
          },
        });
      }
    }
  }, [
    mounted,
    flightDetails,
    selectedFlights,
    completedPhases,
    personalDetails,
  ]);

  // Initialize signature pad
  useEffect(() => {
    if (mounted && signatureRef.current) {
      const store = useStore.getState();
      const signature = store.signature;
      if (signature) {
        signatureRef.current.fromDataURL(signature);
        setHasSignature(true);
        validateSignature();
        setHasInteractedWithSignature(true);
      }
    }
  }, [mounted, validateSignature, setHasSignature]);

  const handleSignatureStart = () => {
    setHasInteractedWithSignature(true);
  };

  const handleSignatureEnd = () => {
    if (signatureRef.current) {
      const signatureData = signatureRef.current.toDataURL();
      const isEmpty = isSignatureEmpty();

      if (!isEmpty) {
        setSignature(signatureData);
        setHasSignature(true);
        validateSignature();
        setErrors(
          (prev: FormErrors): FormErrors => ({ ...prev, signature: [] })
        );
      } else {
        setSignature('');
        setHasSignature(false);
        if (hasInteractedWithSignature) {
          setErrors(
            (prev: FormErrors): FormErrors => ({
              ...prev,
              signature: ['Please provide your signature'],
            })
          );
        }
      }
    }
  };

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignature('');
      setHasSignature(false);
      setHasInteractedWithSignature(false);
      setErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          signature: [],
        })
      );
    }
  };

  const handleTermsChange =
    (field: keyof FormData) =>
    (checked: boolean): void => {
      const updatedFormData = {
        ...formData,
        [field]: checked,
      };
      setFormData(updatedFormData);
      setErrors((prev: FormErrors): FormErrors => ({ ...prev, [field]: [] }));

      // Update store state based on field
      if (field === 'hasAcceptedTerms') {
        setTermsAccepted(checked);
      } else if (field === 'hasAcceptedPrivacy') {
        setPrivacyAccepted(checked);
      } else if (field === 'hasAcceptedMarketing') {
        setMarketingAccepted(checked);
      }
    };

  const isSignatureEmpty = () => {
    if (!signatureRef.current) return true;
    return signatureRef.current.isEmpty();
  };

  const canSubmit = () => {
    // Check signature validity from store
    const signatureValid = validationState.isSignatureValid;
    // Check terms validity from store and actual acceptance state
    const termsValid =
      validationState.isTermsValid && termsAccepted && privacyAccepted;

    console.log('Submit validation:', {
      signatureValid,
      termsValid,
      validationState,
      termsAccepted,
      privacyAccepted,
    });

    return signatureValid && termsValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    showLoading();

    try {
      // Validate form data with rules
      const validationErrors = validateForm(
        formData,
        validationRules as ValidationRules
      );
      if (Object.keys(validationErrors).length > 0) {
        setErrors(
          (prev: FormErrors): FormErrors => ({
            ...prev,
            ...validationErrors,
          })
        );
        hideLoading();
        return;
      }

      // Clear any previous errors
      setErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          submit: [],
        })
      );

      // Get flight IDs from selectedFlights
      const flightIdsAsStrings = selectedFlights.map((flight) =>
        String(flight.id)
      );

      // Get travel status from store
      const travelStatus = useStore
        .getState()
        .wizardAnswers.find((a) => a.questionId === 'travel_status')?.value as
        | 'none'
        | 'self'
        | 'provided';

      // Set journey_fact_flightids based on travel status
      const journey_fact_flightids_strings =
        travelStatus === 'none' ? [] : flightIdsAsStrings.slice(0, 1); // Just use first flight if traveled

      // Map travel status to journey_fact_type
      const journey_fact_type = travelStatus;

      console.log('Selected travel status:', {
        travelStatus,
        allAnswers: useStore.getState().wizardAnswers,
      });

      const informedDate = useStore
        .getState()
        .wizardAnswers.find((a) => a.questionId === 'informed_date')?.value;

      const specificDate = useStore
        .getState()
        .wizardAnswers.find(
          (a) => a.questionId === 'specific_informed_date'
        )?.value;

      console.log('Date information:', {
        informedDate,
        specificDate,
        selectedFlightDate: selectedFlights[0]?.date,
      });

      // Format the date for the API
      const formattedDate =
        informedDate === 'on_departure'
          ? String(selectedFlights[0].date).split('T')[0]
          : typeof specificDate === 'string'
            ? specificDate.split('T')[0]
            : undefined;

      console.log('Formatted date:', formattedDate);

      // Create the evaluation data
      const evaluationData = {
        journey_booked_flightids: flightIdsAsStrings,
        journey_fact_flightids: journey_fact_flightids_strings,
        information_received_at:
          formattedDate || new Date().toISOString().split('T')[0],
        travel_status: journey_fact_type,
        delay_duration: '240',
        lang: 'en',
      };

      console.log('Full evaluation request:', evaluationData);
      const evaluationResult = await api.evaluateClaim(evaluationData);
      console.log('Evaluation response:', evaluationResult);

      if (evaluationResult.status !== 'accept') {
        // Get rejection reasons if available
        const rejectionReasons = evaluationResult.rejection_reasons;
        const errorMessages = rejectionReasons
          ? Object.values(rejectionReasons)
          : ['Claim evaluation was rejected'];

        setErrors(
          (prev: FormErrors): FormErrors => ({
            ...prev,
            submit: errorMessages,
          })
        );
        hideLoading();
        return;
      }

      // Get personal details from store
      const personalDetails = useStore.getState().personalDetails;
      console.log('Personal details from store:', personalDetails);

      // Create the order request data
      const formDataEntries =
        formData instanceof FormData ? formData : new FormData();
      const formDataValues = Object.fromEntries(
        [
          'salutation',
          'firstName',
          'lastName',
          'street',
          'postalCode',
          'city',
          'country',
          'email',
          'phone',
          'hasAcceptedMarketing',
          'hasAcceptedTerms',
          'hasAcceptedPrivacy',
        ].map((key) => [key, formDataEntries.get(key)?.toString() || ''])
      ) as Record<string, string>;

      const orderRequestData: OrderClaimRequest = {
        journey_booked_flightids: flightIdsAsStrings,
        journey_fact_flightids: journey_fact_flightids_strings,
        journey_fact_type,
        information_received_at:
          formattedDate || new Date().toISOString().split('T')[0],
        journey_booked_pnr: bookingNumber || '',
        owner_salutation: formDataValues.salutation === 'Mr' ? 'herr' : 'frau',
        owner_firstname:
          personalDetails?.firstName || formDataValues.firstName || '',
        owner_lastname:
          personalDetails?.lastName || formDataValues.lastName || '',
        owner_street: personalDetails?.address || formDataValues.street || '',
        owner_place:
          personalDetails?.zipCode || formDataValues.postalCode || '',
        owner_city: personalDetails?.city || formDataValues.city || '',
        owner_zip: personalDetails?.zipCode || formDataValues.postalCode || '',
        owner_country: personalDetails?.country || formDataValues.country || '',
        owner_email: personalDetails?.email || formDataValues.email || '',
        owner_phone: personalDetails?.phone || formDataValues.phone || '',
        owner_marketable_status: true,
        contract_signature: signatureRef.current?.toDataURL() || '',
        contract_tac: true,
        contract_dp: true,
        guid: evaluationResult.guid,
        recommendation_guid: evaluationResult.recommendation_guid,
      };

      console.log('Submitting order with data:', orderRequestData);

      // Submit the order
      const response = await api.orderClaim(orderRequestData);

      hideLoading(); // Hide loading before redirect

      if (response.data?.guid && response.data?.recommendation_guid) {
        router.push('/claim-submitted');
      } else {
        throw new Error(response.message || 'Failed to submit claim');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          submit: ['An unexpected error occurred. Please try again.'],
        })
      );
      hideLoading(); // Hide loading on error
    }
  };

  // Add back navigation handler
  const handleBack = () => {
    if (!isNavigatingBack) {
      setIsNavigatingBack(true);
      router.push('/phases/claim-success');
    }
  };

  const handleSignatureChange = (dataUrl: string) => {
    const store = useStore.getState();
    store.setSignature(dataUrl);
    store.setHasSignature(true);

    const isValid = store.validateSignature();
    if (isValid) {
      store.updateValidationState({
        isSignatureValid: true,
      });
    }
  };

  const toggleStep = (step: number | string) => {
    setOpenSteps((prev: Array<number | string>): Array<number | string> => {
      if (prev.includes(step)) {
        return prev.filter((s: number | string): boolean => s !== step);
      }
      return [...prev, step];
    });
  };

  const handleStepInteraction = (step: number) => {
    setInteractedSteps((prev: number[]) => {
      if (!prev.includes(step)) {
        return [...prev, step];
      }
      return prev;
    });
  };

  const handleFormDataChange = (data: Partial<FormData>) => {
    setFormData((prev: FormData) => ({
      ...prev,
      ...data,
    }));
  };
  /* eslint-enable @typescript-eslint/no-unused-vars */

  return (
    <PhaseGuard phase={6} allowDevAccess>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={6} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble
              message={`I, ${personalDetails?.salutation ?? ''} ${
                personalDetails?.firstName ?? ''
              } ${personalDetails?.lastName ?? ''}, residing at ${
                personalDetails?.address ?? ''
              }, ${personalDetails?.zipCode ?? ''} ${
                personalDetails?.city ?? ''
              }, ${
                personalDetails?.country ?? ''
              }, hereby assign my claims for compensation from the flight connection with PNR/booking number ${
                bookingNumber ?? ''
              } from ${
                Array.isArray(flightDetails) && flightDetails.length > 0
                  ? flightDetails[0].departure ||
                    flightDetails[0].departureAirport ||
                    ''
                  : flightDetails?.departure ||
                    flightDetails?.departureAirport ||
                    ''
              } to ${
                Array.isArray(flightDetails) && flightDetails.length > 0
                  ? flightDetails[0].arrival ||
                    flightDetails[0].arrivalAirport ||
                    ''
                  : flightDetails?.arrival ||
                    flightDetails?.arrivalAirport ||
                    ''
              } on ${
                Array.isArray(flightDetails) && flightDetails.length > 0
                  ? flightDetails[0].date
                    ? new Date(
                        flightDetails[0].date.split('T')[0]
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : flightDetails[0].departureTime
                      ? new Date(
                          flightDetails[0].departureTime.split(' ')[0]
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : ''
                  : flightDetails?.date
                    ? new Date(
                        flightDetails.date.split('T')[0]
                      ).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : flightDetails?.departureTime
                      ? new Date(
                          flightDetails.departureTime.split(' ')[0]
                        ).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : ''
              } to Captain Frank GmbH.

Captain Frank GmbH accepts the declaration of assignment.`}
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AccordionCard
              title="Digital Signature"
              subtitle="Please sign to confirm your agreement"
              eyebrow="Step 1"
              isCompleted={validationState.isSignatureValid}
              hasInteracted={hasInteractedWithSignature}
              className={accordionConfig.padding.wrapper}
              stepId="digital-signature"
              isOpenByDefault={!validationState.isSignatureValid}
              shouldStayOpen={false}
              summary="Sign the agreement to proceed"
              isOpen={openSteps.includes('digital-signature')}
              onToggle={() => {
                setOpenSteps((prev) =>
                  prev.includes('digital-signature')
                    ? prev.filter((step) => step !== 'digital-signature')
                    : [...prev, 'digital-signature']
                );
              }}
            >
              <div className={accordionConfig.padding.content}>
                <div>
                  <SignaturePad
                    ref={signatureRef}
                    onBegin={handleSignatureStart}
                    onChange={(data: string): void => {
                      handleSignatureChange(data);
                      setErrors(
                        (prev: FormErrors): FormErrors => ({
                          ...prev,
                          signature: [],
                        })
                      );
                    }}
                    onEnd={handleSignatureEnd}
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={clearSignature}
                      className="text-sm text-[#F54538] hover:text-[#E03F33] transition-colors"
                    >
                      Clear Signature
                    </button>
                  </div>
                  {errors.signature && (
                    <p className="mt-2 text-sm text-[#F54538]">
                      {errors.signature[0]}
                    </p>
                  )}
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              title="Terms and Conditions"
              subtitle="Please review and accept the terms to proceed."
              eyebrow="Step 2"
              isCompleted={validationState[2] || false}
              hasInteracted={Object.keys(errors).length > 0}
              className={accordionConfig.padding.wrapper}
              stepId="terms-and-conditions"
              isOpenByDefault={!validationState[2]}
              shouldStayOpen={false}
              summary="Accept the terms and conditions"
              isOpen={openSteps.includes('terms-and-conditions')}
              onToggle={() => {
                setOpenSteps((prev) =>
                  prev.includes('terms-and-conditions')
                    ? prev.filter((step) => step !== 'terms-and-conditions')
                    : [...prev, 'terms-and-conditions']
                );
              }}
            >
              <div className={accordionConfig.padding.content}>
                <div className="space-y-4">
                  <ConsentCheckbox
                    id="terms"
                    type="terms"
                    label="I have read and agree to the terms and conditions."
                    checked={formData.hasAcceptedTerms}
                    onChange={handleTermsChange('hasAcceptedTerms')}
                    required
                  />
                  <ConsentCheckbox
                    id="privacy"
                    type="privacy"
                    label="I have read and agree to the privacy policy."
                    checked={formData.hasAcceptedPrivacy}
                    onChange={handleTermsChange('hasAcceptedPrivacy')}
                    required
                  />
                  <ConsentCheckbox
                    id="marketing"
                    type="marketing"
                    label="I agree that Captain Frank may send me advertising about Captain Frank's services, promotions and satisfaction surveys by email. Captain Frank will process my personal data for this purpose (see privacy policy). I can revoke this consent at any time."
                    checked={formData.hasAcceptedMarketing}
                    onChange={handleTermsChange('hasAcceptedMarketing')}
                    details="Stay updated with our latest services and travel tips. You can unsubscribe at any time."
                  />
                </div>
              </div>
            </AccordionCard>

            <FormError errors={errors.submit} />

            <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
              <BackButton onClick={handleBack} />
              <ContinueButton
                onClick={handleSubmit}
                disabled={!canSubmit()}
                text="Submit Claim"
              />
            </div>
          </form>
        </main>
      </div>
    </PhaseGuard>
  );
}
