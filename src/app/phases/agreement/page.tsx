'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/state/store';
import { usePhase4Store } from '@/lib/state/phase4Store';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import { PhaseGuard } from '@/components/guards/PhaseGuard';
import SignaturePad, {
  SignaturePadRef,
} from '@/components/shared/SignaturePad';
import { ConsentCheckbox } from '@/components/ConsentCheckbox';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { accordionConfig } from '@/config/accordion';
import { BackButton } from '@/components/shared/BackButton';
import { ContinueButton } from '@/components/shared/ContinueButton';
import { useTranslation } from '@/hooks/useTranslation';
import { Flight } from '@/types/store';
import { ClaimService } from '@/services/claimService';
import type { Answer } from '@/types/wizard';
import { validateTerms } from '@/lib/validation/termsValidation';

interface FormData {
  hasAcceptedTerms: boolean;
  hasAcceptedPrivacy: boolean;
  hasAcceptedMarketing: boolean;
  travelStatusAnswers: Answer[];
  informedDateAnswers: Answer[];
  [key: string]: unknown;
}

interface FormErrors {
  [key: string]: string[];
}

// Add type for state setters at the top of the file
type SetStateAction<T> = T | ((prevState: T) => T);
/* eslint-disable @typescript-eslint/no-unused-vars */
type SetStateFunction<T> = (action: SetStateAction<T>) => void;
/* eslint-enable @typescript-eslint/no-unused-vars */

