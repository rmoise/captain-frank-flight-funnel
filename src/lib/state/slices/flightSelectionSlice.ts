import type { Flight, FlightSegmentData } from '@/types/store';
import type { LocationLike } from '@/types/location';
import type { StoreState, ValidationStep } from '../types';
import type { ValidationStore } from './validationSlice';

// Helper function to create a validation record with all steps
const createValidationRecord = <T>(defaultValue: T): Record<ValidationStep, T> => {
  const steps: ValidationStep[] = [1, 2, 3, 4, 5, 6, 7];
  return steps.reduce((acc, step) => ({
    ...acc,
    [step]: defaultValue
  }), {} as Record<ValidationStep, T>);
};

// Helper function to get current phase as ValidationStep
const asValidationStep = (phase: number): ValidationStep => phase as ValidationStep;

export const initialFlightSelectionState: FlightSelectionState = {
  selectedType: 'direct',
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: null,
    selectedFlight: null,
  },
  flightSegments: [],
  selectedFlights: [],
  selectedDate: null,
  fromLocation: null,
  toLocation: null,
  validationState: {
    stepValidation: createValidationRecord(false),
    stepInteraction: createValidationRecord(false),
    isFlightValid: false,
    isWizardValid: false,
    isPersonalValid: false,
    isTermsValid: false,
    isSignatureValid: false,
    isBookingValid: false,
    isCompensationValid: false,
    errors: createValidationRecord<string[]>([]),
    fieldErrors: {},
    transitionInProgress: false,
    isWizardSubmitted: false,
    questionValidation: {},
    stepCompleted: createValidationRecord(false),
    completedSteps: [],
    _timestamp: Date.now(),
  },
  searchTerm: '',
  isSearchModalOpen: false,
  displayedFlights: [],
  isSearchLoading: false,
  initState: 'idle',
  isComponentReady: false,
  hasValidLocations: false,
  hasValidFlights: false,
  previousValidationState: createValidationRecord(false),
  isMounted: false,
  isInitStarted: false,
  onInteract: null,
};

export interface FlightSelectionState {
  selectedType: 'direct' | 'multi';
  directFlight: {
    fromLocation: LocationLike | null;
    toLocation: LocationLike | null;
    date: Date | null;
    selectedFlight: Flight | null;
  };
  flightSegments: FlightSegmentData[];
  selectedFlights: Flight[];
  selectedDate: string | null;
  fromLocation: (string & LocationLike) | null;
  toLocation: (string & LocationLike) | null;
  validationState: ValidationStore['validationState'];
  searchTerm: string;
  isSearchModalOpen: boolean;
  displayedFlights: Flight[];
  isSearchLoading: boolean;
  initState:
    | 'idle'
    | 'resetting'
    | 'setting_type'
    | 'setting_flight'
    | 'ready'
    | 'error';
  isComponentReady: boolean;
  hasValidLocations: boolean;
  hasValidFlights: boolean;
  previousValidationState: Record<ValidationStep, boolean>;
  isMounted: boolean;
  isInitStarted: boolean;
  onInteract: (() => void) | null;
}

