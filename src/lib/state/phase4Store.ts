import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Flight } from '@/types/store';
import type { Answer } from '@/types/wizard';
import type { SharedFlightSearch } from './types';
import { useFlightStore } from './flightStore';

// Use shared interface for consistent formatting
export type Phase4FlightSegment = SharedFlightSearch;

export interface Phase4State {
  // Flight selection state
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

  // Travel Status QA state
  travelStatusAnswers: Answer[];
  travelStatusCurrentStep: number;
  travelStatusShowingSuccess: boolean;
  travelStatusIsValid: boolean;
  travelStatusStepValidation: Record<number, boolean>;
  travelStatusStepInteraction: Record<number, boolean>;

  // Informed Date QA state
  informedDateAnswers: Answer[];
  informedDateCurrentStep: number;
  informedDateShowingSuccess: boolean;
  informedDateIsValid: boolean;
  informedDateStepValidation: Record<number, boolean>;
  informedDateStepInteraction: Record<number, boolean>;

  // Shared state
  lastAnsweredQuestion: string | null;
  fieldErrors: Record<string, string>;
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
  resetTravelStatusState: () => void;
  resetInformedDateState: () => void;
  batchUpdate: (updates: Partial<Phase4State>) => void;
}

const initialState: Phase4State = {
  // Flight selection initial state
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

  // Travel Status QA initial state
  travelStatusAnswers: [],
  travelStatusCurrentStep: 0,
  travelStatusShowingSuccess: false,
  travelStatusIsValid: false,
  travelStatusStepValidation: {},
  travelStatusStepInteraction: {},

  // Informed Date QA initial state
  informedDateAnswers: [],
  informedDateCurrentStep: 0,
  informedDateShowingSuccess: false,
  informedDateIsValid: false,
  informedDateStepValidation: {},
  informedDateStepInteraction: {},

  // Shared initial state
  lastAnsweredQuestion: null,
  fieldErrors: {},
  _lastUpdate: Date.now(),
};

// Add initialization state tracking
const isInitializingPhase4Store = {
  value: false,
};

