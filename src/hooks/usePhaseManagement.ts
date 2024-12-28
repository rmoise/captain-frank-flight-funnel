import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectSelectedFlights } from '@/store/selectors/flightSelectors';
import {
  selectFromLocation,
  selectToLocation,
} from '@/store/selectors/locationSelectors';
import { completePhase, setCurrentPhase } from '@/store/slices/progressSlice';

export const usePhaseManagement = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentPhase = useAppSelector((state) => state.progress.currentPhase);
  const completedPhases = useAppSelector(
    (state) => state.progress.completedPhases
  );
  const selectedFlights = useAppSelector(selectSelectedFlights);
  const fromLocation = useAppSelector(selectFromLocation);
  const toLocation = useAppSelector(selectToLocation);

  // Initialize phase from URL on mount
  useEffect(() => {
    const initializePhase = () => {
      const currentUrl = window.location.pathname;
      const urlPhase = getPhaseFromUrl(currentUrl);
      const storedPhase = localStorage.getItem('currentPhase');
      const storedPhaseNum = storedPhase ? parseInt(storedPhase) : null;

      console.log('=== Phase Management Initialization ===', {
        currentUrl,
        urlPhase,
        currentPhase,
        storedPhase: storedPhaseNum,
      });

      // Priority: stored phase > URL phase > default phase
      if (storedPhaseNum && storedPhaseNum >= 1 && storedPhaseNum <= 3) {
        dispatch(setCurrentPhase(storedPhaseNum));
      } else if (urlPhase && !currentPhase) {
        dispatch(setCurrentPhase(urlPhase));
        localStorage.setItem('currentPhase', urlPhase.toString());
      }

      // Restore completed phases
      const savedCompletedPhases = localStorage.getItem('completedSteps');
      if (savedCompletedPhases) {
        try {
          const phases = JSON.parse(savedCompletedPhases);
          if (Array.isArray(phases)) {
            phases.forEach((phase) => {
              dispatch(completePhase(phase));
            });
          }
        } catch (error) {
          console.error('Error restoring completed phases:', error);
        }
      }
    };

    // Only run initialization after initial mount
    const timer = setTimeout(initializePhase, 0);
    return () => clearTimeout(timer);
  }, [dispatch, currentPhase]);

  // Remove the phase sync effect since phase is now managed by cookies
  useEffect(() => {
    if (typeof window === 'undefined' || !currentPhase) return;

    console.log('=== Phase Change Sync ===', {
      currentPhase,
      currentUrl: window.location.pathname,
    });
  }, [currentPhase]);

  // Helper function to get phase number from URL
  const getPhaseFromUrl = (url: string): number | null => {
    if (url.includes('/phases/initial-assessment')) return 1;
    if (url.includes('/phases/compensation-estimate')) return 2;
    if (url.includes('/phases/flight-details')) return 3;
    if (url.includes('/phases/trip-experience')) return 4;
    if (url.includes('/phases/claim-success')) return 5;
    if (url.includes('/phases/agreement')) return 6;
    return null;
  };

  // Helper function to check if current phase requirements are met
  const isCurrentPhaseValid = (): boolean => {
    if (currentPhase === 1) return true;

    // Check location requirements for phase 2 and 3
    if (currentPhase >= 2 && (!fromLocation || !toLocation)) {
      return false;
    }

    // Check flight requirements for phase 3
    if (
      currentPhase === 3 &&
      (!selectedFlights || selectedFlights.length === 0)
    ) {
      return false;
    }

    return true;
  };

  // Helper function to validate phase requirements for navigation
  const canAdvanceToPhase = (targetPhase: number): boolean => {
    if (targetPhase === 1) return true;

    // Check location requirements for phase 2 and 3
    if (targetPhase >= 2) {
      // Parse locations if they are strings
      const fromLocationObj =
        typeof fromLocation === 'string'
          ? JSON.parse(fromLocation)
          : fromLocation;
      const toLocationObj =
        typeof toLocation === 'string' ? JSON.parse(toLocation) : toLocation;

      if (!fromLocationObj?.value || !toLocationObj?.value) {
        console.warn('Cannot advance: locations not selected');
        return false;
      }
    }

    // For phase 3, we don't need to check for selected flights yet
    // since they will be selected in the flight details phase
    if (targetPhase === 3) {
      return true;
    }

    return true;
  };

  // Function to get the URL for a specific phase
  const getPhaseUrl = (phase: number): string => {
    switch (phase) {
      case 1:
        return '/phases/initial-assessment';
      case 2:
        return '/phases/compensation-estimate';
      case 3:
        return '/phases/flight-details';
      case 4:
        return '/phases/trip-experience';
      case 5:
        return '/claim-success';
      case 6:
        return '/phases/agreement';
      default:
        return '/phases/initial-assessment';
    }
  };

  // Function to safely go back to the previous phase
  const goToPreviousPhase = async () => {
    if (currentPhase > 1) {
      const prevPhase = currentPhase - 1;

      try {
        console.log('=== Going to Previous Phase ===', {
          currentPhase,
          prevPhase,
          completedPhases,
        });

        // Save current phase state before going back
        if (currentPhase === 3) {
          const flightState = {
            selectedFlights: localStorage.getItem('selectedFlights'),
            flightSummary: localStorage.getItem('flightSummary'),
            flightSegments: localStorage.getItem('flightSegments'),
            validationState: localStorage.getItem('validationState'),
            completedSteps: localStorage.getItem('completedSteps'),
            flightDetails: localStorage.getItem('flightDetails'),
            bookingNumber: localStorage.getItem('bookingNumber'),
            isValidBookingNumber: localStorage.getItem('isValidBookingNumber'),
            selectedFlight: localStorage.getItem('selectedFlight'),
          };
          localStorage.setItem('savedFlightState', JSON.stringify(flightState));
        }

        // Update Redux state first
        dispatch(setCurrentPhase(prevPhase));

        // Store the target phase in localStorage
        localStorage.setItem('currentPhase', prevPhase.toString());
        localStorage.setItem('isBackNavigation', 'true');

        // Get the URL for the previous phase
        const prevUrl = getPhaseUrl(prevPhase);

        // Wait for state updates to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify state before navigation
        const currentStoredPhase = localStorage.getItem('currentPhase');
        console.log('=== Pre-Navigation State Check ===', {
          expectedPhase: prevPhase,
          storedPhase: currentStoredPhase,
          reduxPhase: currentPhase,
          targetUrl: prevUrl,
        });

        // Navigate to the previous phase
        await router.push(prevUrl);

        return true;
      } catch (error) {
        console.error('Error during phase navigation:', error);
        // Restore original phase state on error
        dispatch(setCurrentPhase(currentPhase));
        localStorage.setItem('currentPhase', currentPhase.toString());
        return false;
      }
    }
    return false;
  };

  // Function to safely advance to the next phase
  const goToNextPhase = async () => {
    console.log('=== Going to Next Phase ===', {
      currentPhase,
      completedPhases,
    });

    if (currentPhase < 6) {
      const nextPhase = currentPhase + 1;
      if (canAdvanceToPhase(nextPhase)) {
        // If moving to phase 3, restore saved flight state if it exists
        if (nextPhase === 3) {
          const savedFlightState = localStorage.getItem('savedFlightState');
          if (savedFlightState) {
            try {
              const flightState = JSON.parse(savedFlightState);
              Object.entries(flightState).forEach(([key, value]) => {
                if (value)
                  localStorage.setItem(
                    key,
                    typeof value === 'string' ? value : JSON.stringify(value)
                  );
              });
            } catch (error) {
              console.error('Error restoring flight state:', error);
            }
          }
        }

        // Complete the current phase before advancing
        dispatch(completePhase(currentPhase));

        // Save completed phases to localStorage
        const existingPhases = JSON.parse(
          localStorage.getItem('completedPhases') || '[]'
        );
        if (!existingPhases.includes(currentPhase)) {
          existingPhases.push(currentPhase);
          existingPhases.sort((a: number, b: number) => a - b);
          localStorage.setItem(
            'completedPhases',
            JSON.stringify(existingPhases)
          );
        }

        // Update phase state first
        console.log('Updating phase state to:', nextPhase);
        dispatch(setCurrentPhase(nextPhase));

        // Store the target phase in localStorage to prevent reset
        localStorage.setItem('currentPhase', nextPhase.toString());
        localStorage.removeItem('isBackNavigation');

        // Then navigate
        console.log('Navigating to next phase URL');
        const nextUrl = getPhaseUrl(nextPhase);
        await router.push(nextUrl);

        // Only remove savedFlightState after successful navigation to phase 3
        if (nextPhase === 3) {
          localStorage.removeItem('savedFlightState');
        }

        return true;
      } else {
        console.warn('Cannot advance to next phase - requirements not met');
      }
    }
    return false;
  };

  // Function to set a specific phase with validation
  const goToPhase = async (phase: number) => {
    if (phase >= 1 && phase <= 3 && canAdvanceToPhase(phase)) {
      try {
        // Update phase state first
        console.log('=== Going to Specific Phase ===', {
          currentPhase,
          targetPhase: phase,
          completedPhases,
        });

        // Update phase state
        dispatch(setCurrentPhase(phase));

        // Store the target phase in localStorage
        localStorage.setItem('currentPhase', phase.toString());

        // Wait for a small delay to ensure state is updated
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Then navigate
        console.log('Navigating to phase URL');
        const phaseUrl = getPhaseUrl(phase);
        await router.push(phaseUrl);

        // Wait for navigation to complete
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Verify phase state after navigation
        const finalPhase = localStorage.getItem('currentPhase');
        console.log('=== Phase Navigation Complete ===', {
          expectedPhase: phase,
          storedPhase: finalPhase,
          url: window.location.pathname,
        });

        return true;
      } catch (error) {
        console.error('Error during phase navigation:', error);
        return false;
      }
    }
    return false;
  };

  return {
    currentPhase,
    goToNextPhase,
    goToPreviousPhase,
    goToPhase,
    canAdvanceToPhase,
    isCurrentPhaseValid,
    completedPhases,
  };
};
