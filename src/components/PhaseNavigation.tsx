'use client';

import React, { useState, useEffect } from 'react';
import { PHASES } from '@/constants/phases';
import styles from './PhaseNavigation.module.css';

export interface PhaseNavigationProps {
  currentPhase: number;
  completedPhases: number[];
}

export const PhaseNavigation: React.FC<PhaseNavigationProps> = ({
  currentPhase,
  completedPhases,
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getBarClassName = (phaseNumber: number) => {
    if (!isClient) {
      return styles.inactive;
    }

    // If phase is completed, show as completed
    if (completedPhases.includes(phaseNumber)) {
      return styles.completed;
    }

    // If the phase is current phase, show it as active
    if (phaseNumber === currentPhase) {
      return styles.active;
    }

    // Otherwise, show it as inactive
    return styles.inactive;
  };

  return (
    <div className="w-full py-4 mt-8">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex gap-2">
          {PHASES.map((phase) => (
            <div key={phase.id} className="flex-1 relative">
              <div className={getBarClassName(phase.id)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
