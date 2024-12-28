'use client';

import React, { useState, useEffect } from 'react';
import { TOTAL_PHASES } from '@/constants/phases';
import styles from './PhaseNavigation.module.css';

interface PhaseNavigationProps {
  currentPhase: number;
  completedPhases?: number[];
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  currentPhase,
  completedPhases = [],
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const totalPhases = TOTAL_PHASES;

  const getBarClassName = (phaseNumber: number) => {
    if (!isClient) {
      return styles.inactive;
    }

    if (phaseNumber === currentPhase) {
      return styles.active;
    }

    const phases = Array.isArray(completedPhases) ? completedPhases : [];
    if (phases.includes(phaseNumber) && phaseNumber <= currentPhase) {
      return styles.completed;
    }

    return styles.inactive;
  };

  return (
    <div className="w-full py-4 mt-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-2">
          {Array.from({ length: totalPhases }).map((_, index) => {
            const phaseNumber = index + 1;
            return (
              <div key={index} className="flex-1 relative">
                <div className={getBarClassName(phaseNumber)} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};