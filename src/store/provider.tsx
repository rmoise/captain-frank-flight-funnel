'use client';

import { Provider } from 'react-redux';
import { store } from './';
import { StepsProvider } from '@/context/StepsContext';
import { FunnelProvider } from '@/context/FunnelContext';
import { BookingProvider } from '@/context/BookingContext';
import dynamic from 'next/dynamic';

// Create a client-only wrapper component
function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <FunnelProvider>
        <StepsProvider>
          <BookingProvider>
            {children}
          </BookingProvider>
        </StepsProvider>
      </FunnelProvider>
    </Provider>
  );
}

// Export a dynamic version that only renders on client
export const Providers = dynamic(() => Promise.resolve(ClientProviders), {
  ssr: false,
});