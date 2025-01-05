'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/state/store';

interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
  allowDevAccess?: boolean;
}

export const PhaseGuard: React.FC<PhaseGuardProps> = ({
  phase,
  children,
  allowDevAccess,
}) => {
  const { currentPhase, completedPhases } = useStore();
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    if (allowDevAccess) {
      const searchParams = new URLSearchParams(window.location.search);
      setIsDevMode(searchParams.get('dev') === 'true');
    }
  }, [allowDevAccess]);

  const isPhaseAccessible =
    isDevMode ||
    phase === currentPhase ||
    completedPhases.includes(phase) ||
    (phase < currentPhase && completedPhases.includes(phase - 1)) ||
    (phase === 2 && completedPhases.includes(1)) ||
    (phase === 3 && completedPhases.includes(2)) ||
    (phase === 4 && completedPhases.includes(3)) ||
    (phase === 5 &&
      completedPhases.includes(4) &&
      useStore.getState().validationState.stepValidation[2] &&
      useStore.getState().validationState.stepValidation[3]);

  if (!isPhaseAccessible) {
    return null;
  }

  return <>{children}</>;
};
