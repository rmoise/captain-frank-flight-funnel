import type { Translations } from '@/translations/types';

export interface Phase {
  id: number;
  name: string;
  steps: number[];
}

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
    name: t.phases.names.agreement,
    steps: [9],
  },
];

export const TOTAL_PHASES = 6;
