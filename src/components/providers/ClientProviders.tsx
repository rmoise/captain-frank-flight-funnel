'use client';

import { Providers } from '@/store/provider';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import { LoadingProvider } from '@/providers/LoadingProvider';
import { StepsProvider } from '@/context/StepsContext';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <Providers>
        <LoadingProvider>
          <StepsProvider>
            {children}
          </StepsProvider>
        </LoadingProvider>
      </Providers>
    </ErrorBoundary>
  );
}