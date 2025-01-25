import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight, LocationData } from '@/types/store';
import type { Answer } from '@/types/wizard';

export type Phase4FlightSegment = {
  fromLocation: LocationData | null;
  toLocation: LocationData | null;
  date: Date | null;
  selectedFlight: Flight | null;
};

export interface Phase4State {
  selectedType: 'direct' | 'multi';
  directFlight: Phase4FlightSegment;
  flightSegments: Phase4FlightSegment[];
  currentSegmentIndex: number;
  fromLocation: string | null;
  toLocation: string | null;
  selectedDate: string | null;
  selectedFlight: Flight | null;
  selectedFlights: Flight[];
  originalFlights: Flight[];
  isTransitioningPhases: boolean;
  isInitializing: boolean;
  isSearchModalOpen: boolean;
  searchTerm: string;
  displayedFlights: Flight[];
  allFlights: Flight[];
  loading: boolean;
  errorMessage: string | null;
  errorMessages: Record<string, string>;
  travelStatusAnswers: Answer[];
  informedDateAnswers: Answer[];
  lastAnsweredQuestion: string | null;
  stepValidation: Record<number, boolean>;
  stepInteraction: Record<number, boolean>;
  fieldErrors: Record<string, string>;
  wizardCurrentStep: number;
  wizardShowingSuccess: boolean;
  wizardIsValid: boolean;
  isWizardValid: boolean;
  isWizardSubmitted: boolean;
  _lastUpdate: number;
}

