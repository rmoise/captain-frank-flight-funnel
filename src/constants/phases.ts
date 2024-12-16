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
    name: 'Compensation Estimate',
    steps: [4, 5],
  },
  {
    id: 3,
    name: 'Documentation',
    steps: [6, 7],
  },
  {
    id: 4,
    name: 'Review & Submit',
    steps: [8],
  },
  {
    id: 5,
    name: 'Processing',
    steps: [9],
  },
  {
    id: 6,
    name: 'Payment',
    steps: [10],
  },
];

export const TOTAL_PHASES = PHASES.length;