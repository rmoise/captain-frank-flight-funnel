'use client';

import React from 'react';
import { WelcomeSection } from '@/components/booking';
import { Navbar } from '@/components/Navbar';
import styles from './layout.module.css';

interface PhaseLayoutProps {
  children: React.ReactNode;
}

export default function PhaseLayout({ children }: PhaseLayoutProps) {
  return (
    <div className={styles.container}>
      <Navbar />
      <WelcomeSection />
      <div className={styles.content}>{children}</div>
    </div>
  );
}
