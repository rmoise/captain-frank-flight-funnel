'use client';

import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { StepsProvider } from '@/context/StepsContext';
import { FunnelProvider } from '@/context/FunnelContext';
import { BookingProvider } from '@/context/BookingContext';

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <LoadingProvider>
        <FunnelProvider>
          <StepsProvider>
            <BookingProvider>{children}</BookingProvider>
          </StepsProvider>
        </FunnelProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}
