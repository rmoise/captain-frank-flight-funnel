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
  evaluationResult: {
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
  };
  _lastUpdate?: number;
}

export interface EvaluationActions {
  setEvaluationResult: (result: EvaluationResult | null) => void;
}

export const initialEvaluationState: EvaluationSlice = {
  evaluationResult: {
    status: null,
    guid: undefined,
    recommendation_guid: undefined,
    contract: undefined,
    rejection_reasons: undefined,
    journey_booked_flightids: undefined,
    journey_fact_flightids: undefined,
    information_received_at: undefined,
    travel_status: undefined,
    delay_duration: undefined
  },
  _lastUpdate: Date.now(),
};

export const createEvaluationSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): EvaluationActions => ({
  setEvaluationResult: (result) => {
    set((state) => ({
      ...state,
      evaluationResult: result || initialEvaluationState.evaluationResult,
      _lastUpdate: Date.now(),
    }));
  },
});
