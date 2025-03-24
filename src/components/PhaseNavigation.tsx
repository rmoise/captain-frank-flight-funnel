'use client';

import React, { useState } from 'react';
import { PHASES, Phase } from '@/constants/phases';
import styles from './PhaseNavigation.module.css';
import useStore from '@/lib/state/store';
import { getLanguageAwareUrl } from '@/lib/state/store';
import { PHASE_TO_URL } from '@/lib/state/slices/navigationSlice';
import { PATH_TO_PHASE } from '@/hooks/useNavigation';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from '@/hooks/useTranslation';
import { ValidationStep } from '@/lib/state/types';

interface PhaseState extends Phase {
  accessible: boolean;
}

export interface PhaseNavigationProps {
  currentPhase?: number;
  completedPhases?: number[];
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  currentPhase: propCurrentPhase,
  completedPhases: propCompletedPhases,
}) => {
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);
  const pathname = usePathname();

  // Get translations at the top level
  const { t, lang } = useTranslation();

  // Split store subscriptions to minimize re-renders
  const {
    completedPhases: storeCompletedPhases,
    completedSteps,
    validationState,
    phasesCompletedViaContinue,
  } = useStore();

  const router = useRouter();

  // Use props if provided, otherwise fallback to computed value from pathname
  const currentPhase =
    propCurrentPhase ??
    (pathname
      ? pathname.includes('/phases/claim-success') ||
        pathname.includes('/phases/claim-rejected')
        ? (5 as ValidationStep)
        : (PATH_TO_PHASE[pathname] || 1) as ValidationStep
      : (1 as ValidationStep));

  // Use props if provided, otherwise fallback to store value
  const completedPhases = propCompletedPhases ?? storeCompletedPhases;

  const isPhaseAccessible = React.useCallback(
    (phaseNumber: number) => {
      // For phase 5, ALWAYS require phase 4 to be completed AND both steps in phase 4 to be completed
      // This check needs to be first to ensure it's enforced regardless of other conditions
      if (phaseNumber === 5) {
        const phase4Completed = completedPhases.includes(4);
        const phase4StepsCompleted =
          completedSteps.includes(2) && completedSteps.includes(3);
        const phase4CompletedViaContinue =
          phasesCompletedViaContinue.includes(4);
        return (
          phase4Completed &&
          phase4StepsCompleted &&
          validationState.stepValidation[2] &&
          validationState.stepValidation[3] &&
          phase4CompletedViaContinue
        );
      }

      // Get the highest completed phase
      const highestCompletedPhase = Math.max(...completedPhases, currentPhase);

      // Allow access to current phase
      if (phaseNumber === currentPhase) {
        return true;
      }

      // Allow access to any phase up to the highest completed phase, as long as previous phases were completed via continue
      if (phaseNumber <= highestCompletedPhase) {
        // For phase 2 and above, check if previous phase was completed via continue
        if (phaseNumber >= 2) {
          return phasesCompletedViaContinue.includes(phaseNumber - 1);
        }
        return true;
      }

      return false;
    },
    [
      currentPhase,
      completedSteps,
      completedPhases,
      validationState,
      phasesCompletedViaContinue,
    ]
  );

  const getBarClassName = React.useCallback(
    (phaseNumber: number, accessible: boolean) => {
      const classes: string[] = [];

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
    [currentPhase, hoveredPhase]
  );

  const getPhaseLabel = React.useCallback(
    (phase: number) => {
      const phases = PHASES(t);
      const phaseConfig = phases.find((p: Phase) => p.id === phase);
      return phaseConfig ? phaseConfig.name : `Phase ${phase}`;
    },
    [t]
  );

  const handlePhaseClick = React.useCallback(
    (phaseNumber: number, accessible: boolean) => {
      if (accessible) {
        const url = PHASE_TO_URL[phaseNumber as ValidationStep];
        if (url) {
          router.push(getLanguageAwareUrl(url, lang));
        }
      }
    },
    [router, lang]
  );

  // Pre-calculate phase accessibility to avoid recalculation in render
  const phaseStates: PhaseState[] = React.useMemo(
    () =>
      PHASES(t).map((phase) => ({
        id: phase.id,
        name: phase.name,
        steps: phase.steps,
        accessible: isPhaseAccessible(phase.id),
      })),
    [isPhaseAccessible, t]
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
