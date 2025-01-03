import { create } from 'zustand';
import type { Flight, Answer, PassengerDetails } from '@/types/store';

export interface BookingState {
  wizardAnswers: Answer[];
  personalDetails: PassengerDetails | null;
  selectedFlight: Flight | null;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  fromLocation: string | null;
  toLocation: string | null;
  setWizardAnswers: (answers: Answer[]) => void;
  setPersonalDetails: (details: PassengerDetails | null) => void;
  setSelectedFlight: (flight: Flight | null) => void;
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setMarketingAccepted: (accepted: boolean) => void;
  setFromLocation: (location: string | null) => void;
  setToLocation: (location: string | null) => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  wizardAnswers: [],
  personalDetails: null,
  selectedFlight: null,
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
  fromLocation: null,
  toLocation: null,
  setWizardAnswers: (answers) => set({ wizardAnswers: answers }),
  setPersonalDetails: (details) => set({ personalDetails: details }),
  setSelectedFlight: (flight) => set({ selectedFlight: flight }),
  setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),
  setPrivacyAccepted: (accepted) => set({ privacyAccepted: accepted }),
  setMarketingAccepted: (accepted) => set({ marketingAccepted: accepted }),
  setFromLocation: (location) => set({ fromLocation: location }),
  setToLocation: (location) => set({ toLocation: location }),
}));
