import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Flight, PassengerDetails } from '@/types';
import type { Answer } from '@/types/wizard';

interface TripDetails {
  whatHappened: string;
  actualFlights: string;
  tripCost: string;
  informedDate: string;
}

interface ExtendedPersonalDetails {
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  dateOfBirth: string;
  nationality: string;
}

interface Agreement {
  hasAcceptedTerms: boolean;
  signature: string;
  signedAt: string;
}

interface FlightDetails {
  flightDate: string;
  flightNumber: string;
  bookingReference: string;
}

interface BookingState {
  currentStep: number;
  selectedFlight: Flight | null;
  wizardAnswers: Answer[];
  personalDetails: PassengerDetails | null;
  completedSteps: number[];
  phaseProgress: {
    'claim-details': number;
    documentation: number;
    review: number;
    complete: number;
  };
  // Flight selector state
  fromLocation: string | null;
  toLocation: string | null;
  focusedInput: 'from' | 'to' | null;
  // New state for additional phases
  flightDetails: FlightDetails | null;
  tripDetails: TripDetails | null;
  extendedPersonalDetails: ExtendedPersonalDetails | null;
  agreement: Agreement | null;
  currentPhase: number;
  completedPhases: number[];
  progress: number;
}

const initialState: BookingState = {
  currentStep: 1,
  selectedFlight: null,
  wizardAnswers: [],
  personalDetails: null,
  completedSteps: [],
  phaseProgress: {
    'claim-details': 0,
    documentation: 0,
    review: 0,
    complete: 0
  },
  // Initialize flight selector state
  fromLocation: null,
  toLocation: null,
  focusedInput: null,
  // Initialize new state
  flightDetails: null,
  tripDetails: null,
  extendedPersonalDetails: null,
  agreement: null,
  currentPhase: 1,
  completedPhases: [],
  progress: 0
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    setSelectedFlight: (state, action: PayloadAction<Flight | null>) => {
      state.selectedFlight = action.payload;
    },
    setWizardAnswers: (state, action: PayloadAction<Answer[]>) => {
      state.wizardAnswers = action.payload;
    },
    setPersonalDetails: (state, action: PayloadAction<PassengerDetails | null>) => {
      state.personalDetails = action.payload;
    },
    completeStep: (state, action: PayloadAction<number>) => {
      if (!state.completedSteps.includes(action.payload)) {
        state.completedSteps.push(action.payload);
      }
    },
    markStepIncomplete: (state, action: PayloadAction<number>) => {
      state.completedSteps = state.completedSteps.filter(step => step !== action.payload);
    },
    // Flight selector actions
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      state.fromLocation = action.payload;
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      state.toLocation = action.payload;
    },
    setFocusedInput: (state, action: PayloadAction<'from' | 'to' | null>) => {
      state.focusedInput = action.payload;
    },
    // New reducers for additional phases
    setFlightDetails: (state, action: PayloadAction<FlightDetails>) => {
      state.flightDetails = action.payload;
    },
    setTripDetails: (state, action: PayloadAction<TripDetails>) => {
      state.tripDetails = action.payload;
    },
    setExtendedPersonalDetails: (state, action: PayloadAction<ExtendedPersonalDetails>) => {
      state.extendedPersonalDetails = action.payload;
    },
    setAgreement: (state, action: PayloadAction<Agreement>) => {
      state.agreement = action.payload;
    },
    setPhase: (state, action: PayloadAction<number>) => {
      state.currentPhase = action.payload;
    },
    completePhase: (state, action: PayloadAction<number>) => {
      if (!state.completedPhases.includes(action.payload)) {
        state.completedPhases.push(action.payload);
      }
    },
    resetPhase: (state, action: PayloadAction<number>) => {
      state.completedPhases = state.completedPhases.filter(phase => phase !== action.payload);
      // Reset phase-specific data
      switch (action.payload) {
        case 3:
          state.flightDetails = null;
          break;
        case 4:
          state.tripDetails = null;
          break;
        case 5:
          state.extendedPersonalDetails = null;
          break;
        case 6:
          state.agreement = null;
          break;
      }
    },
    resetBooking: () => {
      return initialState;
    }
  },
});

export const {
  setStep,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
  completeStep,
  markStepIncomplete,
  setFromLocation,
  setToLocation,
  setFocusedInput,
  setFlightDetails,
  setTripDetails,
  setExtendedPersonalDetails,
  setAgreement,
  setPhase,
  completePhase,
  resetPhase,
  resetBooking
} = bookingSlice.actions;

export default bookingSlice.reducer;