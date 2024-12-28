'use client';

import React, { useEffect } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useRouter } from 'next/navigation';

interface PhaseGuardProps {
  children: React.ReactNode;
  phase: number;
}

export const PhaseGuard: React.FC<PhaseGuardProps> = ({ children, phase }) => {
  const router = useRouter();
  const currentPhase = useAppSelector((state) => state.progress.currentPhase);

  useEffect(() => {
    if (phase > currentPhase) {
      router.replace('/phases/initial-assessment');
    }
  }, [phase, currentPhase, router]);

  return <>{children}</>;
};
