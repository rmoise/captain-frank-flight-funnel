import { useEffect } from 'react';
import useStore from '@/lib/state/store';

export const useStateSync = () => {
  const { currentPhase, completedPhases, setCurrentPhase, completePhase } =
    useStore();

  useEffect(() => {
    // Save current phase to localStorage
    if (currentPhase) {
      localStorage.setItem('currentPhase', currentPhase.toString());
    }

    // Save completed phases to localStorage
    if (completedPhases.length > 0) {
      localStorage.setItem('completedPhases', JSON.stringify(completedPhases));
    }
  }, [currentPhase, completedPhases]);

  useEffect(() => {
    // Restore state from localStorage on mount
    const storedPhase = localStorage.getItem('currentPhase');
    const storedCompletedPhases = localStorage.getItem('completedPhases');

    if (storedPhase) {
      const phase = parseInt(storedPhase, 10);
      if (!isNaN(phase) && phase >= 1) {
        setCurrentPhase(phase);
      }
    }

    if (storedCompletedPhases) {
      try {
        const phases = JSON.parse(storedCompletedPhases);
        if (Array.isArray(phases)) {
          phases.forEach((phase) => {
            completePhase(phase);
          });
        }
      } catch (error) {
        console.error('Error restoring completed phases:', error);
      }
    }
  }, [setCurrentPhase, completePhase]);
};
