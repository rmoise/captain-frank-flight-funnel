'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStore } from '@/lib/state/store';

export interface PhaseGuardProps {
  phase: number;
  children: React.ReactNode;
}

// Extend store type to include claim success flags
export const PhaseGuard: React.FC<PhaseGuardProps> = ({ phase, children }) => {
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPhaseAccessible, setIsPhaseAccessible] = useState(true);
  const { currentPhase, completedPhases, initializeNavigationFromUrl } =
    useStore();

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
      searchParams?.get('bypass') === 'true' ||
      useStore.getState()._preventPhaseChange;

    // Special cases for phase transitions
    const isCompensationEstimate = phase === 2;
    const isFlightDetails = phase === 3;
    const isTripExperience = phase === 4;
    const isFromPhaseOne = currentPhase === 1;
    const isFromPhaseTwo = currentPhase === 2;
    const isFromPhaseThree = currentPhase === 3;

    // Allow access if:
    // 1. Phase check is bypassed
    // 2. Current phase matches requested phase
    // 3. Phase is within completed phases
    // 4. Phase is the next phase after current phase
    // 5. Special case: Compensation estimate (phase 2) access from phase 1
    // 6. Special case: Flight details (phase 3) access from phase 2
    // 7. Special case: Trip experience (phase 4) access from phase 3
    const isCurrentPhase = phase === currentPhase;
    const isWithinCompletedPhases = completedPhases.includes(phase);
    const isNextPhase = phase === currentPhase + 1;
    const allowCompensationAccess =
      isCompensationEstimate && (isFromPhaseOne || completedPhases.includes(1));
    const allowFlightDetailsAccess =
      isFlightDetails && (isFromPhaseTwo || completedPhases.includes(2));
    const allowTripExperienceAccess =
      isTripExperience && (isFromPhaseThree || completedPhases.includes(3));

    console.log('Phase accessibility check:', {
      phase,
      currentPhase,
      completedPhases,
      isCurrentPhase,
      isWithinCompletedPhases,
      isNextPhase,
      shouldBypassCheck,
      isCompensationEstimate,
      isFlightDetails,
      isTripExperience,
      isFromPhaseOne,
      isFromPhaseTwo,
      isFromPhaseThree,
      allowCompensationAccess,
      allowFlightDetailsAccess,
      allowTripExperienceAccess,
    });

    const isAccessible =
      shouldBypassCheck ||
      isCurrentPhase ||
      isWithinCompletedPhases ||
      isNextPhase ||
      allowCompensationAccess ||
      allowFlightDetailsAccess ||
      allowTripExperienceAccess;

    setIsPhaseAccessible(isAccessible);
  }, [isInitialized, phase, currentPhase, completedPhases, searchParams]);

  if (!isInitialized || !isPhaseAccessible) {
    return null;
  }

  return <>{children}</>;
};
