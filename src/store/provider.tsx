'use client';

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './';
import { FunnelProvider } from '@/context/FunnelContext';
import { BookingProvider } from '@/context/BookingContext';
import dynamic from 'next/dynamic';

// Create a client-only wrapper component
function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <FunnelProvider>
          <BookingProvider>
            {children}
          </BookingProvider>
        </FunnelProvider>
      </PersistGate>
    </Provider>
  );
}

// Export a dynamic version that only renders on client
export const Providers = dynamic(() => Promise.resolve(ClientProviders), {
  ssr: false,
});