import { StoreStateValues } from '../types';

export interface EvaluationResult {
  status: 'accept' | 'reject' | null;
  guid?: string;
  recommendation_guid?: string;
  contract?: {
    amount: number;
    provision: number;
  };
  rejection_reasons?: string[];
  journey_booked_flightids?: string[];
  journey_fact_flightids?: string[];
  information_received_at?: string;
  travel_status?: string;
  delay_duration?: string;
  message?: string;
}

export interface EvaluationSlice {
  evaluationResult: EvaluationResult | undefined;
}

export interface EvaluationActions {
  setEvaluationResult: (result: EvaluationResult | undefined) => void;
}

export const initialEvaluationState: EvaluationSlice = {
  evaluationResult: undefined,
};

export const createEvaluationSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): EvaluationActions => ({
  setEvaluationResult: (result) => {
    set(() => ({
      evaluationResult: result || undefined,
    }));
  },
});
