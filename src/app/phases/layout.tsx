'use client';

import React from 'react';
import { Navbar } from '@/components/Navbar';
import { WelcomeSection } from '@/components/booking/WelcomeSection';

export default function PhasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F4F7FA]">
      <Navbar />
      <WelcomeSection />
      <div className="max-w-3xl mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