interface Phase4Actions {
  setSelectedType: (type: 'direct' | 'multi') => void;
  setDirectFlight: (flight: Phase4FlightSegment) => void;
  setFlightSegments: (segments: Phase4FlightSegment[]) => void;
  setCurrentSegmentIndex: (index: number) => void;
  setFromLocation: (location: string | null) => void;
  setToLocation: (location: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setSelectedFlights: (flights: Flight[]) => void;
  setOriginalFlights: (flights: Flight[]) => void;
  setSearchModalOpen: (isOpen: boolean) => void;
  setSearchTerm: (term: string) => void;
  setDisplayedFlights: (flights: Flight[]) => void;
  setAllFlights: (flights: Flight[]) => void;
  setFlightSearchLoading: (isLoading: boolean) => void;
  setFlightErrorMessage: (message: string | null) => void;
  setFlightErrorMessages: (messages: Record<string, string>) => void;
  clearFlightErrors: () => void;
  resetStore: () => void;
  setWizardAnswer: (answer: Answer) => void;
  updateValidationState: (state: Partial<Phase4State>) => void;
  setWizardCurrentStep: (step: number) => void;
}

const initialState: Phase4State = {
  selectedType: 'direct',
  directFlight: {
    fromLocation: null,
    toLocation: null,
    date: null,
    selectedFlight: null,
  },
  flightSegments: [],
  currentSegmentIndex: 0,
  fromLocation: null,
  toLocation: null,
  selectedDate: null,
  selectedFlight: null,
  selectedFlights: [],
  originalFlights: [],
  isTransitioningPhases: false,
  isInitializing: false,
  isSearchModalOpen: false,
  searchTerm: '',
  displayedFlights: [],
  allFlights: [],
  loading: false,
  errorMessage: null,
  errorMessages: {},
  travelStatusAnswers: [],
  informedDateAnswers: [],
  lastAnsweredQuestion: null,
  stepValidation: {},
  stepInteraction: {},
  fieldErrors: {},
  wizardCurrentStep: 0,
  wizardShowingSuccess: false,
  wizardIsValid: false,
  isWizardValid: false,
  isWizardSubmitted: false,
  _lastUpdate: Date.now(),
};

// Initialize store with saved state if available
const getInitialState = () => {
  if (typeof window === 'undefined') return initialState;

  try {
    const savedValidationState = localStorage.getItem('phase4ValidationState');
    if (savedValidationState) {
      const parsedState = JSON.parse(savedValidationState);
      return {
        ...initialState,
        ...parsedState,
      };
    }
  } catch (error) {
    console.error('Error loading saved validation state:', error);
  }

  return initialState;
};

export const usePhase4Store = create<Phase4State & Phase4Actions>()(
  persist(
    (set, get) => ({
      ...getInitialState(),
      setSelectedType: (type) => {
        console.log('=== Phase4Store - setSelectedType ===', { type });
        set((state) => {
          const newState = {
            ...state,
            selectedType: type,
            _lastUpdate: Date.now(),
          };
          console.log('Phase4Store - New state after type change:', {
            selectedType: newState.selectedType,
            selectedFlights: newState.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
            })),
            _lastUpdate: newState._lastUpdate,
            storeType: 'phase4Store',
          });
          return newState;
        });
      },
      setDirectFlight: (flight) => {
        console.log('=== Phase4Store - setDirectFlight ===', {
          flight,
          storeType: 'phase4Store',
          timestamp: new Date().toISOString(),
        });
        set((state) => {
          const newState = {
            ...state,
            directFlight: flight,
            _lastUpdate: Date.now(),
          };
          console.log('Phase4Store - New state after direct flight update:', {
            directFlight: newState.directFlight,
            _lastUpdate: newState._lastUpdate,
            storeType: 'phase4Store',
          });
          return newState;
        });
      },
      setFlightSegments: (segments) => {
        console.log('=== Phase4Store - setFlightSegments ===', { segments });
        set((state) => {
          const newState = {
            ...state,
            flightSegments: segments,
            _lastUpdate: Date.now(),
          };
          console.log('New state:', newState);
          return newState;
        });
      },
      setCurrentSegmentIndex: (index) =>
        set((state) => ({
          ...state,
          currentSegmentIndex: index,
          _lastUpdate: Date.now(),
        })),
      setFromLocation: (location) => {
        console.log('=== Phase4Store - setFromLocation ===', { location });
        set((state) => {
          const newState = {
            ...state,
            fromLocation: location,
            _lastUpdate: Date.now(),
          };
          console.log('New state:', newState);
          return newState;
        });
      },
      setToLocation: (location) => {
        console.log('=== Phase4Store - setToLocation ===', { location });
        set((state) => {
          const newState = {
            ...state,
            toLocation: location,
            _lastUpdate: Date.now(),
          };
          console.log('New state:', newState);
          return newState;
        });
      },
      setSelectedDate: (date) => {
        console.log('=== Phase4Store - setSelectedDate ===', { date });
        set((state) => {
          const newState = {
            ...state,
            selectedDate: date,
            _lastUpdate: Date.now(),
          };
          console.log('New state:', newState);
          return newState;
        });
      },
      setSelectedFlight: (flight) => {
        console.log('=== Phase4Store - setSelectedFlight ===', {
          flight: flight
            ? {
                id: flight.id,
                flightNumber: flight.flightNumber,
              }
            : null,
        });

        set((state) => {
          // If no flight is selected, reset both selected and original flights
          if (!flight) {
            return {
              ...state,
              selectedFlight: null,
              selectedFlights: [],
              originalFlights: [],
              _lastUpdate: Date.now(),
            };
          }

          // Create a new array with the selected flight
          const newSelectedFlights = [flight];

          // If this is the first flight selection, set it as both selected and original
          if (!state.originalFlights?.length) {
            console.log('Setting first selected flight as original flight');
            return {
              ...state,
              selectedFlight: flight,
              selectedFlights: newSelectedFlights,
              originalFlights: [{ ...flight }],
              _lastUpdate: Date.now(),
            };
          }

          // Otherwise, just update the selected flight
          return {
            ...state,
            selectedFlight: flight,
            selectedFlights: newSelectedFlights,
            _lastUpdate: Date.now(),
          };
        });

        // After setting the flight, check if we need to update validation
        const currentState = get();
        if (flight) {
          const isAlternativeFlight =
            currentState.originalFlights.length > 0 &&
            !currentState.originalFlights.some((f) => f.id === flight.id);

          console.log('=== Phase4Store - Alternative Flight Check ===', {
            isAlternativeFlight,
            flightId: flight.id,
            originalFlights: currentState.originalFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
            })),
          });

