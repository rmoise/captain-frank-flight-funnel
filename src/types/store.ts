import type { Flight } from './index';
import type { Answer } from './wizard';
import type { PassengerDetails } from './index';

export interface RootState {
  booking: BookingState;
  // Add other slices as needed
}

export interface BookingState {
  progress: number;
  currentStep: number;
  selectedFlight: Flight | null;
  wizardAnswers: Answer[];
  completedSteps: number[];
  fromLocation: string | null;
  toLocation: string | null;
  focusedInput: string | null;
  personalDetails: PassengerDetails | null;
  flightTypes?: { id: string; label: string }[];
  phaseProgress: {
    'claim-details': number;
    documentation: number;
    review: number;
    complete: number;
  };
}