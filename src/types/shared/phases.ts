import type { Translations } from "@/translations/types";
import { ValidationPhase } from "./validation";

/**
 * Phase definition interface
 */
export interface Phase {
  id: number;
  name: string;
  steps: number[];
}

/**
 * Get phase definitions with translations
 */
export const PHASES = (t: Translations): Phase[] => [
  {
    id: 1,
    name: t.phases.names.initialAssessment,
    steps: [1, 2, 3],
  },
  {
    id: 2,
    name: t.phases.names.summary,
    steps: [4],
  },
  {
    id: 3,
    name: t.phases.names.flightDetails,
    steps: [5, 6],
  },
  {
    id: 4,
    name: t.phases.names.tripExperience,
    steps: [7, 8],
  },
  {
    id: 5,
    name: t.phases.names.claimStatus,
    steps: [9],
  },
  {
    id: 6,
    name: t.phases.names.agreement,
    steps: [10],
  },
  {
    id: 7,
    name: t.phases.names.claimSubmitted,
    steps: [11],
  },
];

/**
 * Total number of phases in the application
 */
export const TOTAL_PHASES = 7;

/**
 * Maps phases to URLs for navigation
 */
export const PHASE_TO_URL: Record<ValidationPhase, string> = {
  [ValidationPhase.INITIAL_ASSESSMENT]: "/phases/initial-assessment",
  [ValidationPhase.COMPENSATION_ESTIMATE]: "/phases/compensation-estimate",
  [ValidationPhase.PERSONAL_DETAILS]: "/phases/personal-details",
  [ValidationPhase.TERMS_AND_CONDITIONS]: "/phases/terms-and-conditions",
  [ValidationPhase.SUMMARY]: "/phases/summary",
  [ValidationPhase.CONFIRMATION]: "/phases/confirmation",
  [ValidationPhase.FLIGHT_DETAILS]: "/phases/flight-details",
  [ValidationPhase.TRIP_EXPERIENCE]: "/phases/trip-experience",
  [ValidationPhase.CLAIM_SUCCESS]: "/phases/claim-success",
  [ValidationPhase.CLAIM_REJECTED]: "/phases/claim-rejected",
  [ValidationPhase.AGREEMENT]: "/phases/agreement",
  [ValidationPhase.CLAIM_SUBMITTED]: "/phases/claim-submitted",
  [ValidationPhase.INITIAL]: "/phases/initial-assessment",
  [ValidationPhase.EXPERIENCE]: "/phases/trip-experience",
  [ValidationPhase.JOURNEY]: "/phases/flight-details",
  [ValidationPhase.FINAL]: "/phases/claim-submitted",
  [ValidationPhase.STEP_1]: "/phases/initial-assessment",
  [ValidationPhase.STEP_2]: "/phases/compensation-estimate",
  [ValidationPhase.STEP_3]: "/phases/flight-details",
  [ValidationPhase.STEP_4]: "/phases/trip-experience",
  [ValidationPhase.STEP_5]: "/phases/agreement",
};
