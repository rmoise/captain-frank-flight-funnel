'use client';

import React, { createContext, useContext, useReducer } from 'react';
import type { Flight } from '../types';
import type { PassengerDetails } from '../types/store';

interface BookingState {
  currentStep: number;
  selectedFlights: Flight[];
  experienceType: string | null;
  passengerDetails: PassengerDetails | null;
  completedSteps: number[];
  skippedSteps: number[];
  fromLocations: string[];
  toLocations: string[];
  focusedInput: string | null;
  progress: number;
  phaseProgress: {
    'claim-details': number;
    documentation: number;
    review: number;
    complete: number;
  };
}

type BookingAction =
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_FLIGHT'; payload: Flight | null }
  | { type: 'SET_EXPERIENCE'; payload: string | null }
  | { type: 'SET_PASSENGER_DETAILS'; payload: PassengerDetails }
  | { type: 'COMPLETE_STEP'; payload: number }
  | { type: 'INCOMPLETE_STEP'; payload: number }
  | { type: 'SKIP_STEP'; payload: number }
  | { type: 'SET_FROM_LOCATION'; payload: string | null }
  | { type: 'SET_TO_LOCATION'; payload: string | null }
  | { type: 'SET_FOCUSED_INPUT'; payload: string | null }
  | { type: 'SET_PROGRESS'; payload: number }
  | { type: 'RESET' }
  | {
      type: 'UPDATE_PHASE_PROGRESS';
      payload: { phase: string; progress: number };
    };

interface BookingContextType {
  state: BookingState;
  dispatch: React.Dispatch<BookingAction>;
}

const initialState: BookingState = {
  currentStep: 1,
  selectedFlights: [],
  experienceType: null,
  passengerDetails: null,
  completedSteps: [],
  skippedSteps: [],
  fromLocations: [],
  toLocations: [],
  focusedInput: null,
  progress: 0,
  phaseProgress: {
    'claim-details': 0,
    documentation: 0,
    review: 0,
    complete: 0,
  },
};

function bookingReducer(
  state: BookingState,
  action: BookingAction
): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };

    case 'SET_FLIGHT':
      return {
        ...state,
        selectedFlights: action.payload
          ? [...state.selectedFlights, action.payload]
          : state.selectedFlights.filter((flight) => flight !== action.payload),
        currentStep: action.payload ? state.currentStep : 1,
      };

    case 'SET_EXPERIENCE':
      return {
        ...state,
        experienceType: action.payload,
        completedSteps: [...state.completedSteps, 2].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
        skippedSteps: state.skippedSteps.filter((step) => step !== 2),
      };

    case 'SET_PASSENGER_DETAILS':
      return {
        ...state,
        passengerDetails: action.payload,
        completedSteps: [...state.completedSteps, 3].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
        skippedSteps: state.skippedSteps.filter((step) => step !== 3),
      };

    case 'COMPLETE_STEP':
      return {
        ...state,
        completedSteps: [...state.completedSteps, action.payload].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
      };

    case 'INCOMPLETE_STEP':
      return {
        ...state,
        completedSteps: state.completedSteps.filter(
          (step) => step !== action.payload
        ),
      };

    case 'SKIP_STEP':
      return {
        ...state,
        skippedSteps: [...state.skippedSteps, action.payload].filter(
          (v, i, a) => a.indexOf(v) === i
        ),
        completedSteps: state.completedSteps.filter(
          (step) => step !== action.payload
        ),
      };

    case 'SET_FROM_LOCATION':
      return {
        ...state,
        fromLocations: action.payload
          ? [...state.fromLocations, action.payload]
          : state.fromLocations.filter(
              (location) => location !== action.payload
            ),
      };

    case 'SET_TO_LOCATION':
      return {
        ...state,
        toLocations: action.payload
          ? [...state.toLocations, action.payload]
          : state.toLocations.filter((location) => location !== action.payload),
      };

    case 'SET_FOCUSED_INPUT':
      return {
        ...state,
        focusedInput: action.payload,
      };

    case 'SET_PROGRESS':
      return {
        ...state,
        progress: action.payload,
      };

    case 'RESET':
      return initialState;

    case 'UPDATE_PHASE_PROGRESS':
      return {
        ...state,
        phaseProgress: {
          ...state.phaseProgress,
          [action.payload.phase]: action.payload.progress,
        },
      };

    default:
      return state;
  }
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingContext() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
}
