interface Phase {
  id: number;
  name: string;
  steps: number[];
}

export const PHASES: Phase[] = [
  {
    id: 1,
    name: 'Initial Assessment',
    steps: [1, 2, 3],
  },
  {
    id: 2,
    name: 'Summary',
    steps: [4],
  },
  {
    id: 3,
    name: 'Flight Details',
    steps: [5, 6],
  },
  {
    id: 4,
    name: 'Trip Experience',
    steps: [7, 8, 9, 10],
  },
  {
    id: 5,
    name: 'Claim Status',
    steps: [11],
  },
  {
    id: 6,
    name: 'Agreement',
    steps: [12],
  },
];
export const TOTAL_PHASES = PHASES.length;
