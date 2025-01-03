'use client';

import { useEffect } from 'react';
import { useStore } from '@/lib/state/store';

export const DevBypassInitializer = () => {
  const { setCurrentPhase, completePhase } = useStore();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      setCurrentPhase(3);
      completePhase(1);
      completePhase(2);
    }
  }, [setCurrentPhase, completePhase]);

  return null;
};
