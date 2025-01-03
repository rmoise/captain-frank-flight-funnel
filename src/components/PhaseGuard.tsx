import React from 'react';
import { useStore } from '@/lib/state/store';

interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const { currentPhase, completedPhases } = useStore();

  const isPhaseAccessible =
    phase <= currentPhase || completedPhases.includes(phase);

  if (!isPhaseAccessible) {
    return null;
  }

  return <>{children}</>;
};
