import type { Flight } from '@/types/store';

// Re-export types from components
export type {
  Location,
  AutocompleteInputProps,
} from '@/components/shared/AutocompleteInput';

// Export other common types
export type { Flight } from '@/types/store';

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
  postalCode: string;
}

export interface PersonalDetailsFormProps {
  onSubmit: (data: PassengerDetails) => void;
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
}

export interface ProgressState {
  currentPhase: number;
  completedPhases: number[];
  completedSteps: number[];
}
