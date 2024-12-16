import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/types/store';
import { Flight, PassengerDetails } from '@/types';
import { Answer } from '@/types/wizard';
import type { BookingState } from '@/types/store';

const initialState: BookingState = {
  progress: 0,
  currentStep: 1,
  selectedFlight: null,
  wizardAnswers: [],
  personalDetails: null,
  completedSteps: [],
  fromLocation: null,
  toLocation: null,
  focusedInput: null,
  flightTypes: [],
  phaseProgress: {
    'claim-details': 0,
    documentation: 0,
    review: 0,
    complete: 0,
  },
};

export const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setStep: (state, action: PayloadAction<number>) => {
      state.currentStep = Math.max(1, action.payload);
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
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      state.fromLocation = action.payload;
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      state.toLocation = action.payload;
    },
    setFocusedInput: (state, action: PayloadAction<string | null>) => {
      state.focusedInput = action.payload;
    },
    setSelectedFlight: (state, action: PayloadAction<Flight | null>) => {
      state.selectedFlight = action.payload;
    },
    setWizardAnswers: (state, action: PayloadAction<Answer[]>) => {
      state.wizardAnswers = action.payload;
      if (action.payload.length === 0 && state.completedSteps.includes(2)) {
        state.completedSteps = state.completedSteps.filter(step => step !== 2);
      }
    },
    setPersonalDetails: (state, action: PayloadAction<PassengerDetails | null>) => {
      state.personalDetails = action.payload;
      if (!action.payload && state.completedSteps.includes(3)) {
        state.completedSteps = state.completedSteps.filter(step => step !== 3);
      }
    },
  },
});

export const {
  setStep,
  completeStep,
  markStepIncomplete,
  setFromLocation,
  setToLocation,
  setFocusedInput,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
} = bookingSlice.actions;

export const selectBooking = (state: RootState) => state.booking;

export default bookingSlice.reducer;