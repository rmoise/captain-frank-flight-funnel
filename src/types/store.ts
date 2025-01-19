import type { LocationLike } from './location';
import type { Question } from './experience';
import { Answer as WizardAnswer } from './wizard';

export interface Flight {
  id: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  airline: string;
  status: string;
  departureAirport: string;
  arrivalAirport: string;
  scheduledDepartureTime: string;
  scheduledArrivalTime: string;
  actualDeparture: string | null;
  actualArrival: string | null;
  arrivalDelay: number | null;
  duration: string;
  stops: number;
  aircraft: string;
  class: string;
  price: number;
  bookingReference?: string;
  connectionInfo?: string;
}

export interface Answer {
  questionId: string;
  value: string | number | boolean;
  shouldShow?: boolean;
}

export interface PassengerDetails {
  firstName: string;
  lastName: string;
  email: string;
  salutation: string;
  phone: string;
  address?: string;
  zipCode?: string;
  city?: string;
  country?: string;
}

export interface LocationData {
  value: string;
  label: string;
  description?: string;
  city?: string;
  dropdownLabel?: string;
}

export type { Question };

export interface FlightSegmentData {
  fromLocation: LocationLike | null;
  toLocation: LocationLike | null;
  selectedFlight: Flight | null;
  date: Date | null;
}

export interface Airport {
  iata_code: string;
  name: string;
  lat: number;
  lng: number;
  city?: string;
}

export interface BookingState {
  currentStep: number;
  wizardAnswers: Answer[];
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
  selectedFlight: Flight | null;
  personalDetails: PassengerDetails | null;
  fromLocation: string | null;
  toLocation: string | null;
  completedPhases: number[];
  completedSteps: number[];
  bookingNumber: string;
  compensationAmount: number | null;
}

export interface ProgressState {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
}

export interface StoreState {
  // Flight related
  selectedFlights: Flight[];
  fromLocation: string | null;
  toLocation: string | null;
  selectedDate: string | null;

  // Wizard related
  wizardCurrentStep: number;
  wizardAnswers: Answer[];
  wizardIsCompleted: boolean;
  wizardSuccessMessage: string;
  wizardIsEditingMoney: boolean;
  wizardLastActiveStep: number | null;
  wizardShowingSuccess: boolean;
  wizardValidationState: Record<number, boolean>;
  wizardIsValidating: boolean;

  // User related
  personalDetails: PassengerDetails | null;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;

  // Navigation related
  currentPhase: number;
  completedPhases: number[];
  currentStep: number;
  completedSteps: number[];
  openSteps: number[];

  // Error handling
  locationError: string | null;
}

export type TripExperienceAnswers = WizardAnswer[];
