'use client';

import { ReactNode } from 'react';
import { BookingProvider } from '@/context/BookingContext';
import { StepsProvider } from '@/context/StepsContext';
import { FunnelProvider } from '@/context/FunnelContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <FunnelProvider>
      <StepsProvider>
        <BookingProvider>
          {children}
        </BookingProvider>
      </StepsProvider>
    </FunnelProvider>
  );
}