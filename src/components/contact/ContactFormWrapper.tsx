'use client';

import { useEffect, useState } from 'react';
import ContactForm from './ContactForm';
import { LoadingProvider } from '@/providers/LoadingProvider';

export default function ContactFormWrapper() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <LoadingProvider>
      <ContactForm />
    </LoadingProvider>
  );
}