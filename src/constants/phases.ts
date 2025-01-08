interface Phase {
  id: number;
  name: string;
  steps: number[];
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: 'Erste Einschätzung',
    steps: [1, 2, 3],
  },
  {
    id: 2,
    name: 'Zusammenfassung',
    steps: [4],
  },
  {
    id: 3,
    name: 'Flugdetails',
    steps: [5, 6],
  },
  {
    id: 4,
    name: 'Reiseerlebnis',
    steps: [7, 8, 9, 10],
  },
  {
    id: 5,
    name: 'Antragsstatus',
    steps: [11],
  },
  {
    id: 6,
    name: 'Vereinbarung',
    steps: [12],
  },
];
export const TOTAL_PHASES = PHASES.length;