          // Only update step interaction state, not validation
          if (isAlternativeFlight) {
            set((state) => ({
              ...state,
              stepInteraction: {
                ...state.stepInteraction,
                2: true, // Mark that user has interacted with step 2
              },
            }));
          }
        }
      },
      setSelectedFlights: (flights) => {
        console.log('=== Phase4Store - setSelectedFlights ===', {
          flights: flights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          storeType: 'phase4Store',
          timestamp: new Date().toISOString(),
        });
        set((state) => {
          const newState = {
            ...state,
            selectedFlights: flights,
            _lastUpdate: Date.now(),
          };
          console.log('Phase4Store - Flight State Update:', {
            selectedFlights: newState.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
            })),
            originalFlights: newState.originalFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
            })),
            _lastUpdate: newState._lastUpdate,
            storeType: 'phase4Store',
          });
          return newState;
        });
      },
      setOriginalFlights: (flights) => {
        console.log('=== Phase4Store - setOriginalFlights ===', {
          flights: flights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
          })),
          storeType: 'phase4Store',
          timestamp: new Date().toISOString(),
        });
        set((state) => ({
          ...state,
          originalFlights: flights,
          _lastUpdate: Date.now(),
        }));
      },
      setSearchModalOpen: (isOpen) =>
        set((state) => ({
          ...state,
          isSearchModalOpen: isOpen,
          _lastUpdate: Date.now(),
        })),
      setSearchTerm: (term) =>
        set((state) => ({
          ...state,
          searchTerm: term,
          _lastUpdate: Date.now(),
        })),
      setDisplayedFlights: (flights) =>
        set((state) => ({
          ...state,
          displayedFlights: flights,
          _lastUpdate: Date.now(),
        })),
      setAllFlights: (flights) =>
        set((state) => ({
          ...state,
          allFlights: flights,
          _lastUpdate: Date.now(),
        })),
      setFlightSearchLoading: (isLoading) =>
        set((state) => ({
          ...state,
          loading: isLoading,
          _lastUpdate: Date.now(),
        })),
      setFlightErrorMessage: (message) =>
        set((state) => ({
          ...state,
          errorMessage: message,
          _lastUpdate: Date.now(),
        })),
      setFlightErrorMessages: (messages) =>
        set((state) => ({
          ...state,
          errorMessages: messages,
          _lastUpdate: Date.now(),
        })),
      clearFlightErrors: () =>
        set((state) => ({
          ...state,
          errorMessage: null,
          errorMessages: {},
          _lastUpdate: Date.now(),
        })),
      resetStore: () => {
        console.log('=== Phase4Store - resetStore ===');
        set(() => {
          const newState = {
            ...initialState,
            _lastUpdate: Date.now(),
          };
          console.log('Store reset to initial state');
          return newState;
        });
      },
      setWizardAnswer: (answer) => {
        console.log('=== Phase4Store - setWizardAnswer ENTRY ===', {
          answer,
          currentTravelAnswers: get().travelStatusAnswers,
          currentInformedAnswers: get().informedDateAnswers,
        });

        // Determine which answer array to update based on the question ID
        const isInformedDateQuestion =
          answer.questionId === 'informed_date' ||
          answer.questionId === 'specific_informed_date';

        if (isInformedDateQuestion) {
          // Handle informed date answers
          const currentAnswers = get().informedDateAnswers;
          const answerIndex = currentAnswers.findIndex(
            (a) => a.questionId === answer.questionId
          );

          let newAnswers;
          if (answerIndex >= 0) {
            newAnswers = [
              ...currentAnswers.slice(0, answerIndex),
              answer,
              ...currentAnswers.slice(answerIndex + 1),
            ];
          } else {
            newAnswers = [...currentAnswers, answer];
          }

          console.log('=== Phase4Store - New Informed Date Answers ===', {
            newAnswers,
            answerIndex,
            isUpdate: answerIndex >= 0,
          });

          // Only update answers, no validation or auto-transition
          set((state) => ({
            ...state,
            informedDateAnswers: newAnswers,
            lastAnsweredQuestion: answer.questionId,
            _lastUpdate: Date.now(),
          }));
        } else {
          // Handle travel status answers
          const currentAnswers = get().travelStatusAnswers;
          const answerIndex = currentAnswers.findIndex(
            (a) => a.questionId === answer.questionId
          );

          let newAnswers;
          if (answerIndex >= 0) {
            newAnswers = [
              ...currentAnswers.slice(0, answerIndex),
              answer,
              ...currentAnswers.slice(answerIndex + 1),
            ];
          } else {
            newAnswers = [...currentAnswers, answer];
          }

          console.log('=== Phase4Store - New Travel Status Answers ===', {
            newAnswers,
            answerIndex,
            isUpdate: answerIndex >= 0,
          });

          // Only update answers, no validation or auto-transition
          set((state) => ({
            ...state,
            travelStatusAnswers: newAnswers,
            lastAnsweredQuestion: answer.questionId,
            _lastUpdate: Date.now(),
          }));
        }

        console.log('=== Phase4Store - After setWizardAnswer ===', {
          updatedTravelAnswers: get().travelStatusAnswers,
          updatedInformedAnswers: get().informedDateAnswers,
          lastAnsweredQuestion: get().lastAnsweredQuestion,
        });
      },
      updateValidationState: (newState) => {
        // Skip update if no validation state changes
        if (
          !newState.stepValidation &&
          !newState.stepInteraction &&
          !newState.wizardShowingSuccess &&
          !newState.wizardIsValid &&
          !newState.isWizardValid &&
          !newState.isWizardSubmitted &&
          !newState.lastAnsweredQuestion
        ) {
          return;
        }

        set((state) => {
          // Only include fields that have actually changed
          const updates: Partial<Phase4State> = {};

          if (newState.stepValidation)
            updates.stepValidation = newState.stepValidation;
          if (newState.stepInteraction)
            updates.stepInteraction = newState.stepInteraction;
          if (typeof newState.wizardShowingSuccess === 'boolean')
            updates.wizardShowingSuccess = newState.wizardShowingSuccess;
          if (typeof newState.wizardIsValid === 'boolean')
            updates.wizardIsValid = newState.wizardIsValid;
          if (typeof newState.isWizardValid === 'boolean')
            updates.isWizardValid = newState.isWizardValid;
          if (typeof newState.isWizardSubmitted === 'boolean')
            updates.isWizardSubmitted = newState.isWizardSubmitted;
          if (newState.lastAnsweredQuestion !== undefined)
            updates.lastAnsweredQuestion = newState.lastAnsweredQuestion;

          return {
            ...state,
            ...updates,
            _lastUpdate: Date.now(),
          };
        });
      },
      setWizardCurrentStep: (step) => {
        console.log('=== Phase4Store - setWizardCurrentStep ===', { step });

        // Skip if step hasn't changed
        if (get().wizardCurrentStep === step) {
          return;
        }

        set((state) => {
          // Only create new state if needed
          if (step === 0) {
            return {
              ...state,
              wizardCurrentStep: 0,
              stepValidation: {},
              stepInteraction: {},
              wizardShowingSuccess: false,
              wizardIsValid: false,
              isWizardValid: false,
              isWizardSubmitted: false,
              _lastUpdate: Date.now(),
            };
          }

          return {
            ...state,
            wizardCurrentStep: step,
            _lastUpdate: Date.now(),
          };
        });
      },
      onRehydrateStorage: () => (state: Phase4State | null) => {
        console.log('=== Phase4Store - Rehydrated from storage ===', state);

        // If we have a valid state, ensure we keep the wizard answers and success state
        if (state) {
          console.log('=== Phase4Store - Restoring wizard state ===', {
            travelStatusAnswers: state.travelStatusAnswers,
            informedDateAnswers: state.informedDateAnswers,
            wizardShowingSuccess: state.wizardShowingSuccess,
            wizardIsValid: state.wizardIsValid,
            isWizardValid: state.isWizardValid,
            isWizardSubmitted: state.isWizardSubmitted,
          });

          set((currentState) => ({
            ...currentState,
            travelStatusAnswers: state.travelStatusAnswers || [],
            informedDateAnswers: state.informedDateAnswers || [],
            wizardShowingSuccess: state.wizardShowingSuccess || false,
            wizardIsValid: state.wizardIsValid || false,
            isWizardValid: state.isWizardValid || false,
            isWizardSubmitted: state.isWizardSubmitted || false,
            _lastUpdate: Date.now(),
          }));
        }

        // If we have selectedFlights but no originalFlights, initialize originalFlights
        if (
          state &&
          state.selectedFlights &&
          state.selectedFlights.length > 0 &&
          (!state.originalFlights || state.originalFlights.length === 0)
        ) {
          console.log(
            '=== Phase4Store - Initializing originalFlights from selectedFlights ===',
            {
              selectedFlights: state.selectedFlights.map((f: Flight) => ({
                id: f.id,
                flightNumber: f.flightNumber,
              })),
            }
          );

          // Store a deep copy of the selected flights as original flights
          const initialFlights = state.selectedFlights.map(
            (flight: Flight) => ({
              ...flight,
              id: flight.id,
              flightNumber: flight.flightNumber,
              date: flight.date,
              departureCity: flight.departureCity,
              arrivalCity: flight.arrivalCity,
            })
          );

          set((state) => ({
            ...state,
            originalFlights: initialFlights,
            _lastUpdate: Date.now(),
          }));
        }
      },
    }),
    {
      name: 'phase4-flight-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
