export interface Flight {
  id: string;
  departure: string;
  arrival: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime: string;
  date: string;
  duration: string;
  flightNumber: string;
  airline: string;
  price: number;
  stops: number;
  aircraft: string;
  class: string;
  status?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  scheduledDepartureTime?: string;
  bookingReference?: string;
  flightDate?: string;
  actualDeparture?: string | null;
  actualArrival?: string | null;
  dep_city?: string;
  arr_city?: string;
  dep_iata?: string;
  arr_iata?: string;
  dep_time_sched?: string;
  arr_time_sched?: string;
  arrivalDelay?: number | null;
}

export interface Answer {
  questionId: string;
  value: string;
}

export interface PassengerDetails {
  firstName: string;
  lastName: string;
  email: string;
  salutation: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
}

export interface Question {
  id: string;
  type: 'text' | 'money' | 'date' | 'select';
  text: string;
  options?: string[];
  showIf?: (answers: Answer[]) => boolean;
}

export interface LocationData {
  value: string;
  label: string;
  description: string;
  city: string;
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
