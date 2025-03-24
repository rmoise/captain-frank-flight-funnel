import { useCallback } from 'react';
import useStore from '@/lib/state/store';

export const usePhaseManagement = () => {
  const { currentPhase, completedPhases, setCurrentPhase, completePhase } =
    useStore();

  const moveToNextPhase = useCallback(() => {
    if (currentPhase) {
      completePhase(currentPhase);
      setCurrentPhase(currentPhase + 1);
    }
  }, [currentPhase, completePhase, setCurrentPhase]);

  const isPhaseCompleted = useCallback(
    (phase: number) => completedPhases.includes(phase),
    [completedPhases]
  );

  return {
    currentPhase,
    completedPhases,
    moveToNextPhase,
    isPhaseCompleted,
  };
};
