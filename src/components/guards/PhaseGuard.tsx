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
    isDevMode || phase <= currentPhase || completedPhases.includes(phase);

  if (!isPhaseAccessible) {
    return null;
  }

  return <>{children}</>;
};
