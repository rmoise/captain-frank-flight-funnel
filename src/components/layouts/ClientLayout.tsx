'use client';

import { ReactNode, useEffect } from 'react';
import { useStore } from '@/lib/state/store';

interface ClientLayoutProps {
  children: ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { resetStore } = useStore();

  useEffect(() => {
    resetStore();
  }, [resetStore]);

  return <>{children}</>;
}