export interface FlightSelectionActions {
  setSelectedType: (type: 'direct' | 'multi') => void;
  setFromLocation: (location: LocationLike | null) => void;
  setToLocation: (location: LocationLike | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setFlightSegments: (segments: FlightSegmentData[]) => void;
  setDirectFlight: (flight: FlightSegmentData | null) => void;
  setFlightState: (
    state: Partial<FlightSelectionState>,
    validationPhase?: number
  ) => void;
  setSearchTerm: (term: string) => void;
  setSearchModalOpen: (isOpen: boolean) => void;
  setDisplayedFlights: (flights: Flight[]) => void;
  setSearchLoading: (isLoading: boolean) => void;
  setInitState: (state: FlightSelectionState['initState']) => void;
  setIsComponentReady: (ready: boolean) => void;
  setHasValidLocations: (valid: boolean) => void;
  setHasValidFlights: (valid: boolean) => void;
  setPreviousValidationState: (state: Record<number, boolean>) => void;
  validateFlightSelection: () => boolean;
  setIsMounted: (mounted: boolean) => void;
  setIsInitStarted: (started: boolean) => void;
  setOnInteract: (callback: () => void) => void;
  notifyInteraction: () => void;
}

export const createFlightSelectionSlice = (
  set: (fn: (state: StoreState) => Partial<StoreState>) => void,
  get: () => StoreState
): FlightSelectionActions => ({
  setSelectedType: (type) => {
    set((state) => ({
      selectedType: type,
      validationState: {
        ...state.validationState,
        stepInteraction: {
          ...state.validationState.stepInteraction,
          [asValidationStep(state.currentPhase)]: true,
        },
      },
    }));
  },

  setFromLocation: (location: LocationLike | null) => {
    set((state) => {
      const isValid = !!(
        location &&
        state.toLocation &&
        location.value !== state.toLocation
      );
      return {
        fromLocation: location as (string & LocationLike) | null,
        directFlight: {
          ...state.directFlight,
          fromLocation: location,
        },
        validationState: {
          ...state.validationState,
          isFlightValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            [asValidationStep(state.currentPhase)]: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            [asValidationStep(state.currentPhase)]: true,
          },
        },
      } as Partial<StoreState>;
    });
  },

  setToLocation: (location: LocationLike | null) => {
    set((state) => {
      const isValid = !!(
        location &&
        state.fromLocation &&
        location.value !== state.fromLocation
      );
      return {
        toLocation: location as (string & LocationLike) | null,
        directFlight: {
          ...state.directFlight,
          toLocation: location,
        },
        validationState: {
          ...state.validationState,
          isFlightValid: isValid,
          stepValidation: {
            ...state.validationState.stepValidation,
            [state.currentPhase]: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            [state.currentPhase]: true,
          },
        },
      } as Partial<StoreState>;
    });
  },

  setSelectedDate: (date: string | null) => {
    set(
      (state) => {
        // Create the state update object
        const update = {
          selectedDate: date,
          validationState: {
            ...state.validationState,
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: true,
            },
          },
        };
        // Return the update with the correct type
        return update as unknown as Partial<StoreState>;
      }
    );
  },

