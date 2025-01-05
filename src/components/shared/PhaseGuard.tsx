'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore, PHASE_TO_URL } from '@/lib/state/store';

interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

export function PhaseGuard({ phase, children }: PhaseGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);
  const { currentPhase, completedPhases, initializeNavigationFromUrl } =
    useStore();

  useEffect(() => {
    // On mount, initialize navigation from URL
    initializeNavigationFromUrl();
    setIsInitialized(true);
  }, [initializeNavigationFromUrl]);

  // Don't render anything until we're initialized
  if (!isInitialized) {
    return null;
  }

  // Check if phase check should be bypassed
  const shouldBypassCheck =
    searchParams?.get('bypass_phase_check') === 'true' || phase === 6;
  if (shouldBypassCheck) {
    return <>{children}</>;
  }

  // Allow access to current phase, completed phases, or phases after completed phases
  const isPhaseAccessible =
    phase === currentPhase ||
    (phase < currentPhase && completedPhases.includes(phase - 1)) ||
    (phase === 2 && completedPhases.includes(1)) ||
    (phase === 3 && completedPhases.includes(2)) ||
    (phase === 4 && completedPhases.includes(3)) ||
    (phase === 5 && completedPhases.includes(4));

  if (!isPhaseAccessible) {
    // Redirect to the appropriate phase
    const redirectUrl = PHASE_TO_URL[currentPhase];
    if (redirectUrl) {
      router.push(redirectUrl);
    }
    return null;
  }

  return <>{children}</>;
}
