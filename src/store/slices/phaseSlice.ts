import { ValidationPhase } from "@/types/shared/validation";
import type {
  PhaseActions,
  SliceCreator,
  Flight,
  FlightSegment,
} from "../types";

export const createPhaseSlice: SliceCreator<PhaseActions> = (set, get) => ({
  savePhaseData: (phase, data) => {
    set((state) => {
      return {
        phases: {
          ...state.phases,
          [phase]: {
            currentPhase: phase,
            phases: {
              ...((state.phases[phase] && state.phases[phase].phases) || {}),
              [phase]: {
                data,
                status: "pending",
                errors: [],
                timestamp: Date.now(),
              },
            },
          },
        },
      };
    });
  },

  completePhase: (phase) => {
    set((state) => {
      return {
        phases: {
          ...state.phases,
          [phase]: {
            currentPhase: phase,
            phases: {
              ...((state.phases[phase] && state.phases[phase].phases) || {}),
              [phase]: {
                data:
                  (
                    (state.phases[phase] &&
                      state.phases[phase].phases &&
                      state.phases[phase].phases[phase]) ||
                    {}
                  ).data || {},
                status: "complete",
                errors: [],
                timestamp: Date.now(),
              },
            },
          },
        },
      };
    });
  },

  setPhaseError: (phase, error) => {
    set((state) => {
      const currentPhaseData = (state.phases[phase] &&
        state.phases[phase].phases &&
        state.phases[phase].phases[phase]) || { data: {}, errors: [] };

      return {
        phases: {
          ...state.phases,
          [phase]: {
            currentPhase: phase,
            phases: {
              ...((state.phases[phase] && state.phases[phase].phases) || {}),
              [phase]: {
                data: currentPhaseData.data || {},
                status: "error",
                errors: [...(currentPhaseData.errors || []), error],
                timestamp: Date.now(),
              },
            },
          },
        },
      };
    });
  },

  clearPhaseErrors: (phase) => {
    set((state) => {
      const currentPhaseData = (state.phases[phase] &&
        state.phases[phase].phases &&
        state.phases[phase].phases[phase]) || { data: {} };

      return {
        phases: {
          ...state.phases,
          [phase]: {
            currentPhase: phase,
            phases: {
              ...((state.phases[phase] && state.phases[phase].phases) || {}),
              [phase]: {
                data: currentPhaseData.data || {},
                status: "pending",
                errors: [],
                timestamp: Date.now(),
              },
            },
          },
        },
      };
    });
  },

  validatePhase: (phase) => {
    const state = get();

    // Check if phase exists
    if (
      !state.phases[phase] ||
      !state.phases[phase].phases ||
      !state.phases[phase].phases[phase]
    ) {
      return false;
    }

    const phaseData = state.phases[phase].phases[phase];

    // Check if phase has any validation errors
    if (phaseData.errors && phaseData.errors.length > 0) {
      return false;
    }

    // Check if required data is present based on phase
    switch (phase) {
      case ValidationPhase.INITIAL_ASSESSMENT:
        return state.flight.type !== null && state.flight.segments.length > 0;

      case ValidationPhase.COMPENSATION_ESTIMATE:
        return Object.keys(state.flight.selectedFlights).length > 0;

      case ValidationPhase.FLIGHT_DETAILS:
        return state.flight.segments.every(
          (segment: FlightSegment) =>
            segment.origin && segment.destination && segment.departureTime
        );

      case ValidationPhase.TRIP_EXPERIENCE:
        return state.validation.stepValidation[phase] === true;

      case ValidationPhase.AGREEMENT:
        return (
          state.user.consents.terms &&
          state.user.consents.privacy &&
          state.user.signature !== null
        );

      default:
        return true;
    }
  },

  canProceedToNextPhase: () => {
    const state = get();
    const currentPhase = state.navigation.currentPhase;

    // Check if current phase is valid
    if (!state.actions.phase.validatePhase(currentPhase)) {
      return false;
    }

    // Check if all previous phases are complete
    const previousPhases = Object.values(ValidationPhase).filter(
      (phase) => phase < currentPhase
    );

    return previousPhases.every((phase) => {
      return (
        state.phases[phase] &&
        state.phases[phase].phases &&
        state.phases[phase].phases[phase] &&
        state.phases[phase].phases[phase].status === "complete"
      );
    });
  },
});