// Initialize store with saved state if available
const getInitialState = () => {
  if (typeof window === 'undefined') return initialState;

  try {
    // Prevent multiple initializations
    if (isInitializingPhase4Store.value) {
      return initialState;
    }

    isInitializingPhase4Store.value = true;

    // Try to get persisted state from localStorage
    const persistedState = localStorage.getItem('phase4Store');
    if (persistedState) {
      try {
        const parsedState = JSON.parse(persistedState);
        const state = {
          ...initialState,
          ...parsedState.state,
          _lastUpdate: Date.now(),
        };

        // Ensure validation states are properly restored
        if (parsedState.state) {
          // Restore travel status validation
          if (parsedState.state.travelStatusAnswers?.length > 0) {
            state.travelStatusIsValid =
              parsedState.state.travelStatusIsValid ?? false;
            state.travelStatusShowingSuccess =
              parsedState.state.travelStatusShowingSuccess ?? false;
            state.travelStatusStepValidation =
              parsedState.state.travelStatusStepValidation ?? {};
            state.travelStatusStepInteraction =
              parsedState.state.travelStatusStepInteraction ?? {};
          }

          // Restore informed date validation
          if (parsedState.state.informedDateAnswers?.length > 0) {
            state.informedDateIsValid =
              parsedState.state.informedDateIsValid ?? false;
            state.informedDateShowingSuccess =
              parsedState.state.informedDateShowingSuccess ?? false;
            state.informedDateStepValidation =
              parsedState.state.informedDateStepValidation ?? {};
            state.informedDateStepInteraction =
              parsedState.state.informedDateStepInteraction ?? {};
          }
        }

        console.log('=== Phase4Store - Restored State ===', {
          travelStatus: {
            answers: state.travelStatusAnswers,
            isValid: state.travelStatusIsValid,
            showingSuccess: state.travelStatusShowingSuccess,
            stepValidation: state.travelStatusStepValidation,
          },
          informedDate: {
            answers: state.informedDateAnswers,
            isValid: state.informedDateIsValid,
            showingSuccess: state.informedDateShowingSuccess,
            stepValidation: state.informedDateStepValidation,
          },
          timestamp: new Date().toISOString(),
        });

        return state;
      } catch (error) {
        console.error('Error parsing persisted state:', error);
      }
    }
  } catch (error) {
    console.error('Error loading persisted state:', error);
  } finally {
    isInitializingPhase4Store.value = false;
  }

  return {
    ...initialState,
    _lastUpdate: Date.now(),
  };
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

          // When switching to direct mode, use first segment data
          if (type === 'direct') {
            const firstSegment = state.flightSegments[0];
            newState.directFlight = {
              fromLocation:
                firstSegment?.fromLocation || state.directFlight.fromLocation,
              toLocation:
                firstSegment?.toLocation || state.directFlight.toLocation,
              date: firstSegment?.date || state.directFlight.date,
              selectedFlight:
                firstSegment?.selectedFlight ||
                state.directFlight.selectedFlight,
            };
            newState.selectedFlight = newState.directFlight.selectedFlight;
            newState.selectedFlights = newState.directFlight.selectedFlight
              ? [newState.directFlight.selectedFlight]
              : [];
          } else if (type === 'multi' && state.selectedType === 'direct') {
            // Only initialize new segments when switching from direct to multi
            newState.flightSegments = [
              {
                fromLocation: state.directFlight.fromLocation,
                toLocation: state.directFlight.toLocation,
                date: null,
                selectedFlight: null,
              },
              {
                fromLocation: null,
                toLocation: null,
                date: null,
                selectedFlight: null,
              },
            ];
            newState.currentSegmentIndex = 0;
            newState.selectedFlight = null;
            newState.selectedFlights = [];
          }
          // If already in multi mode, preserve the existing state
          // This ensures we don't lose selected flights when switching segments

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
          // Ensure we have at least 2 segments and no more than 4 segments in multi mode
          let updatedSegments = segments;
          if (state.selectedType === 'multi') {
            if (segments.length < 2) {
              updatedSegments = [
                ...segments,
                ...Array(2 - segments.length).fill({
                  fromLocation: null,
                  toLocation: null,
                  date: null,
                  selectedFlight: null,
                }),
              ];
            } else if (segments.length > 4) {
              updatedSegments = segments.slice(0, 4);
            }
          }

          // Map and merge segments with existing data
          const processedSegments = updatedSegments.map((newSegment, index) => {
            const existingSegment = state.flightSegments[index];
            return {
              ...existingSegment,
              ...newSegment,
              fromLocation:
                newSegment.fromLocation ||
                existingSegment?.fromLocation ||
                null,
              toLocation:
                newSegment.toLocation || existingSegment?.toLocation || null,
              date: newSegment.date || existingSegment?.date || null,
              selectedFlight:
                newSegment.selectedFlight ||
                existingSegment?.selectedFlight ||
                null,
            };
          });

          // Update selected flights array
          const updatedSelectedFlights = processedSegments
            .map((segment) => segment.selectedFlight)
            .filter((f): f is Flight => f !== null);

          const newState = {
            ...state,
            flightSegments: processedSegments,
            selectedFlights: updatedSelectedFlights,
            selectedFlight:
              updatedSelectedFlights[state.currentSegmentIndex] || null,
            _lastUpdate: Date.now(),
          };

          console.log('Phase4Store - New state after segments update:', {
            flightSegments: newState.flightSegments,
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
        console.log('=== Phase4Store - setSelectedDate - ENTRY ===', {
          date,
          timestamp: new Date().toISOString(),
        });

        set((state) => {
          // Log current state before update
          console.log('=== Phase4Store - Date Change - Current State ===', {
            selectedFlights: state.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            travelStatus: state.travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value,
            currentDate: state.selectedDate,
            newDate: date,
            timestamp: new Date().toISOString(),
          });

          // Get current validation states
          const currentTravelStatusValidation =
            state.travelStatusStepValidation;
          const currentInformedDateValidation =
            state.informedDateStepValidation;
          const currentTravelStatusInteraction =
            state.travelStatusStepInteraction;
          const currentInformedDateInteraction =
            state.informedDateStepInteraction;

          const newState = {
            ...state,
            selectedDate: date,
            // Preserve validation states
            travelStatusStepValidation: currentTravelStatusValidation,
            informedDateStepValidation: currentInformedDateValidation,
            travelStatusStepInteraction: currentTravelStatusInteraction,
            informedDateStepInteraction: currentInformedDateInteraction,
            _lastUpdate: Date.now(),
          };

          // Log new state after update
          console.log('=== Phase4Store - Date Change - New State ===', {
            selectedFlights: newState.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            travelStatus: newState.travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value,
            selectedDate: newState.selectedDate,
            timestamp: new Date().toISOString(),
          });

          return newState;
        });
      },
      setSelectedFlight: (flight: Flight | null) => {
        console.log('=== Phase4Store - setSelectedFlight - ENTRY ===', {
          flight: flight
            ? {
                id: flight.id,
                flightNumber: flight.flightNumber,
                date: flight.date,
                departureCity: flight.departureCity,
                arrivalCity: flight.arrivalCity,
              }
            : null,
          storeType: 'phase4Store',
          timestamp: new Date().toISOString(),
        });

        set((state) => {
          // Get current state for logging
          console.log('=== Phase4Store - Current State ===', {
            selectedFlights: state.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            travelStatus: state.travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value,
            timestamp: new Date().toISOString(),
          });

          // If no flight is selected, clear the current selection
          if (!flight) {
            console.log('=== Phase4Store - Clearing Selected Flight ===');
            // Only clear actual flights in flightStore, not original flights
            useFlightStore.getState().setSelectedFlights([]);
            return {
              ...state,
              selectedFlight: null,
              selectedFlights: [],
              _lastUpdate: Date.now(),
            };
          }

          // Get travel status
          const travelStatus = state.travelStatusAnswers.find(
            (a) => a.questionId === 'travel_status'
          )?.value;

          if (state.selectedType === 'direct') {
            const updatedDirectFlight = {
              ...state.directFlight,
              selectedFlight: flight,
            };

            const newSelectedFlights = [flight];

            // For alternative flight scenarios, save as actual flights taken
            if (
              travelStatus === 'provided' ||
              travelStatus === 'took_alternative_own'
            ) {
              console.log('=== Phase4Store - Updating FlightStore ===', {
                newSelectedFlights: newSelectedFlights.map((f) => ({
                  id: f.id,
                  flightNumber: f.flightNumber,
                  date: f.date,
                  departureCity: f.departureCity,
                  arrivalCity: f.arrivalCity,
                })),
                travelStatus,
                timestamp: new Date().toISOString(),
              });
              useFlightStore.getState().setSelectedFlights(newSelectedFlights);
            }

            const newState = {
              ...state,
              selectedFlight: flight,
              selectedFlights: newSelectedFlights,
              directFlight: updatedDirectFlight,
              _lastUpdate: Date.now(),
            };

            console.log('=== Phase4Store - New State (Direct) ===', {
              selectedFlights: newState.selectedFlights.map((f) => ({
                id: f.id,
                flightNumber: f.flightNumber,
                date: f.date,
                departureCity: f.departureCity,
                arrivalCity: f.arrivalCity,
              })),
              timestamp: new Date().toISOString(),
            });

            return newState;
          }

          // For multi-city flights
          const updatedFlightSegments = [...state.flightSegments];
          const currentSegment = updatedFlightSegments[
            state.currentSegmentIndex
          ] || {
            fromLocation: null,
            toLocation: null,
            date: null,
            selectedFlight: null,
          };

          updatedFlightSegments[state.currentSegmentIndex] = {
            ...currentSegment,
            selectedFlight: flight,
          };

          const updatedSelectedFlights = updatedFlightSegments
            .map((segment) => segment.selectedFlight)
            .filter((f): f is Flight => f !== null);

          // For alternative flight scenarios, save as actual flights taken
          if (
            travelStatus === 'provided' ||
            travelStatus === 'took_alternative_own'
          ) {
            console.log('=== Phase4Store - Updating FlightStore (Multi) ===', {
              updatedSelectedFlights: updatedSelectedFlights.map((f) => ({
                id: f.id,
                flightNumber: f.flightNumber,
                date: f.date,
                departureCity: f.departureCity,
                arrivalCity: f.arrivalCity,
              })),
              travelStatus,
              timestamp: new Date().toISOString(),
            });
            useFlightStore
              .getState()
              .setSelectedFlights(updatedSelectedFlights);
          }

          const newState = {
            ...state,
            selectedFlight: flight,
            selectedFlights: updatedSelectedFlights,
            flightSegments: updatedFlightSegments,
            _lastUpdate: Date.now(),
          };

          console.log('=== Phase4Store - New State (Multi) ===', {
            selectedFlights: newState.selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            timestamp: new Date().toISOString(),
          });

          return newState;
        });
      },
      setSelectedFlights: (flights: Flight[]) => {
        console.log('=== Phase4Store - setSelectedFlights - ENTRY ===', {
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

        // Get current state to check travel status
        const state = get();
        const travelStatus = state.travelStatusAnswers.find(
          (a) => a.questionId === 'travel_status'
        )?.value;

        console.log('=== Phase4Store - Current State ===', {
          currentSelectedFlights: state.selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          travelStatus,
          timestamp: new Date().toISOString(),
        });

        // For alternative flight scenarios, update both stores
        if (
          travelStatus === 'provided' ||
          travelStatus === 'took_alternative_own'
        ) {
          console.log('=== Phase4Store - Updating FlightStore ===', {
            newFlights: flights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            travelStatus,
            timestamp: new Date().toISOString(),
          });
          // Update flightStore with selected flights
          useFlightStore.getState().setSelectedFlights(flights);
        }

        const newState = {
          ...state,
          selectedFlights: flights,
          _lastUpdate: Date.now(),
        };

        console.log('=== Phase4Store - Final State ===', {
          selectedFlights: newState.selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });

        set(() => newState);
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
        console.log('=== Phase4Store - resetStore ENTRY ===', {
          currentState: get(),
          wizardType: get().lastAnsweredQuestion?.includes('informed_date')
            ? 'informed_date'
            : 'travel_status',
        });

        set((state) => {
          // Determine which QA to reset based on the last answered question
          const isInformedDate =
            state.lastAnsweredQuestion?.includes('informed_date');

          // Only reset the specific QA's state
          const newState = {
            ...state,
            ...(isInformedDate
              ? {
                  // Reset only informed date state
                  informedDateAnswers: [],
                  informedDateCurrentStep: 0,
                  informedDateShowingSuccess: false,
                  informedDateIsValid: false,
                  informedDateStepValidation: {},
                  informedDateStepInteraction: {},
                }
              : {
                  // Reset only travel status state
                  travelStatusAnswers: [],
                  travelStatusCurrentStep: 0,
                  travelStatusShowingSuccess: false,
                  travelStatusIsValid: false,
                  travelStatusStepValidation: {},
                  travelStatusStepInteraction: {},
                }),
            lastAnsweredQuestion: null,
            _lastUpdate: Date.now(),
          };

          console.log('=== Phase4Store - resetStore EXIT ===', {
            newState,
            isInformedDate,
            travelStatusAnswers: newState.travelStatusAnswers,
            informedDateAnswers: newState.informedDateAnswers,
          });

          return newState;
        });
      },
      setWizardAnswer: (answer) => {
        console.log('=== Phase4Store - setWizardAnswer ENTRY ===', {
          answer,
          currentState: {
            travelStatus: get().travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value,
            selectedFlights: get().selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
          },
          timestamp: new Date().toISOString(),
        });

        // Handle travel status changes
        if (answer.questionId === 'travel_status') {
          const status = answer.value?.toString();
          const existingAnswers = get().travelStatusAnswers;

          console.log('=== Phase4Store - Travel Status Change ===', {
            oldStatus: existingAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value,
            newStatus: status,
            requiresAlternativeFlights:
              status === 'provided' || status === 'took_alternative_own',
            currentSelectedFlights: get().selectedFlights.map((f) => ({
              id: f.id,
              flightNumber: f.flightNumber,
              date: f.date,
              departureCity: f.departureCity,
              arrivalCity: f.arrivalCity,
            })),
            timestamp: new Date().toISOString(),
          });

          // Filter out answers based on new travel status
          const relatedAnswers = existingAnswers.filter((a) => {
            // Always keep travel status answer
            if (a.questionId === 'travel_status') {
              return true;
            }

            // For 'none' status, keep refund_status and ticket_cost
            if (status === 'none') {
              return ['refund_status', 'ticket_cost'].includes(a.questionId);
            }

            // For 'provided' status, keep alternative_flight_airline_expense
            if (
              status === 'provided' &&
              a.questionId === 'alternative_flight_airline_expense'
            ) {
              return true;
            }

            // For 'took_alternative_own' status, keep alternative_flight_own_expense and trip_costs
            if (status === 'took_alternative_own') {
              return ['alternative_flight_own_expense', 'trip_costs'].includes(
                a.questionId
              );
            }

            return false;
          });

          // Clear selected flights if travel status is 'none' or 'self'
          const shouldClearFlights = status === 'none' || status === 'self';
          const shouldKeepFlights =
            status === 'provided' || status === 'took_alternative_own';

          if (shouldClearFlights) {
            console.log('=== Phase4Store - Clearing Flights ===', {
              reason: 'Travel status changed to none/self',
              status,
              timestamp: new Date().toISOString(),
            });
          }

          if (shouldKeepFlights) {
            console.log('=== Phase4Store - Keeping Flights ===', {
              reason: 'Travel status requires alternative flights',
              status,
              currentFlights: get().selectedFlights.map((f) => ({
                id: f.id,
                flightNumber: f.flightNumber,
                date: f.date,
              })),
              timestamp: new Date().toISOString(),
            });
          }

          // Combine new answer with related existing answers
          const newAnswers = [answer, ...relatedAnswers];

          // Update state
          set(() => {
            const newState = {
              travelStatusAnswers: newAnswers,
              lastAnsweredQuestion: answer.questionId,
              selectedFlights: shouldClearFlights ? [] : get().selectedFlights,
              _lastUpdate: Date.now(),
            };

            // If we need alternative flights, ensure flightStore is synced
            if (shouldKeepFlights) {
              const flightStore = useFlightStore.getState();
              flightStore.setSelectedFlights(newState.selectedFlights);
            }

            console.log(
              '=== Phase4Store - New State After Travel Status Change ===',
              {
                travelStatus: status,
                selectedFlights: newState.selectedFlights.map((f) => ({
                  id: f.id,
                  flightNumber: f.flightNumber,
                  date: f.date,
                  departureCity: f.departureCity,
                  arrivalCity: f.arrivalCity,
                })),
                timestamp: new Date().toISOString(),
              }
            );

            return newState;
          });
        } else {
          // For other travel status related questions, preserve existing answers
          const existingTravelStatus = get().travelStatusAnswers.find(
            (a) => a.questionId === 'travel_status'
          );

          // Keep travel status answer and add the new answer
          const newAnswers = existingTravelStatus
            ? [existingTravelStatus, answer]
            : [answer];

          set((state) => ({
            ...state,
            travelStatusAnswers: newAnswers,
            lastAnsweredQuestion: answer.questionId,
            _lastUpdate: Date.now(),
          }));
        }

        console.log('=== Phase4Store - setWizardAnswer EXIT ===', {
          updatedTravelAnswers: get().travelStatusAnswers,
          lastAnsweredQuestion: get().lastAnsweredQuestion,
          currentSelectedFlights: get().selectedFlights.map((f) => ({
            id: f.id,
            flightNumber: f.flightNumber,
            date: f.date,
            departureCity: f.departureCity,
            arrivalCity: f.arrivalCity,
          })),
          timestamp: new Date().toISOString(),
        });
      },
      updateValidationState: (newState) => {
        // Handle travel status and informed date validation states separately
        set((state) => {
          const updates: Partial<Phase4State> = {};

          // Only update travel status validation if provided
          if (
            newState.travelStatusStepValidation ||
            newState.travelStatusStepInteraction ||
            typeof newState.travelStatusShowingSuccess === 'boolean' ||
            typeof newState.travelStatusIsValid === 'boolean' ||
            Array.isArray(newState.travelStatusAnswers)
          ) {
            if (newState.travelStatusStepValidation)
              updates.travelStatusStepValidation = {
                ...state.travelStatusStepValidation,
                ...newState.travelStatusStepValidation,
              };
            if (newState.travelStatusStepInteraction)
              updates.travelStatusStepInteraction = {
                ...state.travelStatusStepInteraction,
                ...newState.travelStatusStepInteraction,
              };
            if (typeof newState.travelStatusShowingSuccess === 'boolean')
              updates.travelStatusShowingSuccess =
                newState.travelStatusShowingSuccess;
            if (typeof newState.travelStatusIsValid === 'boolean')
              updates.travelStatusIsValid = newState.travelStatusIsValid;
            if (Array.isArray(newState.travelStatusAnswers))
              updates.travelStatusAnswers = newState.travelStatusAnswers;
          }

          // Only update informed date validation if provided
          if (
            newState.informedDateStepValidation ||
            newState.informedDateStepInteraction ||
            typeof newState.informedDateShowingSuccess === 'boolean' ||
            typeof newState.informedDateIsValid === 'boolean' ||
            Array.isArray(newState.informedDateAnswers)
          ) {
            if (newState.informedDateStepValidation)
              updates.informedDateStepValidation = {
                ...state.informedDateStepValidation,
                ...newState.informedDateStepValidation,
              };
            if (newState.informedDateStepInteraction)
              updates.informedDateStepInteraction = {
                ...state.informedDateStepInteraction,
                ...newState.informedDateStepInteraction,
              };
            if (typeof newState.informedDateShowingSuccess === 'boolean')
              updates.informedDateShowingSuccess =
                newState.informedDateShowingSuccess;
            if (typeof newState.informedDateIsValid === 'boolean')
              updates.informedDateIsValid = newState.informedDateIsValid;
            if (Array.isArray(newState.informedDateAnswers))
              updates.informedDateAnswers = newState.informedDateAnswers;
          }

          // Update lastAnsweredQuestion if provided
          if (newState.lastAnsweredQuestion !== undefined) {
            updates.lastAnsweredQuestion = newState.lastAnsweredQuestion;
          }

          console.log('=== Phase4Store - Updating validation state ===', {
            currentState: {
              travelStatus: {
                showingSuccess: state.travelStatusShowingSuccess,
                isValid: state.travelStatusIsValid,
                stepValidation: state.travelStatusStepValidation,
                stepInteraction: state.travelStatusStepInteraction,
                answers: state.travelStatusAnswers,
              },
              informedDate: {
                showingSuccess: state.informedDateShowingSuccess,
                isValid: state.informedDateIsValid,
                stepValidation: state.informedDateStepValidation,
                stepInteraction: state.informedDateStepInteraction,
                answers: state.informedDateAnswers,
              },
            },
            updates,
          });

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
        if (
          get().travelStatusCurrentStep === step &&
          get().informedDateCurrentStep === step
        ) {
          return;
        }

        set((state) => {
          // Only create new state if needed
          if (step === 0) {
            return {
              ...state,
              travelStatusCurrentStep: 0,
              travelStatusStepValidation: {},
              travelStatusStepInteraction: {},
              travelStatusShowingSuccess: false,
              travelStatusIsValid: false,
              informedDateCurrentStep: 0,
              informedDateStepValidation: {},
              informedDateStepInteraction: {},
              informedDateShowingSuccess: false,
              informedDateIsValid: false,
              _lastUpdate: Date.now(),
            };
          }

          return {
            ...state,
            travelStatusCurrentStep: step,
            informedDateCurrentStep: step,
            _lastUpdate: Date.now(),
          };
        });
      },
      onRehydrateStorage: () => (state: Phase4State | null) => {
        console.log('=== Phase4Store - Rehydrated from storage ===', state);

        // If we have a valid state, ensure we keep the wizard answers, success state, and selected flights
        if (state) {
          console.log('=== Phase4Store - Restoring wizard state ===', {
            travelStatusAnswers: state.travelStatusAnswers,
            informedDateAnswers: state.informedDateAnswers,
            selectedFlights: state.selectedFlights,
            wizardShowingSuccess: state.travelStatusShowingSuccess,
            wizardIsValid: state.travelStatusIsValid,
            isWizardValid: state.travelStatusIsValid,
            isWizardSubmitted: state.travelStatusAnswers.some(
              (a) => a.questionId === state.lastAnsweredQuestion
            ),
          });

          // Also restore selected flights to flightStore if needed
          if (state.selectedFlights?.length > 0) {
            const travelStatus = state.travelStatusAnswers.find(
              (a) => a.questionId === 'travel_status'
            )?.value;

            if (
              travelStatus === 'provided' ||
              travelStatus === 'took_alternative_own'
            ) {
              useFlightStore
                .getState()
                .setSelectedFlights(state.selectedFlights);
            }
          }

          set((currentState) => ({
            ...currentState,
            selectedFlights: state.selectedFlights || [],
            travelStatusAnswers: state.travelStatusAnswers || [],
            informedDateAnswers: state.informedDateAnswers || [],
            travelStatusShowingSuccess:
              state.travelStatusShowingSuccess || false,
            travelStatusIsValid: state.travelStatusIsValid || false,
            informedDateShowingSuccess:
              state.informedDateShowingSuccess || false,
            informedDateIsValid: state.informedDateIsValid || false,
            _lastUpdate: Date.now(),
          }));
        }
      },
      resetTravelStatusState: () => {
        console.log('=== Phase4Store - resetTravelStatusState ENTRY ===');
        set((state) => ({
          ...state,
          travelStatusAnswers: [],
          travelStatusCurrentStep: 0,
          travelStatusShowingSuccess: false,
          travelStatusIsValid: false,
          travelStatusStepValidation: {},
          travelStatusStepInteraction: {},
          lastAnsweredQuestion: null,
          selectedFlights: [],
          _lastUpdate: Date.now(),
        }));
      },
      resetInformedDateState: () => {
        console.log('=== Phase4Store - resetInformedDateState ENTRY ===');
        set((state) => ({
          ...state,
          informedDateAnswers: [],
          informedDateCurrentStep: 0,
          informedDateShowingSuccess: false,
          informedDateIsValid: false,
          informedDateStepValidation: {},
          informedDateStepInteraction: {},
          lastAnsweredQuestion: null,
          _lastUpdate: Date.now(),
        }));
      },
      batchUpdate: (updates: Partial<Phase4State>) => {
        set((state) => ({
          ...state,
          ...updates,
        }));
      },
    }),
    {
      name: 'phase4Store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Flight selection state
        selectedType: state.selectedType,
        directFlight: state.directFlight,
        flightSegments: state.flightSegments,
        currentSegmentIndex: state.currentSegmentIndex,
        selectedFlights: state.selectedFlights,
        originalFlights: state.originalFlights,

        // Travel Status QA state
        travelStatusAnswers: state.travelStatusAnswers,
        travelStatusCurrentStep: state.travelStatusCurrentStep,
        travelStatusShowingSuccess: state.travelStatusShowingSuccess,
        travelStatusIsValid: state.travelStatusIsValid,
        travelStatusStepValidation: state.travelStatusStepValidation,
        travelStatusStepInteraction: state.travelStatusStepInteraction,

        // Informed Date QA state
        informedDateAnswers: state.informedDateAnswers,
        informedDateCurrentStep: state.informedDateCurrentStep,
        informedDateShowingSuccess: state.informedDateShowingSuccess,
        informedDateIsValid: state.informedDateIsValid,
        informedDateStepValidation: state.informedDateStepValidation,
        informedDateStepInteraction: state.informedDateStepInteraction,

        // Shared state
        lastAnsweredQuestion: state.lastAnsweredQuestion,
        _lastUpdate: state._lastUpdate,
      }),
    }
  )
);
