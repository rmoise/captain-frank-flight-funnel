import type { Flight, FlightSegmentData } from '@/types/store';
import type { LocationLike } from '@/types/location';
import type { StoreState } from '../types';
import type { ValidationStore } from './validationSlice';

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
    stepValidation: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
    stepInteraction: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
    isFlightValid: false,
    isWizardValid: false,
    isPersonalValid: false,
    isTermsValid: false,
    isSignatureValid: false,
    isBookingValid: false,
    errors: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    },
    fieldErrors: {},
    transitionInProgress: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    isWizardSubmitted: false,
    questionValidation: {},
    stepCompleted: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
    completedSteps: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
    },
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
  previousValidationState: {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  },
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
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
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
  previousValidationState: Record<number, boolean>;
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
          [state.currentPhase]: true,
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
        fromLocation: location?.value || null,
        directFlight: {
          ...state.directFlight,
          fromLocation: location,
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
      };
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
        toLocation: location?.value || null,
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
      };
    });
  },

  setSelectedDate: (date: string | null) => {
    set(
      (state) =>
        ({
          selectedDate: date,
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
      (state) =>
        ({
          flightSegments: segments,
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
      (state) =>
        ({
          ...newState,
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
