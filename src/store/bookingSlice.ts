import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Answer, Flight } from '@/types/wizard';

interface BookingState {
  currentStep: number;
  completedSteps: number[];
  progress: number;
  selectedFlight: Flight | null;
  wizardAnswers: Answer[];
  fromLocation: string | null;
  toLocation: string | null;
  focusedInput: 'from' | 'to' | null;
}

const initialState: BookingState = {
  currentStep: 1,
  completedSteps: [],
  progress: 0,
  selectedFlight: null,
  wizardAnswers: [],
  fromLocation: null,
  toLocation: null,
  focusedInput: null,
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
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      state.fromLocation = action.payload;
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      state.toLocation = action.payload;
    },
    setFocusedInput: (state, action: PayloadAction<'from' | 'to' | null>) => {
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
  setFromLocation,
  setToLocation,
  setFocusedInput,
} = bookingSlice.actions;

export default bookingSlice.reducer;