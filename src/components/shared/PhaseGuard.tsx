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
  const {
    currentPhase,
    completedPhases,
    completedSteps,
    initializeNavigationFromUrl,
  } = useStore();

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
    // For phase 5, ALWAYS require phase 4 to be completed AND both steps in phase 4 to be completed
    // This check needs to be first to ensure it's enforced regardless of other conditions
    (phase === 5 &&
      completedPhases.includes(4) &&
      completedSteps.includes(2) &&
      completedSteps.includes(3) &&
      useStore.getState().validationState.stepValidation[2] &&
      useStore.getState().validationState.stepValidation[3] &&
      useStore.getState().phasesCompletedViaContinue.includes(4)) ||
    // For other phases, allow access up to highest completed phase
    phase === currentPhase ||
    (() => {
      // Get the highest completed phase
      const highestCompletedPhase = Math.max(...completedPhases, currentPhase);

      // Allow access to any phase up to the highest completed phase
      if (phase <= highestCompletedPhase) {
        // For phase 2 and above, check if previous phase was completed via continue
        if (phase >= 2) {
          return useStore
            .getState()
            .phasesCompletedViaContinue.includes(phase - 1);
        }
        return true;
      }
      return false;
    })();

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
