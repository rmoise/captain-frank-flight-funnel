'use client';

import React, { useState, useEffect } from 'react';
import { PHASES } from '@/constants/phases';
import styles from './PhaseNavigation.module.css';
import { useStore, PHASE_TO_URL } from '@/lib/state/store';
import { useRouter } from 'next/navigation';

export interface PhaseNavigationProps {
  currentPhase?: number;
  completedPhases?: number[];
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = () => {
  const [isClient, setIsClient] = useState(false);
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);

  // Split store subscriptions to minimize re-renders
  const { currentPhase, completedPhases, completedSteps } = useStore();
  const router = useRouter();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isPhaseAccessible = React.useCallback(
    (phaseNumber: number) => {
      // Allow access to current phase
      if (phaseNumber === currentPhase) {
        return true;
      }

      // Allow access to completed phases
      if (completedPhases.includes(phaseNumber)) {
        return true;
      }

      // Allow access to previous phases
      if (phaseNumber < currentPhase) {
        return true;
      }

      // For phase 2, require phase 1 to be completed AND step 1 to be completed
      if (phaseNumber === 2) {
        return completedPhases.includes(1) && completedSteps.includes(1);
      }

      // For other phases, require previous phase to be completed
      return completedPhases.includes(phaseNumber - 1);
    },
    [currentPhase, completedSteps, completedPhases]
  );

  const getBarClassName = React.useCallback(
    (phaseNumber: number, accessible: boolean) => {
      if (!isClient) {
        return styles.inactive;
      }

      const classes = [];

      // Base class based on phase state
      if (phaseNumber < currentPhase) {
        classes.push(styles.completed);
      } else if (phaseNumber === currentPhase) {
        classes.push(styles.active);
      } else {
        classes.push(styles.inactive);
        if (accessible) {
          classes.push(styles.accessible);
        }
      }

      // Add highlight class for hover effect
      if (hoveredPhase !== null && accessible && phaseNumber <= hoveredPhase) {
        classes.push(styles.highlight);
      }

      return classes.join(' ');
    },
    [isClient, currentPhase, hoveredPhase]
  );

  const getPhaseLabel = React.useCallback((phase: number) => {
    const phaseConfig = PHASES.find((p) => p.id === phase);
    return phaseConfig ? phaseConfig.name : `Phase ${phase}`;
  }, []);

  const handlePhaseClick = React.useCallback(
    (phaseNumber: number, accessible: boolean) => {
      if (accessible) {
        const url = PHASE_TO_URL[phaseNumber];
        if (url) {
          router.push(url);
        }
      }
    },
    [router]
  );

  // Pre-calculate phase accessibility to avoid recalculation in render
  const phaseStates = React.useMemo(
    () =>
      PHASES.map((phase) => ({
        ...phase,
        accessible: isPhaseAccessible(phase.id),
      })),
    [isPhaseAccessible]
  );

  const handleMouseEnter = React.useCallback(
    (phaseId: number, accessible: boolean) => {
      if (accessible) {
        setHoveredPhase(phaseId);
      }
    },
    []
  );

  const handleMouseLeave = React.useCallback(() => {
    setHoveredPhase(null);
  }, []);

  return (
    <div className="w-full py-4 mt-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-2">
          {phaseStates.map((phase) => (
            <div
              key={phase.id}
              className={`flex-1 relative group ${phase.accessible ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={() => handlePhaseClick(phase.id, phase.accessible)}
              onMouseEnter={() => handleMouseEnter(phase.id, phase.accessible)}
              onMouseLeave={handleMouseLeave}
            >
              <div className={getBarClassName(phase.id, phase.accessible)} />
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-xs text-gray-600">
                {getPhaseLabel(phase.id)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
