// Types
interface EvaluationState {
  status: "idle" | "loading" | "error" | "success";
  data: {
    status?: "accept" | "reject";
    guid?: string;
    recommendation_guid?: string;
    contract?: {
      amount: number;
      provision: number;
    };
    rejection_reasons?: Record<string, string>;
  } | null;
  error: {
    code: string;
    message: string;
    details?: any;
  } | null;
  lastUpdate: number;
}

interface EvaluationActions {
  evaluate: (request: {
    journey_booked_flightids: string[];
    journey_fact_flightids: string[];
    information_received_at: string;
    journey_fact_type: "none" | "self" | "provided";
  }) => Promise<void>;
  reset: () => void;
}

const initialState: EvaluationState = {
  status: "idle",
  data: null,
  error: null,
  lastUpdate: Date.now(),
};

export const createEvaluationSlice = (
  set: (
    partial:
      | EvaluationState
      | Partial<EvaluationState>
      | ((
          state: EvaluationState
        ) => EvaluationState | Partial<EvaluationState>),
    replace?: boolean
  ) => void
) => ({
  ...initialState,

  actions: {
    evaluate: async (request: {
      journey_booked_flightids: string[];
      journey_fact_flightids: string[];
      information_received_at: string;
      journey_fact_type: "none" | "self" | "provided";
    }) => {
      set({ status: "loading", error: null, lastUpdate: Date.now() });

      try {
        // TODO: Replace with actual API call
        const response = await fetch("/api/evaluateeuflightclaim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        });

        const result = await response.json();

        if (!response.ok) {
          throw result.error || new Error("Evaluation failed");
        }

        set({
          status: "success",
          data: result.data,
          lastUpdate: Date.now(),
        });
      } catch (error: unknown) {
        const errorObj = error as any; // Type assertion for error handling
        set({
          status: "error",
          error: {
            code: errorObj?.code || "UNKNOWN_ERROR",
            message: errorObj?.message || "An unknown error occurred",
            details: errorObj?.details,
          },
          lastUpdate: Date.now(),
        });
      }
    },

    reset: () => {
      set({ ...initialState, lastUpdate: Date.now() });
    },
  },
});

// Export types
export type { EvaluationState, EvaluationActions };
