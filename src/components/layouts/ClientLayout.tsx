'use client';

import { ReactNode, useEffect } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { initializeState } from '@/store/slices/progressSlice';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeState());
  }, [dispatch]);

  return <>{children}</>;
}
