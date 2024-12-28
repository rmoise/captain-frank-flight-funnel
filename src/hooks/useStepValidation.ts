import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { completeStep, markStepIncomplete } from '@/store/slices/progressSlice';
import { Flight, Answer, PassengerDetails } from '@/types/store';
import { LocationLike } from '@/types/location';
import { syncWithBookingSlice } from '@/store/slices/progressSlice';

type LocationValidation = (
  fromLocation: LocationLike | string | null,
  toLocation: LocationLike | string | null
) => boolean;

type FlightValidation = (flight: Flight | Flight[] | null) => boolean;
type BookingNumberValidation = (number: string | null) => boolean;
type WizardAnswersValidation = (answers: Answer[]) => boolean;
type PersonalDetailsValidation = (details: PassengerDetails | null) => boolean;
type ConsentValidation = (accepted: boolean) => boolean;

interface ValidationRules {
  flight: FlightValidation;
  locations: LocationValidation;
  bookingNumber: BookingNumberValidation;
  wizardAnswers: WizardAnswersValidation;
  personalDetails: PersonalDetailsValidation;
  terms: ConsentValidation;
  privacy: ConsentValidation;
}

export const useStepValidation = () => {
  const dispatch = useAppDispatch();
  const completedSteps = useAppSelector(
    (state) => state.progress.completedSteps || []
  );

  console.log('\n=== useStepValidation Hook Initialized ===');
  console.log('Initial completed steps:', completedSteps);

  // Load completed steps from localStorage
  useEffect(() => {
    console.log('\n=== Loading Completed Steps ===');
    const savedCompletedSteps = localStorage.getItem('completedSteps');
    if (savedCompletedSteps) {
      try {
        const steps = JSON.parse(savedCompletedSteps);
        if (Array.isArray(steps)) {
          steps.forEach((step) => {
            dispatch(completeStep(step));
          });
        }
      } catch (error) {
        console.error('Error loading completed steps:', error);
      }
    }
    console.log('=== End Loading Completed Steps ===\n');
  }, [dispatch]); // Add dispatch to dependencies

  useEffect(() => {
    // Restore validation state from localStorage
    const savedValidationState = localStorage.getItem('validationState');
    if (savedValidationState) {
      try {
        const validationState = JSON.parse(savedValidationState);
        if (validationState.completedSteps) {
          validationState.completedSteps.forEach((step: number) => {
            dispatch(completeStep(step));
          });
        }
      } catch (error) {
        console.error('Error restoring validation state:', error);
      }
    }
  }, [dispatch]);

  const validateStep = useCallback(
    (stepId: number, isValid: boolean) => {
      console.log('\n=== Step Validation Start ===');
      console.log('Step ID:', stepId);
      console.log('Is Valid:', isValid);
      console.log('Current completed steps:', completedSteps);

      // Check if the validation state would actually change
      const isCurrentlyCompleted = completedSteps.includes(stepId);
      if (isValid === isCurrentlyCompleted) {
        console.log('Validation state unchanged, skipping update');
        return;
      }

      // Create a new set of completed steps
      const newCompletedSteps = new Set(completedSteps);

      if (isValid) {
        console.log(`Completing step ${stepId}`);
        newCompletedSteps.add(stepId);
        dispatch(completeStep(stepId));
      } else {
        console.log(`Marking step ${stepId} as incomplete`);
        newCompletedSteps.delete(stepId);
        dispatch(markStepIncomplete(stepId));
      }

      // Convert to sorted array
      const sortedSteps = Array.from(newCompletedSteps).sort((a, b) => a - b);

      // Update localStorage and sync with progress slice
      try {
        localStorage.setItem('completedSteps', JSON.stringify(sortedSteps));
        dispatch(syncWithBookingSlice(sortedSteps));
        console.log('Updated localStorage with steps:', sortedSteps);
      } catch (error) {
        console.error('Failed to update localStorage:', error);
      }

      console.log('Final validation state:', {
        stepId,
        isValid,
        completedSteps: sortedSteps,
        isCompleted: sortedSteps.includes(stepId),
      });
      console.log('=== Step Validation Complete ===\n');
    },
    [dispatch, completedSteps]
  );

  const isStepCompleted = useCallback(
    (stepId: number) => {
      const isCompleted = completedSteps.includes(stepId);
      console.log(`Checking step ${stepId} completion:`, isCompleted);
      return isCompleted;
    },
    [completedSteps]
  );

  const areStepsCompleted = useCallback(
    (steps: number[]) => {
      // Handle case where completedSteps is undefined
      if (!completedSteps) return false;
      return steps.every((step) => completedSteps.includes(step));
    },
    [completedSteps]
  );

  const validationRules: ValidationRules = {
    flight: (flight: Flight | Flight[] | null): boolean => {
      console.log('\n=== Flight Validation Start ===');
      console.log('Flight data:', flight);

      // During server-side rendering or initial hydration, return false
      if (typeof window === 'undefined') {
        console.log('Server-side rendering, returning false');
        return false;
      }

      // Check localStorage for flight data
      try {
        const savedFlight = localStorage.getItem('selectedFlight');
        const savedFromLocation = localStorage.getItem('fromLocation');
        const savedToLocation = localStorage.getItem('toLocation');

        console.log('Saved data:', {
          savedFlight,
          savedFromLocation,
          savedToLocation,
        });

        if (savedFlight && savedFromLocation && savedToLocation) {
          const parsedFlight = JSON.parse(savedFlight);
          const fromLocation = JSON.parse(savedFromLocation);
          const toLocation = JSON.parse(savedToLocation);

          const isValid = !!(
            parsedFlight &&
            fromLocation?.value &&
            toLocation?.value &&
            fromLocation.value !== toLocation.value
          );

          console.log('Flight validation result:', {
            isValid,
            details: {
              hasFlight: !!parsedFlight,
              hasFromLocation: !!fromLocation?.value,
              hasToLocation: !!toLocation?.value,
              differentLocations: fromLocation?.value !== toLocation?.value,
            },
          });

          return isValid;
        }
      } catch (error) {
        console.error('Error validating flight data:', error);
      }

      // If no saved data, check the provided flight data
      if (flight) {
        const flightArray = Array.isArray(flight) ? flight : [flight];
        const isValid = flightArray.every(
          (f) =>
            f &&
            f.departure &&
            f.arrival &&
            f.departureCity &&
            f.arrivalCity &&
            f.departure.trim() !== '' &&
            f.arrival.trim() !== '' &&
            f.departure !== f.arrival
        );

        console.log('Direct flight validation result:', {
          isValid,
          flightArray,
        });

        return isValid;
      }

      console.log('No valid flight data found');
      return false;
    },
    locations: (
      fromLocation: LocationLike | string | null,
      toLocation: LocationLike | string | null
    ): boolean => {
      console.log('\n=== Location Validation Start ===');
      console.log('Raw locations:', { fromLocation, toLocation });

      if (!fromLocation || !toLocation) {
        console.log('Missing location data');
        return false;
      }

      try {
        // Parse locations if they are strings
        let from: LocationLike;
        let to: LocationLike;

        // First try to parse as JSON strings
        if (typeof fromLocation === 'string') {
          try {
            from = JSON.parse(fromLocation);
          } catch (error) {
            console.error('Error parsing from location:', error);
            return false;
          }
        } else {
          from = fromLocation;
        }

        if (typeof toLocation === 'string') {
          try {
            to = JSON.parse(toLocation);
          } catch (error) {
            console.error('Error parsing to location:', error);
            return false;
          }
        } else {
          to = toLocation;
        }

        const isValid = !!(from?.value && to?.value && from.value !== to.value);
        console.log('Location validation result:', {
          isValid,
          details: {
            hasFromValue: !!from?.value,
            hasToValue: !!to?.value,
            differentValues: from?.value !== to?.value,
          },
        });

        return isValid;
      } catch (error) {
        console.error('Error validating locations:', error);
        return false;
      }
    },
    bookingNumber: (number: string | null): boolean => {
      if (!number || number.trim() === '') return false;
      // Booking number should be either 6 characters (airline reference) or 13 characters (PNR)
      return number.length === 6 || number.length === 13;
    },
    wizardAnswers: (answers: Answer[]): boolean => {
      if (!Array.isArray(answers) || answers.length === 0) return false;
      return answers.every(
        (answer) => answer.value !== undefined && answer.value !== null
      );
    },
    personalDetails: (details: PassengerDetails | null): boolean => {
      if (!details) return false;
      const hasValidEmail =
        details.email &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(details.email);
      return !!(
        details.firstName?.trim() &&
        details.lastName?.trim() &&
        hasValidEmail &&
        details.salutation?.trim()
      );
    },
    terms: (accepted: boolean): boolean => accepted,
    privacy: (accepted: boolean): boolean => accepted,
  };

  return {
    validateStep,
    isStepCompleted,
    areStepsCompleted,
    validationRules,
  };
};
