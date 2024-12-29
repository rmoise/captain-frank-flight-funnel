import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Flight, Answer, PassengerDetails } from '@/types/store';

interface BookingState {
  wizardAnswers: Answer[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  selectedFlight: Flight | null;
  personalDetails: PassengerDetails | null;
  fromLocation: string | null;
  toLocation: string | null;
  completedSteps: number[];
  completedPhases: number[];
  bookingNumber: string | null;
  compensationAmount: number | null;
}

const initialState: BookingState = {
  wizardAnswers: [],
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
  selectedFlight: null,
  personalDetails: null,
  fromLocation: null,
  toLocation: null,
  completedSteps: [],
  completedPhases: [],
  bookingNumber: null,
  compensationAmount: null,
};

const bookingSlice = createSlice({
  name: 'booking',
  initialState,
  reducers: {
    setWizardAnswers: (state, action: PayloadAction<Answer[]>) => {
      state.wizardAnswers = action.payload;
    },
    setPersonalDetails: (state, action: PayloadAction<PassengerDetails>) => {
      state.personalDetails = action.payload;
    },
    setSelectedFlight: (state, action: PayloadAction<Flight | null>) => {
      state.selectedFlight = action.payload;
    },
    setFromLocation: (state, action: PayloadAction<string | null>) => {
      state.fromLocation = action.payload;
    },
    setToLocation: (state, action: PayloadAction<string | null>) => {
      state.toLocation = action.payload;
    },
    setTermsAccepted: (state, action: PayloadAction<boolean>) => {
      state.termsAccepted = action.payload;
    },
    setPrivacyAccepted: (state, action: PayloadAction<boolean>) => {
      state.privacyAccepted = action.payload;
    },
    setMarketingAccepted: (state, action: PayloadAction<boolean>) => {
      state.marketingAccepted = action.payload;
    },
    setBookingNumber: (state, action: PayloadAction<string | null>) => {
      state.bookingNumber = action.payload;
    },
    setCompensationAmount: (state, action: PayloadAction<number | null>) => {
      state.compensationAmount = action.payload;
    },
  },
});

export const {
  setWizardAnswers,
  setPersonalDetails,
  setSelectedFlight,
  setFromLocation,
  setToLocation,
  setTermsAccepted,
  setPrivacyAccepted,
  setMarketingAccepted,
  setBookingNumber,
  setCompensationAmount,
} = bookingSlice.actions;
export default bookingSlice.reducer;
