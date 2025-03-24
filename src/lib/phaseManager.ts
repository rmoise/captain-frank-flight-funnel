import type { StoreState } from '@/lib/state/types';

export interface Phase {
  id: number;
  title: string;
  description: string;
  urlPath: string;
  requiredData: Array<keyof StoreState>;
  requiredPreviousPhases: number[];
}

export const getPhaseConfig = (phase: Phase) => {
  return {
    id: phase.id,
    title: phase.title,
    description: phase.description,
    path: `/phases/${phase.urlPath}`,
    requiredData: phase.requiredData || [],
    requiredPreviousPhases: phase.requiredPreviousPhases || [],
  };
};
