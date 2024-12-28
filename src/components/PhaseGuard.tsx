import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';

interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const currentPhase = useSelector(
    (state: RootState) => state.progress.currentPhase
  );

  if (currentPhase !== phase) {
    return null;
  }

  return <>{children}</>;
};
