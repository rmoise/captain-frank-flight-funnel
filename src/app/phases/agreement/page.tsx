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
import { useTranslation } from '@/hooks/useTranslation';
import { Flight } from '@/types/store';
import { usePhase4Store } from '@/lib/state/phase4Store';

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
  const { hideLoading } = useLoading();
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
    originalFlights,
    setOriginalFlights,
  } = useStore();
  const { t, lang } = useTranslation();
  const {
    travelStatusAnswers,
    selectedFlights: phase4SelectedFlights,
    informedDateAnswers,
  } = usePhase4Store();

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
  });
  const [hasInteractedWithSignature, setHasInteractedWithSignature] =
    useState(false);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

          // Get wizard answers from phase 4 store
          const phase4Store = usePhase4Store.getState();
          console.log('Agreement Page - Phase4Store state:', {
            travelStatusAnswers: phase4Store.travelStatusAnswers,
            informedDateAnswers: phase4Store.informedDateAnswers,
            originalFlights: phase4Store.originalFlights,
          });

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
    travelStatusAnswers,
  ]);

  // Add effect to check Phase4Store state when mounted
  useEffect(() => {
    if (mounted) {
      const phase4Store = usePhase4Store.getState();
      console.log('Agreement Page - Checking Phase4Store state:', {
        travelStatusAnswers: phase4Store.travelStatusAnswers,
        informedDateAnswers: phase4Store.informedDateAnswers,
        originalFlights: phase4Store.originalFlights,
      });

      // If we don't have informed date answers, redirect back to trip experience
      if (!phase4Store.informedDateAnswers?.length) {
        console.error('No informed date answers found, redirecting...');
        router.push('/phases/trip-experience');
        return;
      }
    }
  }, [mounted, router]);

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
      phases.forEach((phase) => completePhase(phase));

      // Set current phase
      const phase = parseInt(currentPhaseStr, 10);
      setCurrentPhase(phase);

      // Validate personal details
      const isValid = useStore.getState().validatePersonalDetails();

      if (isValid) {
        const store = useStore.getState();
        store.updateValidationState({
          isPersonalValid: true,
          stepValidation: {
            1: true,
            2: true,
            3: true,
            4: true,
            5: true,
          },
        });
      }
    }
  }, [completePhase, setCurrentPhase, personalDetails]);

  // Add effect to check flight details and validate personal details on mount
  useEffect(() => {
    if (mounted) {
      // Validate personal details
      const isValid = useStore.getState().validatePersonalDetails();

      if (isValid) {
        const store = useStore.getState();
        store.updateValidationState({
          isPersonalValid: true,
          stepValidation: {
            1: true,
            2: true,
            3: true,
            4: true,
            5: true,
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

  // Add useEffect to check flight data on mount
  useEffect(() => {
    console.log('Agreement Page - Checking flight data:', {
      originalFlights,
      selectedFlights,
      travelStatus: travelStatusAnswers.find(
        (a) => a.questionId === 'travel_status'
      )?.value,
    });

    // If no original flights, try to get them from the store
    if (!originalFlights?.length) {
      const mainStoreFlights = useStore.getState().selectedFlights as Flight[];
      if (mainStoreFlights?.length) {
        console.log(
          'Found flights in main store, setting original flights:',
          mainStoreFlights
        );
        setOriginalFlights(mainStoreFlights);
      }
    }
  }, []);

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

  const handleTermsChange =
    (field: keyof FormData) =>
    (checked: boolean): void => {
      const updatedFormData = {
        ...formData,
        [field]: checked,
      };
      setFormData(updatedFormData);
      setFormErrors(
        (prev: FormErrors): FormErrors => ({ ...prev, [field]: [] })
      );

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

    return signatureValid && termsValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validate form data with rules
      const validationErrors = validateForm(
        formData,
        validationRules as ValidationRules
      );
      if (Object.keys(validationErrors).length > 0) {
        setFormErrors((prev) => ({
          ...prev,
          ...validationErrors,
        }));
        hideLoading();
        return;
      }

      // Clear any previous errors
      setFormErrors((prev) => ({
        ...prev,
        submit: [],
      }));

      // Log current state before processing
      console.log('Agreement Page - Submit - Current State:', {
        originalFlights,
        selectedFlights,
        wizardAnswers: useStore.getState().wizardAnswers,
      });

      // Get flight IDs from originalFlights for booked flights
      const flightIdsAsStrings =
        originalFlights
          ?.filter((flight) => flight && flight.id)
          .map((flight) => String(flight.id)) || [];

      // If no flights in originalFlights, try to get them from the store
      if (!flightIdsAsStrings.length) {
        const mainStoreFlights = useStore.getState()
          .selectedFlights as Flight[];
        if (mainStoreFlights?.length) {
          console.log(
            'No flights in originalFlights, using main store flights:',
            mainStoreFlights
          );
          const mainStoreFlightIds = mainStoreFlights
            .filter((flight: Flight) => flight && flight.id)
            .map((flight: Flight) => String(flight.id));
          if (mainStoreFlightIds.length) {
            console.log('Using main store flight IDs:', mainStoreFlightIds);
            flightIdsAsStrings.push(...mainStoreFlightIds);
          }
        }
      }

      // Get travel status from phase4Store
      const travelStatus = travelStatusAnswers.find(
        (a) => a.questionId === 'travel_status'
      )?.value;

      console.log('Travel Status Check:', {
        travelStatusAnswers,
        travelStatus,
      });

      if (!travelStatus) {
        setFormErrors((prev) => ({
          ...prev,
          submit: [
            'Travel status not found. Please go back and select your travel status.',
          ],
        }));
        hideLoading();
        return;
      }

      // Set journey_fact_flightids based on travel status
      const journey_fact_flightids_strings = (() => {
        if (travelStatus === 'none') {
          return [];
        } else if (travelStatus === 'self') {
          return flightIdsAsStrings; // Use original flights if they took those
        } else if (
          travelStatus === 'provided' ||
          travelStatus === 'took_alternative_own'
        ) {
          // For provided or alternative flights, use selected flights from phase4Store
          const alternativeFlights = phase4SelectedFlights
            .filter((flight) => flight && flight.id)
            .map((flight) => String(flight.id));

          // Validate that we have alternative flights when needed
          if (!alternativeFlights.length) {
            throw new Error(
              'No alternative flights found. Please go back and select your alternative flights.'
            );
          }

          return alternativeFlights;
        }
        return [];
      })();

      // Map travel status to journey_fact_type
      const journey_fact_type = (() => {
        switch (travelStatus) {
          case 'none':
            return 'none';
          case 'self':
            return 'self';
          case 'provided':
            return 'provided';
          case 'took_alternative_own':
            return 'self'; // Treat own alternative as self-travel
          default:
            return 'none';
        }
      })();

      const informedDate = informedDateAnswers.find(
        (a) => a.questionId === 'informed_date'
      )?.value;

      const specificDate = informedDateAnswers.find(
        (a) => a.questionId === 'specific_informed_date'
      )?.value;

      console.log('Date validation check:', {
        informedDate,
        specificDate,
        informedDateAnswers,
        selectedFlights,
      });

      // Format the date for the API
      const formattedDate = (() => {
        // First try to get the specific date if provided
        if (
          informedDate === 'specific_date' &&
          typeof specificDate === 'string' &&
          specificDate.trim()
        ) {
          try {
            // Ensure date is in YYYY-MM-DD format
            const dateMatch = specificDate.match(
              /^(\d{4})-(\d{1,2})-(\d{1,2})$/
            );
            if (dateMatch) {
              const [, year, month, day] = dateMatch;
              const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              console.log('Using specific informed date:', formattedDate);
              return formattedDate;
            }
          } catch (e) {
            console.error('Error parsing specific date:', e);
          }
        }

        // Then try to use flight date if informed on departure
        if (informedDate === 'on_departure' && originalFlights[0]) {
          const flightDate = originalFlights[0].date;
          if (flightDate) {
            try {
              // Ensure flight date is in YYYY-MM-DD format
              const dateMatch = flightDate.match(
                /^(\d{4})-(\d{1,2})-(\d{1,2})$/
              );
              if (dateMatch) {
                const [, year, month, day] = dateMatch;
                const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                console.log('Using departure date:', formattedDate);
                return formattedDate;
              }
            } catch (e) {
              console.error('Error parsing flight date:', e);
            }
          }
        }

        console.error('Date validation failed:', {
          informedDate,
          specificDate,
          flightDate: originalFlights[0]?.date,
          departureTime: originalFlights[0]?.departureTime,
        });

        throw new Error(
          'Bitte geben Sie das Datum an, an dem Sie über die Verspätung/Annullierung informiert wurden.'
        );
      })();

      // Create the evaluation data - only include required fields from API documentation
      const evaluationData = {
        journey_booked_flightids: flightIdsAsStrings,
        journey_fact_flightids: journey_fact_flightids_strings,
        information_received_at: formattedDate,
        journey_fact_type,
      };

      // Log the evaluation data before making the API call
      console.log('Evaluation Data:', evaluationData);

      const evaluationResult = await api.evaluateClaim(evaluationData);

      if (evaluationResult.data?.status !== 'accept') {
        // Get rejection reasons if available
        const rejectionReasons = evaluationResult.data?.rejection_reasons;
        const errorMessages = rejectionReasons
          ? Object.values(rejectionReasons)
          : ['Antragsüberprüfung wurde abgelehnt'];

        setFormErrors(
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
      const bookingNumber = useStore.getState().bookingNumber;

      // Validate booking number before proceeding
      if (
        !bookingNumber ||
        bookingNumber.trim().length < 6 ||
        !/^[A-Z0-9]+$/i.test(bookingNumber.trim())
      ) {
        setFormErrors(
          (prev: FormErrors): FormErrors => ({
            ...prev,
            submit: ['Bitte geben Sie eine gültige Buchungsnummer ein.'],
          })
        );
        hideLoading();
        return;
      }

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

      // Map salutation to backend format
      const mapSalutationToBackend = (salutation: string): 'herr' | 'frau' => {
        console.log('Mapping salutation:', salutation);
        switch (salutation.toLowerCase()) {
          case 'mr':
          case 'herr':
            return 'herr';
          case 'mrs':
          case 'ms':
          case 'frau':
            return 'frau';
          default:
            console.warn(
              'Unknown salutation:',
              salutation,
              'defaulting to herr'
            );
            return 'herr';
        }
      };

      const orderRequestData: OrderClaimRequest = {
        journey_booked_flightids: flightIdsAsStrings,
        journey_fact_flightids: journey_fact_flightids_strings,
        journey_fact_type,
        information_received_at: formattedDate,
        journey_booked_pnr: bookingNumber.trim(),
        owner_salutation: mapSalutationToBackend(formDataValues.salutation),
        owner_firstname:
          personalDetails?.firstName || formDataValues.firstName || '',
        owner_lastname:
          personalDetails?.lastName || formDataValues.lastName || '',
        owner_street: personalDetails?.address || formDataValues.street || '',
        owner_place:
          personalDetails?.postalCode || formDataValues.postalCode || '',
        owner_city: personalDetails?.city || formDataValues.city || '',
        owner_zip:
          personalDetails?.postalCode || formDataValues.postalCode || '',
        owner_country: personalDetails?.country || formDataValues.country || '',
        owner_email: personalDetails?.email || formDataValues.email || '',
        owner_phone: personalDetails?.phone || formDataValues.phone || '',
        owner_marketable_status: true,
        contract_signature: signatureRef.current?.toDataURL() || '',
        contract_tac: true,
        contract_dp: true,
      };

      console.log('Submitting order request:', {
        ...orderRequestData,
        contract_signature: orderRequestData.contract_signature
          ? '[SIGNATURE_DATA]'
          : null,
      });

      // Submit the order
      const response = await api.orderClaim(orderRequestData);
      console.log('Order response:', {
        status: response.status,
        data: response.data,
        message: response.message,
      });

      hideLoading(); // Hide loading before redirect

      if (response.data?.guid && response.data?.recommendation_guid) {
        const currentPath = window.location.pathname;
        const isGermanRoute = currentPath.startsWith('/de/');
        const langPrefix = isGermanRoute ? '/de' : '';
        router.push(`${langPrefix}/phases/claim-submitted`);
      } else {
        throw new Error('Antrag konnte nicht eingereicht werden');
      }
    } catch (error) {
      const err = error as Error;
      console.error('Submission error:', {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });

      // Get a user-friendly error message
      let errorMessage =
        'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';

      if (err instanceof Error) {
        if (err.message.includes('journey_fact_type')) {
          errorMessage =
            'Ungültiger Reisestatus. Bitte gehe zurück und wähle deinen Reisestatus erneut.';
        } else if (err.message.includes('Missing required fields')) {
          errorMessage = 'Bitte fülle alle erforderlichen Felder aus.';
        } else if (err.message.includes('Invalid request data')) {
          errorMessage =
            'Ungültige Eingabedaten. Bitte überprüfe deine Eingaben.';
        } else if (err.message.includes('Internal server error')) {
          errorMessage =
            'Ein Serverfehler ist aufgetreten. Bitte versuche es später erneut.';
        } else if (err.message) {
          // Use the error message if it's in German, otherwise use the default
          errorMessage =
            err.message.includes('Ein') || err.message.includes('Bitte')
              ? err.message
              : 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.';
        }
      }

      setFormErrors(
        (prev: FormErrors): FormErrors => ({
          ...prev,
          submit: [errorMessage],
        })
      );
      hideLoading(); // Hide loading on error
    } finally {
      setIsSubmitting(false);
    }
  };

  // Add back navigation handler
  const handleBack = () => {
    if (isSubmitting) return;

    // Get the current URL
    const currentUrl = window.location.pathname;
    // If we're already being redirected to claim-submitted, go to claim-success
    if (currentUrl.includes('claim-submitted')) {
      router.replace(`/${lang}/phases/claim-success`);
      return;
    }

    // Normal back navigation
    router.replace(`/${lang}/phases/claim-success`);
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

  /* eslint-enable @typescript-eslint/no-unused-vars */

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

          <form onSubmit={handleSubmit} className="space-y-6">
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
              onClick={handleSubmit}
              disabled={!canSubmit()}
              text={t.phases.agreement.submit}
            />
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}