export default function AgreementPage() {
  const router = useRouter();
  const { hideLoading } = useLoading();
  const store = useStore();
  const phase4Store = usePhase4Store();
  const [isClient, setIsClient] = useState(false);
  const { t, lang } = useTranslation();

  // Set isClient to true on mount
  useEffect(() => {
    setIsClient(true);
  }, []);

  const {
    selectedFlights,
    personalDetails,
    bookingNumber,
    completedPhases,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    validationState,
    setSignature,
    setHasSignature,
    validateSignature,
    originalFlights,
    setOriginalFlights,
    updateValidationState,
  } = store;

  const {
    travelStatusAnswers,
    selectedFlights: phase4SelectedFlights,
    informedDateAnswers,
  } = phase4Store;

  const signatureRef = useRef<SignaturePadRef>(null);
  const [mounted, setMounted] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [openSteps, setOpenSteps] = React.useState<Array<number | string>>([
    'digital-signature',
  ]);
  // Kept for consistency with other pages
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const [interactedSteps, setInteractedSteps] = React.useState<number[]>([]);
  const [formData, setFormData] = React.useState<FormData>({
    hasAcceptedTerms: false,
    hasAcceptedPrivacy: false,
    hasAcceptedMarketing: false,
    travelStatusAnswers: [],
    informedDateAnswers: [],
  });
  const [hasInteractedWithSignature, setHasInteractedWithSignature] =
    useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state only on client side
  useEffect(() => {
    if (!isClient || mounted) return;

    const initializeState = async () => {
      try {
        // Get the stored evaluation response - this will throw if not available
        const evaluationResponse = ClaimService.getLastEvaluationResponse();

        // Only proceed if we have an accepted evaluation
        if (evaluationResponse.status !== 'accept') {
          throw new Error('Claim was not accepted during evaluation');
        }

        // Set current phase to 6 and prevent changes
        const store = useStore.getState();
        store.setCurrentPhase(6);

        // Initialize flight data if needed
        if (!originalFlights?.length) {
          const mainStoreFlights = store.selectedFlights as Flight[];
          if (mainStoreFlights?.length) {
            setOriginalFlights(mainStoreFlights);
          }
        }

        // Try to restore validation state from phase 1
        let phase1ValidationState;
        let phase1TermsValid = false;

        try {
          phase1ValidationState = localStorage.getItem(
            'initialAssessmentValidation'
          );
          if (phase1ValidationState) {
            const parsedValidation = JSON.parse(phase1ValidationState);
            phase1TermsValid =
              parsedValidation.validationState?.isTermsValid || false;

            // Restore marketing status from phase 1
            if (parsedValidation.marketingAccepted !== undefined) {
              setMarketingAccepted(parsedValidation.marketingAccepted);
              // Update HubSpot contact with initial marketing status
              const contactId = sessionStorage.getItem('hubspot_contact_id');
              if (contactId) {
                fetch('/.netlify/functions/hubspot-integration/contact', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    contactId,
                    arbeitsrecht_marketing_status:
                      parsedValidation.marketingAccepted,
                  }),
                }).catch((error) => {
                  console.error(
                    'Error updating HubSpot marketing status:',
                    error
                  );
                });
              }
            }
          }
        } catch (error) {
          console.error('Error accessing/parsing localStorage:', error);
        }

        // Validate terms if previously accepted
        if ((termsAccepted && privacyAccepted) || phase1TermsValid) {
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
            _timestamp: Date.now(),
          });

          if (phase1TermsValid) {
            setTermsAccepted(true);
            setPrivacyAccepted(true);
          }
        }

        setMounted(true);
      } catch (error) {
        console.error('Error initializing agreement page:', error);
        // Redirect to trip experience page if evaluation not found or rejected
        router.push('/trip-experience');
      }
    };

    initializeState();
  }, [isClient, mounted]);

  // Separate useEffect for signature restoration to ensure SignaturePad is mounted
  useEffect(() => {
    if (!isClient || !mounted || !signatureRef.current) return;

    try {
      const storedSignature = store.signature;
      if (storedSignature) {
        // Restore the signature to the pad
        signatureRef.current.fromDataURL(storedSignature);
        setHasSignature(true);
        validateSignature();
        setHasInteractedWithSignature(true);

        // Update validation state
        store.updateValidationState({
          ...store.validationState,
          isSignatureValid: true,
          _timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error('Error restoring signature:', error);
    }
  }, [isClient, mounted, store.signature]);

  // Remove redundant effects
  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

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
        setFormErrors(
          (prev: FormErrors): FormErrors => ({ ...prev, signature: [] })
        );
      } else {
        setSignature('');
        setHasSignature(false);
        if (hasInteractedWithSignature) {
          setFormErrors(
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
      setFormErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          signature: [],
        })
      );
    }
  };

  const handleTermsChange = (field: string) => (checked: boolean) => {
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
        // Update HubSpot contact with marketing status
        const contactId = sessionStorage.getItem('hubspot_contact_id');
        if (contactId) {
          fetch('/.netlify/functions/hubspot-integration/contact', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contactId,
              arbeitsrecht_marketing_status: checked,
            }),
          }).catch((error) => {
            console.error('Error updating HubSpot marketing status:', error);
          });
        }
        break;
    }

    const validationResult = {
      isValid: newTermsAccepted && newPrivacyAccepted,
    };

    // Update validation state for step 2 (agreement page uses step 2 instead of 4)
    updateValidationState({
      ...validationState,
      stepValidation: {
        ...validationState.stepValidation,
        2: validationResult.isValid,
      },
      stepInteraction: {
        ...validationState.stepInteraction,
        2: true,
      },
      isTermsValid: validationResult.isValid,
      _timestamp: Date.now(),
    });

    // Set interacted steps
    setInteractedSteps((prev) => [...new Set([...prev, 2])]);
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

    return signatureValid && termsValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Get personal details from store
      const personalDetails = useStore.getState().personalDetails;

      // Try to get booking number from phase 3 state if not provided
      let finalBookingNumber = bookingNumber;
      try {
        if (!finalBookingNumber) {
          const phase3State = localStorage.getItem('phase3State');
          if (phase3State) {
            const parsedState = JSON.parse(phase3State);
            finalBookingNumber = parsedState.bookingNumber;
          }
        }
      } catch (error) {
        console.error(
          'Error getting booking number from phase 3 state:',
          error
        );
      }

      // Validate booking number
      if (
        !finalBookingNumber ||
        finalBookingNumber.trim().length < 6 ||
        !/^[A-Z0-9]+$/i.test(finalBookingNumber.trim())
      ) {
        setFormErrors((prev) => ({
          ...prev,
          submit: ['Please enter a valid booking number'],
        }));
        return;
      }

      // Submit the order
      if (!personalDetails) {
        throw new Error('Personal details are required');
      }

      const orderResult = await ClaimService.orderClaim(
        originalFlights,
        phase4SelectedFlights,
        travelStatusAnswers,
        informedDateAnswers,
        personalDetails,
        finalBookingNumber,
        signatureRef.current?.toDataURL() || '',
        termsAccepted,
        privacyAccepted
      );

      // Log the order result for debugging
      console.log('=== Order Result ===', {
        orderResult,
        timestamp: new Date().toISOString(),
      });

      if (orderResult.data?.guid) {
        // Navigate to success page with claim ID
        router.push(
          `/${lang}/phases/claim-submitted?claim_id=${orderResult.data.guid}`
        );
      } else if (orderResult.error?.includes('evaluated as reject')) {
        // If the claim was rejected, redirect to rejection page
        router.push(`/${lang}/phases/claim-rejected`);
      } else {
        // For other errors, show the error message
        setFormErrors((prev) => ({
          ...prev,
          submit: [
            orderResult.message ||
              orderResult.error ||
              'Failed to submit claim',
          ],
        }));
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      setFormErrors((prev) => ({
        ...prev,
        submit: [error instanceof Error ? error.message : 'An error occurred'],
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add back navigation handler
  const handleBack = () => {
    if (isSubmitting) return;

    // Get URL parameters to preserve them
    const searchParams = new URLSearchParams(window.location.search);
    const amount = searchParams.get('amount');
    const provision = searchParams.get('provision');

    // Construct URL parameters
    const params = new URLSearchParams();
    params.set('redirected', 'true');
    if (amount) params.set('amount', amount);
    if (provision) params.set('provision', provision);

    // Navigate to claim success page
    router.push(`/${lang}/phases/claim-success?${params.toString()}`);
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

  // Add effect to handle step opening behavior
  useEffect(() => {
    if (mounted && validationState.isSignatureValid) {
      setOpenSteps((prev) => {
        if (!prev.includes('terms-and-conditions')) {
          return [...prev, 'terms-and-conditions'];
        }
        return prev;
      });
    }
  }, [mounted, validationState.isSignatureValid]);

  const handleContinue = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const compensationAmount = useStore.getState().compensationAmount || 0;
      const dealId = sessionStorage.getItem('hubspot_deal_id');
      const contactId = sessionStorage.getItem('hubspot_contact_id');
      const personalDetails = useStore.getState().personalDetails;
      const marketingAccepted = useStore.getState().marketingAccepted;

      if (!contactId) {
        throw new Error('Contact ID is required');
      }

      if (!personalDetails) {
        throw new Error('Personal details are required');
      }

      // First update the contact information
      console.log('Updating HubSpot contact:', {
        contactId,
        personalDetails,
        marketingAccepted,
        timestamp: new Date().toISOString(),
      });

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
        const errorText = await contactResponse.text();
        console.error('Failed to update HubSpot contact:', errorText);
        throw new Error(`Failed to update contact: ${errorText}`);
      }

      // Then update the deal if we have one
      if (dealId) {
        console.log('Updating HubSpot deal:', {
          dealId,
          contactId,
          amount: compensationAmount,
          stage: 'closedwon',
          marketingStatus: marketingAccepted,
          timestamp: new Date().toISOString(),
        });

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
              marketingStatus: marketingAccepted,
            }),
          }
        );

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text();
          console.error('Failed to update deal:', errorText);
          throw new Error(`Failed to update deal: ${errorText}`);
        }

        const updateResult = await updateResponse.json();
        console.log('Successfully updated HubSpot deal:', updateResult);
      }

      // Try to get booking number from phase 3 state if not provided
      let finalBookingNumber = bookingNumber;
      try {
        if (!finalBookingNumber) {
          const phase3State = localStorage.getItem('phase3State');
          if (phase3State) {
            const parsedState = JSON.parse(phase3State);
            finalBookingNumber = parsedState.bookingNumber;
          }
        }
      } catch (error) {
        console.error(
          'Error getting booking number from phase 3 state:',
          error
        );
      }

      // Validate booking number
      if (
        !finalBookingNumber ||
        finalBookingNumber.trim().length < 6 ||
        !/^[A-Z0-9]+$/i.test(finalBookingNumber.trim())
      ) {
        setFormErrors((prev) => ({
          ...prev,
          submit: ['Please enter a valid booking number'],
        }));
        return;
      }

      // Submit the order
      const orderResult = await ClaimService.orderClaim(
        originalFlights,
        phase4SelectedFlights,
        travelStatusAnswers,
        informedDateAnswers,
        personalDetails,
        finalBookingNumber,
        signatureRef.current?.toDataURL() || '',
        termsAccepted,
        privacyAccepted,
        marketingAccepted
      );

      // Log the order result for debugging
      console.log('=== Order Result ===', {
        orderResult,
        timestamp: new Date().toISOString(),
      });

      if (orderResult.data?.guid) {
        // Navigate to success page with claim ID
        router.push(
          `/${lang}/phases/claim-submitted?claim_id=${orderResult.data.guid}`
        );
      } else if (orderResult.error?.includes('evaluated as reject')) {
        // If the claim was rejected, redirect to rejection page
        router.push(`/${lang}/phases/claim-rejected`);
      } else {
        // For other errors, show the error message
        setFormErrors((prev) => ({
          ...prev,
          submit: [
            orderResult.message ||
              orderResult.error ||
              'Failed to submit claim',
          ],
        }));
      }
    } catch (error) {
      console.error('Error submitting claim:', error);
      setFormErrors((prev) => ({
        ...prev,
        submit: [error instanceof Error ? error.message : 'An error occurred'],
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isClient) {
    return null; // or a loading state
  }

  return (
    <PhaseGuard phase={6} allowDevAccess>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={6} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <div className="mt-4 sm:mt-8 mb-8">
            <SpeechBubble
              message={t.phases.agreement.message
                .replace(
                  '{salutation}',
                  personalDetails?.salutation === 'herr'
                    ? t.salutation.mr
                    : t.salutation.mrs
                )
                .replace('{firstName}', personalDetails?.firstName ?? '')
                .replace('{lastName}', personalDetails?.lastName ?? '')
                .replace('{address}', personalDetails?.address ?? '')
                .replace('{postalCode}', personalDetails?.postalCode ?? '')
                .replace('{city}', personalDetails?.city ?? '')
                .replace('{country}', personalDetails?.country ?? '')
                .replace('{bookingNumber}', bookingNumber ?? '')
                .replace(
                  '{departure}',
                  selectedFlights[0]?.departure ||
                    selectedFlights[0]?.departureAirport ||
                    selectedFlights[0]?.departureCity ||
                    ''
                )
                .replace(
                  '{connection}',
                  selectedFlights.length > 1
                    ? ` via ${selectedFlights[1]?.departure || selectedFlights[1]?.departureAirport || selectedFlights[1]?.departureCity || ''}`
                    : ''
                )
                .replace(
                  '{arrival}',
                  selectedFlights[selectedFlights.length - 1]?.arrival ||
                    selectedFlights[selectedFlights.length - 1]
                      ?.arrivalAirport ||
                    selectedFlights[selectedFlights.length - 1]?.arrivalCity ||
                    ''
                )
                .replace(
                  '{date}',
                  selectedFlights[0]?.date
                    ? new Date(
                        selectedFlights[0].date.split('T')[0]
                      ).toLocaleDateString(
                        t.lang === 'en' ? 'en-US' : 'de-DE',
                        {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        }
                      )
                    : selectedFlights[0]?.departureTime
                      ? new Date(
                          selectedFlights[0].departureTime.split(' ')[0]
                        ).toLocaleDateString(
                          t.lang === 'en' ? 'en-US' : 'de-DE',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )
                      : ''
                )}
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinue();
            }}
            className="space-y-6"
          >
            <AccordionCard
              title={t.phases.agreement.digitalSignature.title}
              subtitle={t.phases.agreement.digitalSignature.subtitle}
              eyebrow={t.phases.agreement.step.replace('{number}', '1')}
              isCompleted={validationState.isSignatureValid}
              hasInteracted={hasInteractedWithSignature}
              className={accordionConfig.padding.wrapper}
              stepId="digital-signature"
              isOpenByDefault={!validationState.isSignatureValid}
              shouldStayOpen={false}
              summary={t.phases.agreement.digitalSignature.summary}
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
                      setFormErrors(
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
                      {t.phases.agreement.digitalSignature.clearSignature}
                    </button>
                  </div>
                  {formErrors.signature && (
                    <p className="mt-2 text-sm text-[#F54538]">
                      {formErrors.signature[0]}
                    </p>
                  )}
                </div>
              </div>
            </AccordionCard>

            <AccordionCard
              title={t.phases.agreement.termsAndConditions.title}
              subtitle={t.phases.agreement.termsAndConditions.subtitle}
              eyebrow={t.phases.agreement.step.replace('{number}', '2')}
              isCompleted={validationState[2] || false}
              hasInteracted={Object.keys(formErrors).length > 0}
              className={accordionConfig.padding.wrapper}
              stepId="terms-and-conditions"
              isOpenByDefault={!validationState[2]}
              shouldStayOpen={false}
              summary={t.phases.agreement.termsAndConditions.summary}
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
                    label={t.phases.agreement.termsAndConditions.terms}
                    checked={formData.hasAcceptedTerms}
                    onChange={handleTermsChange('hasAcceptedTerms')}
                    required
                  />
                  <ConsentCheckbox
                    id="privacy"
                    type="privacy"
                    label={t.phases.agreement.termsAndConditions.privacy}
                    checked={formData.hasAcceptedPrivacy}
                    onChange={handleTermsChange('hasAcceptedPrivacy')}
                    required
                  />
                  <ConsentCheckbox
                    id="marketing"
                    type="marketing"
                    label={t.phases.agreement.termsAndConditions.marketing}
                    checked={formData.hasAcceptedMarketing}
                    onChange={handleTermsChange('hasAcceptedMarketing')}
                    details={
                      t.phases.agreement.termsAndConditions.marketingDetails
                    }
                    required={false}
                  />
                </div>
              </div>
            </AccordionCard>

            <FormError errors={formErrors.submit} />
          </form>

          <div className="mt-8 flex flex-col sm:flex-row justify-between gap-4">
            <BackButton
              onClick={handleBack}
              text={t.phases.agreement.navigation.back}
            />
            <ContinueButton
              onClick={handleContinue}
              disabled={!canSubmit() || isSubmitting}
              isLoading={isSubmitting}
              text={t.phases.agreement.submit}
            />
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
