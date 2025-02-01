import { ValidationManager } from '@/lib/validation/ValidationManager';
import { PassengerDetails } from './store';
import { Answer } from './wizard';

export type FunnelStep =
  | 'initial_assessment'
  | 'flight_details'
  | 'trip_experience'
  | 'compensation_estimate';

export interface StepComponentProps {
  onComplete: (data: any) => Promise<void>;
  validationManager: ValidationManager;
  isActive: boolean;
}

export interface InitialAssessmentData {
  wizardAnswers: Answer[];
  personalDetails: PassengerDetails;
}

export interface FlightDetailsData {
  selectedFlights: any[]; // Replace with proper flight type
  bookingDetails: any; // Replace with proper booking type
}

export interface TripExperienceData {
  experienceAnswers: Answer[];
  attachments: File[];
}

export type StepData =
  | InitialAssessmentData
  | FlightDetailsData
  | TripExperienceData;

export interface FunnelState {
  currentStep: FunnelStep;
  completedSteps: FunnelStep[];
  stepData: Partial<Record<FunnelStep, StepData>>;
  isValid: boolean;
}
