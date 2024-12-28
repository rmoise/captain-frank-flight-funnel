'use client';

import React, { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { RootState } from '@/store';
import { setPersonalDetails } from '@/store/slices/bookingSlice';
import {
  completeStep,
  completePhase,
  setCurrentPhase,
} from '@/store/slices/progressSlice';
import type { PassengerDetails } from '@/types/store';
import { SpeechBubble } from '@/components/SpeechBubble';
import { PhaseNavigation } from '@/components/PhaseNavigation';
import { PhaseGuard } from '@/components/shared/PhaseGuard';
import { AccordionCard } from '@/components/shared/AccordionCard';
import { PersonalDetailsForm } from '@/components/forms/PersonalDetailsForm';
import { accordionConfig } from '@/config/accordion';
import { store } from '@/store';

export default function ClaimSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { completedSteps, completedPhases } = useAppSelector(
    (state: RootState) => state.progress
  );
  const [isFormValid, setIsFormValid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [claimDetails, setClaimDetails] = React.useState({
    amount: 0,
    currency: 'EUR',
    provision: '',
    bookingReference: '',
    departureAirport: '',
    arrivalAirport: '',
    scheduledDepartureTime: '',
  });

  React.useEffect(() => {
    const initializeFromUrl = () => {
      try {
        if (!searchParams) {
          setError('Unable to access URL parameters');
          return;
        }

        // First try to get data from the details parameter
        const details = searchParams.get('details');
        if (details) {
          const parsedDetails = JSON.parse(decodeURIComponent(details));
          setClaimDetails((prev) => ({
            ...prev,
            amount: parsedDetails.amount || 600,
            currency: parsedDetails.currency || 'EUR',
            provision: parsedDetails.provision || '30%',
            bookingReference: parsedDetails.bookingReference || '',
            departureAirport: parsedDetails.departureAirport || '',
            arrivalAirport: parsedDetails.arrivalAirport || '',
            scheduledDepartureTime: parsedDetails.scheduledDepartureTime || '',
          }));
          return;
        }

        // If no details parameter, try individual parameters
        const amount = searchParams.get('amount');
        const currency = searchParams.get('currency');
        const bookingRef = searchParams.get('bookingRef');
        const depAirport = searchParams.get('depAirport');
        const arrAirport = searchParams.get('arrAirport');
        const depTime = searchParams.get('depTime');

        // If we have URL params, use them
        if (amount && currency) {
          setClaimDetails((prev) => ({
            ...prev,
            amount: parseInt(amount, 10),
            currency: currency,
            provision: searchParams.get('provision') || '30%',
            bookingReference: bookingRef || '',
            departureAirport: depAirport || '',
            arrivalAirport: arrAirport || '',
            scheduledDepartureTime: depTime || '',
          }));
          return;
        }

        // If we get here, we don't have enough data
        setError('Missing required claim details');
      } catch (error) {
        console.error('Error initializing from URL:', error);
        setError('Failed to load claim details');
      }
    };

    initializeFromUrl();
  }, [searchParams]);

  React.useEffect(() => {
    // Set current phase to 5
    dispatch(setCurrentPhase(5));
    localStorage.setItem('currentPhase', '5');

    // Ensure previous phases are completed
    [1, 2, 3, 4].forEach((phase) => {
      dispatch(completePhase(phase));
    });

    // Save completed phases
    const updatedCompletedPhases = [1, 2, 3, 4];
    localStorage.setItem(
      'completedPhases',
      JSON.stringify(updatedCompletedPhases)
    );

    // Restore saved state in order of priority: bookingState > individual states
    const savedBookingState = localStorage.getItem('bookingState');
    const savedWizardAnswers = localStorage.getItem('wizardAnswers');
    const savedPersonalDetails = localStorage.getItem('personalDetails');
    const savedSelectedFlights = localStorage.getItem('selectedFlights');

    // First try to restore from bookingState
    if (savedBookingState) {
      try {
        const parsedState = JSON.parse(savedBookingState);
        // Keep existing state in localStorage but update phase info
        localStorage.setItem(
          'bookingState',
          JSON.stringify({
            ...parsedState,
            currentPhase: 5,
            completedPhases: updatedCompletedPhases,
          })
        );
      } catch (error) {
        console.error('Error parsing saved booking state:', error);
      }
    }

    // Then try to restore from individual states if needed
    if (!savedBookingState) {
      if (savedWizardAnswers) {
        try {
          const answers = JSON.parse(savedWizardAnswers);
          localStorage.setItem('wizardAnswers', JSON.stringify(answers));
        } catch (error) {
          console.error('Error parsing saved wizard answers:', error);
        }
      }

      if (savedPersonalDetails) {
        try {
          const details = JSON.parse(savedPersonalDetails);
          localStorage.setItem('personalDetails', JSON.stringify(details));
        } catch (error) {
          console.error('Error parsing saved personal details:', error);
        }
      }

      if (savedSelectedFlights) {
        try {
          const flights = JSON.parse(savedSelectedFlights);
          localStorage.setItem('selectedFlights', JSON.stringify(flights));
        } catch (error) {
          console.error('Error parsing saved selected flights:', error);
        }
      }
    }
  }, [dispatch]);

  React.useEffect(() => {
    // Load and validate personal details
    const loadPersonalDetails = () => {
      const savedPersonalDetails = localStorage.getItem('personalDetails');
      console.log('Raw saved personal details:', savedPersonalDetails);

      if (savedPersonalDetails && savedPersonalDetails !== 'null') {
        try {
          const details = JSON.parse(savedPersonalDetails);
          if (details) {
            // Format the fields before setting
            const formattedDetails = {
              salutation: details.salutation?.toString().trim() || '',
              firstName: details.firstName?.toString().trim() || '',
              lastName: details.lastName?.toString().trim() || '',
              email: details.email?.toString().trim() || '',
              phone: details.phone?.toString().trim() || '',
              address: details.address?.toString().trim() || '',
              zipCode: details.zipCode?.toString().trim() || '',
              city: details.city?.toString().trim() || '',
              country: details.country?.toString().trim() || '',
            };

            // Validate all required fields
            const hasValidEmail =
              formattedDetails.email &&
              /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(
                formattedDetails.email
              );
            const isValid = !!(
              formattedDetails.firstName &&
              formattedDetails.lastName &&
              hasValidEmail &&
              formattedDetails.salutation &&
              formattedDetails.phone &&
              formattedDetails.address &&
              formattedDetails.zipCode &&
              formattedDetails.city &&
              formattedDetails.country
            );

            // Set in Redux
            dispatch(setPersonalDetails(formattedDetails));

            // Update form validity
            setIsFormValid(isValid);
            if (isValid) {
              dispatch(completeStep(1));
            }

            // Save back to localStorage to ensure consistent format
            localStorage.setItem(
              'personalDetails',
              JSON.stringify(formattedDetails)
            );
            console.log('Personal details loaded and saved successfully');
          }
        } catch (error) {
          console.error('Error parsing personal details:', error);
        }
      }
    };

    loadPersonalDetails();
  }, [dispatch]);

  const handlePersonalDetailsComplete = (details: PassengerDetails | null) => {
    if (!details) {
      setIsFormValid(false);
      return;
    }

    const hasValidEmail =
      details.email &&
      /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(details.email);

    const isValid = !!(
      details.firstName?.trim() &&
      details.lastName?.trim() &&
      hasValidEmail &&
      details.salutation?.trim() &&
      details.phone?.trim() &&
      details.address?.trim() &&
      details.zipCode?.trim() &&
      details.city?.trim() &&
      details.country?.trim()
    );

    console.log('\n=== Claim Success Form Validation ===');
    console.log('Values:', {
      firstName: details.firstName?.trim(),
      lastName: details.lastName?.trim(),
      email: details.email,
      salutation: details.salutation?.trim(),
      phone: details.phone?.trim(),
      address: details.address?.trim(),
      zipCode: details.zipCode?.trim(),
      city: details.city?.trim(),
      country: details.country?.trim(),
    });
    console.log('hasValidEmail:', hasValidEmail);
    console.log('isValid:', isValid);

    setIsFormValid(isValid);
    if (isValid) {
      dispatch(setPersonalDetails(details));
      dispatch(completeStep(1));
    }
    console.log('=== End Claim Success Form Validation ===\n');
  };

  const formatAmount = (amount: number, currency: string) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return `${amount} ${currency}`;
    }
  };

  const handleContinue = useCallback(async () => {
    try {
      // Get all necessary state from Redux
      const state = store.getState();
      const {
        booking: {
          wizardAnswers,
          personalDetails,
          selectedFlight,
          fromLocation,
          toLocation,
          bookingNumber,
          termsAccepted,
          privacyAccepted,
          marketingAccepted,
        },
        progress: { completedPhases, completedSteps },
      } = state;

      // Save current state before proceeding
      const currentState = {
        wizardAnswers,
        personalDetails,
        selectedFlight,
        fromLocation,
        toLocation,
        bookingNumber,
        termsAccepted,
        privacyAccepted,
        marketingAccepted,
        completedPhases: [...completedPhases, 5], // Add current phase
        completedSteps: [...completedSteps, 1], // Add current step
        currentPhase: 6,
      };

      // Save all state to localStorage
      localStorage.setItem('bookingState', JSON.stringify(currentState));
      localStorage.setItem('currentPhase', '6');
      localStorage.setItem(
        'completedPhases',
        JSON.stringify([...completedPhases, 5])
      );
      localStorage.setItem(
        'completedSteps',
        JSON.stringify([...completedSteps, 1])
      );
      localStorage.setItem('wizardAnswers', JSON.stringify(wizardAnswers));
      localStorage.setItem('personalDetails', JSON.stringify(personalDetails));
      if (selectedFlight) {
        localStorage.setItem(
          'selectedFlights',
          JSON.stringify([selectedFlight])
        );
      }

      // Update Redux state
      dispatch(setCurrentPhase(6));
      dispatch(completePhase(5));
      dispatch(completeStep(1));

      // Navigate to agreement page
      await router.push('/phases/agreement');
    } catch (error) {
      console.error('Error during continue:', error);
    }
  }, [dispatch, router]);

  return (
    <PhaseGuard phase={5}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <PhaseNavigation currentPhase={5} completedPhases={completedPhases} />
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          {error ? (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{error}</p>
              <button
                onClick={() => router.back()}
                className="mt-4 px-6 py-2 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
              >
                Go Back
              </button>
            </div>
          ) : (
            <>
              <div className="mt-4 sm:mt-8 mb-8">
                <SpeechBubble message="Congratulations! Now that you have completed your case, we can calculate your potential claim (minus 30% success fee)" />
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">
                    Estimated Compensation
                  </h2>
                  <div className="text-2xl font-bold text-[#F54538]">
                    {formatAmount(claimDetails.amount, claimDetails.currency)}
                  </div>
                  <p className="text-gray-600 mt-2">
                    Final amount will be determined after reviewing your
                    complete case details.
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-semibold mb-4">Next Steps</h2>
                  <div className="text-left space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                        1
                      </div>
                      <p className="text-gray-700">
                        Complete your personal details
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                        2
                      </div>
                      <p className="text-gray-700">
                        Sign the order form (fees apply only if successful)
                      </p>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                        3
                      </div>
                      <p className="text-gray-700">
                        We&apos;ll handle your claim with the airline
                      </p>
                    </div>
                  </div>
                </div>

                <AccordionCard
                  title="Personal Details"
                  isCompleted={completedSteps.includes(1)}
                  eyebrow="Step 1"
                  hasInteracted={completedSteps.includes(1)}
                  className={accordionConfig.padding.wrapper}
                  shouldStayOpen={false}
                  isOpenByDefault={true}
                  summary="Fill in your personal details"
                >
                  <PersonalDetailsForm
                    onComplete={handlePersonalDetailsComplete}
                    isClaimSuccess={true}
                  />
                </AccordionCard>

                <div className="mt-8 flex justify-between">
                  <button
                    onClick={() => router.push('/phases/trip-experience')}
                    className="px-6 py-3 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleContinue}
                    disabled={!completedSteps.includes(1) || !isFormValid}
                    className={`px-6 py-3 rounded-lg transition-colors ${
                      completedSteps.includes(1) && isFormValid
                        ? 'bg-[#F54538] text-white hover:bg-[#E03F33]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Continue to Agreement
                  </button>
                </div>
              </div>
            </>
          )}
        </main>
        <footer className="bg-white">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="text-sm text-gray-500">
              {new Date().getFullYear()} Captain Frank. All rights reserved.
            </div>
          </div>
        </footer>
      </div>
    </PhaseGuard>
  );
}
