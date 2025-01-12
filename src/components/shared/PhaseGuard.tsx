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
  const [isPhaseAccessible, setIsPhaseAccessible] = useState(true);
  const {
    currentPhase,
    completedPhases,
    completedSteps,
    initializeNavigationFromUrl,
  } = useStore();

  // First effect: Initialize navigation from URL
  useEffect(() => {
    const init = async () => {
      await initializeNavigationFromUrl();
      setIsInitialized(true);
    };
    init();
  }, [initializeNavigationFromUrl]);

  // Second effect: Check phase accessibility only after initialization
  useEffect(() => {
    if (!isInitialized) return;

    // Check if phase check should be bypassed
    const shouldBypassCheck =
      searchParams?.get('bypass_phase_check') === 'true' || phase === 6;
    if (shouldBypassCheck) {
      setIsPhaseAccessible(true);
      return;
    }

    const store = useStore.getState();

    // For phase 5, check specific requirements
    const isPhase5Accessible =
      phase === 5 &&
      completedPhases.includes(4) &&
      completedSteps.includes(2) &&
      completedSteps.includes(3) &&
      store.validationState.stepValidation[2] &&
      store.validationState.stepValidation[3] &&
      store.phasesCompletedViaContinue.includes(4);

    // For other phases
    const isCurrentPhase = phase === currentPhase;
    const highestCompletedPhase = Math.max(...completedPhases, currentPhase);
    const isWithinCompletedPhases = phase <= highestCompletedPhase;
    const isPreviousPhaseCompletedViaContinue =
      phase >= 2 ? store.phasesCompletedViaContinue.includes(phase - 1) : true;

    const accessible =
      isPhase5Accessible ||
      isCurrentPhase ||
      (isWithinCompletedPhases && isPreviousPhaseCompletedViaContinue);

    console.log('Phase accessibility check:', {
      phase,
      currentPhase,
      completedPhases,
      isCurrentPhase,
      isWithinCompletedPhases,
      isPreviousPhaseCompletedViaContinue,
      accessible,
    });

    // Only redirect if we're definitely sure the phase is not accessible
    if (!accessible && isInitialized && currentPhase > 1) {
      const redirectUrl = PHASE_TO_URL[currentPhase];
      if (redirectUrl) {
        console.log('Redirecting to:', redirectUrl);
        router.push(redirectUrl);
      }
    }

    setIsPhaseAccessible(accessible);
  }, [
    isInitialized,
    phase,
    currentPhase,
    completedPhases,
    completedSteps,
    searchParams,
    router,
  ]);

  // Don't render anything until initialization is complete
  if (!isInitialized) {
    return null;
  }

  // Check if phase check should be bypassed
  const shouldBypassCheck =
    searchParams?.get('bypass_phase_check') === 'true' || phase === 6;
  if (shouldBypassCheck) {
    return <>{children}</>;
  }

  if (!isPhaseAccessible) {
    return null;
  }

  return <>{children}</>;
}
