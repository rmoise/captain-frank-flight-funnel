import { useAppSelector } from '@/store/hooks';

export const usePhaseNavigation = () => {
  const completedPhases = useAppSelector(
    (state) => state.progress.completedPhases
  );

  const isPhaseCompleted = (phase: number) => {
    return completedPhases.includes(phase);
  };

  const canAccessPhase = (phase: number, requiredPreviousPhases: number[]) => {
    return requiredPreviousPhases.every((p) => isPhaseCompleted(p));
  };

  return {
    isPhaseCompleted,
    canAccessPhase,
  };
};
