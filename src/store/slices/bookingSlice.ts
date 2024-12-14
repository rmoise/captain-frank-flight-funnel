import { type PayloadAction, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { Answer } from '@/types/wizard';

interface PersonalDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

interface BookingState {
  currentStep: number;
  completedSteps: number[];
  progress: number;
  phaseProgress: number;
  fromLocation: string | null;
  toLocation: string | null;
  focusedInput: string | null;
  selectedFlight: any | null;
  wizardAnswers: Answer[];
  personalDetails: PersonalDetails | null;
}

const initialState: BookingState = {
  currentStep: 1,
  completedSteps: [],
  progress: 0,
  phaseProgress: 0,
  fromLocation: null,
  toLocation: null,
  focusedInput: null,
  selectedFlight: null,
  wizardAnswers: [],
  personalDetails: null,
};

export const bookingSlice = createSlice({
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
      state.completedSteps = state.completedSteps.filter(step => step !== action.payload);
    },
    setProgress: (state, action: PayloadAction<number>) => {
      state.progress = action.payload;
    },
    setPhaseProgress: (state, action: PayloadAction<number>) => {
      state.phaseProgress = action.payload;
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
    setSelectedFlight: (state, action: PayloadAction<any | null>) => {
      state.selectedFlight = action.payload;
    },
    setWizardAnswers: (state, action: PayloadAction<Answer[]>) => {
      state.wizardAnswers = action.payload;
    },
    setPersonalDetails: (state, action: PayloadAction<PersonalDetails>) => {
      state.personalDetails = action.payload;
    },
  },
});

export const {
  setStep,
  completeStep,
  markStepIncomplete,
  setProgress,
  setPhaseProgress,
  setFromLocation,
  setToLocation,
  setFocusedInput,
  setSelectedFlight,
  setWizardAnswers,
  setPersonalDetails,
} = bookingSlice.actions;

// Selectors
export const selectBooking = (state: RootState) => state.booking;

export default bookingSlice.reducer;