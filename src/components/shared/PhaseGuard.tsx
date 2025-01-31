'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  useStore,
  StoreState,
  StoreActions,
  PHASE_TO_URL,
} from '@/lib/state/store';

interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

// Extend store type to include claim success flags
type ExtendedStore = StoreState &
  StoreActions & {
    _isClaimSuccess?: boolean;
    _preventPhaseChange?: boolean;
  };

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

    const store = useStore.getState() as ExtendedStore;

    // Check if we're in claim success mode
    const isClaimSuccess = store._isClaimSuccess;
    if (isClaimSuccess && phase === 5) {
      setIsPhaseAccessible(true);
      return;
    }

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

    // Allow back navigation to previous phases
    const isBackNavigation = phase < currentPhase;

    const accessible =
      isPhase5Accessible ||
      isCurrentPhase ||
      isBackNavigation ||
      (isWithinCompletedPhases && isPreviousPhaseCompletedViaContinue);

    console.log('Phase accessibility check:', {
      phase,
      currentPhase,
      completedPhases,
      isCurrentPhase,
      isWithinCompletedPhases,
      isPreviousPhaseCompletedViaContinue,
      isClaimSuccess,
      accessible,
    });

    // Only redirect if we're definitely sure the phase is not accessible
    if (!accessible && isInitialized && currentPhase > 1 && !isClaimSuccess) {
      const redirectUrl = PHASE_TO_URL[currentPhase];
      if (redirectUrl) {
        const currentPath = window.location.pathname;
        const isGermanRoute = currentPath.startsWith('/de/');
        const langPrefix = isGermanRoute ? '/de' : '';
        const fullUrl = `${langPrefix}${redirectUrl}`;
        console.log('Redirecting to:', fullUrl);
        router.replace(fullUrl);
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