  setSelectedFlights: (flights: Flight[]) => {
    set(
      (state) =>
        ({
          selectedFlights: flights,
          validationState: {
            ...state.validationState,
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: true,
            },
          },
        }) as Partial<StoreState>
    );
  },

  setFlightSegments: (segments: FlightSegmentData[]) => {
    set(
      (state) => {
        // Make a deep copy of the segments to prevent reference issues
        const segmentsCopy = JSON.parse(JSON.stringify(segments));

        // For multi-city flights, ensure proper connection between segments
        // This fixes issues when navigating back from phase 2 to phase 1
        if (state.selectedType === 'multi' && segmentsCopy.length > 1) {
          // First, check if we have the BER → MUC, MUC → MUC pattern
          // This is a common issue that occurs on reload or phase transitions
          let needsFix = false;

          // Find if last destination matches first destination
          if (segmentsCopy.length >= 2 &&
              segmentsCopy[0].toLocation &&
              segmentsCopy[1].fromLocation &&
              segmentsCopy[1].toLocation) {

            // Check if second segment has same from/to location (MUC → MUC)
            if (segmentsCopy[1].fromLocation.value === segmentsCopy[1].toLocation.value) {
              needsFix = true;
            }

            // Or check if first segment destination skipped to final destination (FRA → MUC)
            if (segmentsCopy[0].toLocation.value === segmentsCopy[segmentsCopy.length-1].toLocation?.value &&
                segmentsCopy[1].fromLocation.value !== segmentsCopy[0].toLocation.value) {
              needsFix = true;
            }
          }

          // If we detected the issue pattern, try to restore proper connections
          if (needsFix) {
            console.log('Detected broken segment connections, attempting to fix', {
              segments: segmentsCopy.map((s: FlightSegmentData) => ({
                from: s.fromLocation?.value,
                to: s.toLocation?.value
              }))
            });

            // Try to find segments in localStorage that might have the correct connections
            try {
              const storedPhase1 = localStorage.getItem('phase1State');
              if (storedPhase1) {
                const phase1Data = JSON.parse(storedPhase1);

                // If we have stored segments with proper connections, use those
                if (phase1Data.flightSegments &&
                    phase1Data.flightSegments.length >= 2 &&
                    phase1Data.flightSegments[0].toLocation &&
                    phase1Data.flightSegments[1].fromLocation &&
                    phase1Data.flightSegments[0].toLocation.value === phase1Data.flightSegments[1].fromLocation.value) {

                  console.log('Restoring segments from localStorage with proper connections');
                  // Copy the stored segments (they have the right connections)
                  return {
                    flightSegments: phase1Data.flightSegments,
                    validationState: {
                      ...state.validationState,
                      stepInteraction: {
                        ...state.validationState.stepInteraction,
                        [state.currentPhase]: true,
                      },
                    },
                  } as Partial<StoreState>;
                }
              }
            } catch (e) {
              console.error('Error trying to restore segments from localStorage', e);
            }
          }

          // Regular check: Loop through segments and ensure they connect properly
          for (let i = 1; i < segmentsCopy.length; i++) {
            const prevSegment = segmentsCopy[i-1];
            const currentSegment = segmentsCopy[i];

            // If previous segment has a toLocation but current segment's fromLocation doesn't match it,
            // or current segment's fromLocation equals current segment's toLocation, fix it
            if (prevSegment.toLocation && currentSegment.fromLocation &&
                (prevSegment.toLocation.value !== currentSegment.fromLocation.value ||
                 (currentSegment.toLocation && currentSegment.fromLocation.value === currentSegment.toLocation.value))) {

              // Fix the connection by setting current segment's fromLocation to previous segment's toLocation
              segmentsCopy[i] = {
                ...currentSegment,
                fromLocation: prevSegment.toLocation
              };

              console.log('Fixed segment connection', {
                segmentIndex: i,
                from: prevSegment.toLocation.value,
                wasIncorrectlySetTo: currentSegment.fromLocation.value
              });
            }
          }
        }

        return {
          flightSegments: segmentsCopy,
          validationState: {
            ...state.validationState,
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: true,
            },
          },
        } as Partial<StoreState>;
      }
    );
  },

  setDirectFlight: (flight: FlightSegmentData | null) => {
    set((state) => ({
      directFlight: flight || {
        fromLocation: null,
        toLocation: null,
        date: null,
        selectedFlight: null,
      },
      validationState: {
        ...state.validationState,
        stepInteraction: {
          ...state.validationState.stepInteraction,
          [state.currentPhase]: true,
        },
      },
    }));
  },

  setFlightState: (newState) => {
    set(
      (state) => {
        // Create the state update object
        const update = {
          ...newState,
          validationState: {
            ...state.validationState,
            stepInteraction: {
              ...state.validationState.stepInteraction,
              [state.currentPhase]: true,
            },
          },
        };
        // Return the update with the correct type
        return update as unknown as Partial<StoreState>;
      }
    );
  },

  setSearchTerm: (term: string) => {
    set(
      () =>
        ({
          searchTerm: term,
        }) as Partial<StoreState>
    );
  },

  setSearchModalOpen: (isOpen: boolean) => {
    set(
      () =>
        ({
          isSearchModalOpen: isOpen,
        }) as Partial<StoreState>
    );
  },

  setDisplayedFlights: (flights: Flight[]) => {
    set(
      () =>
        ({
          displayedFlights: flights,
        }) as Partial<StoreState>
    );
  },

  setSearchLoading: (isLoading: boolean) => {
    set(
      () =>
        ({
          isSearchLoading: isLoading,
        }) as Partial<StoreState>
    );
  },

  setInitState: (newState: FlightSelectionState['initState']) => {
    set(
      () =>
        ({
          initState: newState,
          isComponentReady: newState === 'ready',
        }) as Partial<StoreState>
    );
  },

  setIsComponentReady: (ready: boolean) => {
    set(
      () =>
        ({
          isComponentReady: ready,
        }) as Partial<StoreState>
    );
  },

  setHasValidLocations: (valid: boolean) => {
    set(
      () =>
        ({
          hasValidLocations: valid,
        }) as Partial<StoreState>
    );
  },

  setHasValidFlights: (valid: boolean) => {
    set(
      () =>
        ({
          hasValidFlights: valid,
        }) as Partial<StoreState>
    );
  },

  setPreviousValidationState: (state: Record<number, boolean>) => {
    set(
      () =>
        ({
          previousValidationState: state,
        }) as Partial<StoreState>
    );
  },

  validateFlightSelection: () => {
    const state = get();
    if (!state.fromLocation || !state.toLocation) return false;
    return state.fromLocation !== state.toLocation;
  },

  setIsMounted: (mounted: boolean) => {
    set(
      () =>
        ({
          isMounted: mounted,
        }) as Partial<StoreState>
    );
  },

  setIsInitStarted: (started: boolean) => {
    set(
      () =>
        ({
          isInitStarted: started,
        }) as Partial<StoreState>
    );
  },

  setOnInteract: (callback: () => void) => {
    set(
      () =>
        ({
          onInteract: callback,
        }) as Partial<StoreState>
    );
  },

  notifyInteraction: () => {
    const state = get() as StoreState & {
      onInteract?: (() => void) | null;
      isComponentReady?: boolean;
    };
    if (state.onInteract && state.isComponentReady) {
      state.onInteract();
    }
  },
});
