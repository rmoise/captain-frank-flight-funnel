'use client';

import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store';
import dynamic from 'next/dynamic';

// Dynamically import ProgressTrackerWrapper with no SSR
const ProgressTrackerWrapper = dynamic(
  () => import('./ProgressTrackerWrapper'),
  { ssr: false }
);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <div className="min-h-screen bg-gray-50 relative">
        {children}
        <ProgressTrackerWrapper />
      </div>
    </Provider>
  );
}