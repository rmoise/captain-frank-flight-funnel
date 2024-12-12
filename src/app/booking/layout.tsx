import React from 'react';
import { ProgressTrackerWrapper } from './ProgressTrackerWrapper';

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 relative">
      {children}
      <ProgressTrackerWrapper />
    </div>
  );
}