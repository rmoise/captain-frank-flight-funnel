import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Flight, PassengerDetails } from '@/types';
import type { Answer } from '@/types/wizard';

export interface BookingState {
  currentStep: number;
  selectedFlight: Flight | null;
  wizardAnswers: Answer[];
  completedSteps: number[];
  fromLocation: string | null;
  toLocation: string | null;
  focusedInput: string | null;
  personalDetails: PassengerDetails | null;
  phaseProgress: {
    'claim-details': number;
    documentation: number;
    review: number;
    complete: number;
  };
}

const initialState: BookingState = {
  currentStep: 1,
  selectedFlight: null,
  wizardAnswers: [],
  completedSteps: [],
  fromLocation: null,
  toLocation: null,
  focusedInput: null,
  personalDetails: null,
  phaseProgress: {
    'claim-details': 0,
    documentation: 0,
    review: 0,
    complete: 0,
  },
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload;
    },
    completeStep: (state, action: PayloadAction<number>) => {
      if (!state.completedSteps.includes(action.payload)) {
        state.completedSteps.push(action.payload);
      }
    },
    markStepIncomplete: (state, action: PayloadAction<number>) => {
      state.completedSteps = state.completedSteps.filter(
        (step) => step !== action.payload
      );
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setSelectedFlight: (state, action: PayloadAction<Flight>) => {
      state.selectedFlight = action.payload;
    },
    setWizardAnswers: (state, action: PayloadAction<Answer[]>) => {
      state.wizardAnswers = action.payload;
    },
    setPersonalDetails: (state, action: PayloadAction<PassengerDetails | null>) => {
      state.personalDetails = action.payload;
    },
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      state.fromLocation = action.payload;
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      state.toLocation = action.payload;
    },
    setFocusedInput: (state, action: PayloadAction<string | null>) => {
      state.focusedInput = action.payload;
    },
  },
});

export const {
  setStep,
  completeStep,
  markStepIncomplete,
  setProgress,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
  setFromLocation,
  setToLocation,
  setFocusedInput,
} = bookingSlice.actions;

export default bookingSlice.reducer;