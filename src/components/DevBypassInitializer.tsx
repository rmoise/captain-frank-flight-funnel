'use client';

import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { completeStep } from '@/store/slices/progressSlice';

interface DevBypassInitializerProps {
  onComplete: () => void;
}

export const DevBypassInitializer: React.FC<DevBypassInitializerProps> = ({
  onComplete,
}) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const steps = [1, 2, 3, 4, 5];
    steps.forEach((step) => dispatch(completeStep(step)));
    onComplete();
  }, [dispatch, onComplete]);

  return null;
};
