'use client';

import dynamic from 'next/dynamic';

const ContactFormWrapper = dynamic(
  () => import('@/components/contact/ContactFormWrapper').then(mod => ({ default: mod.default })),
  {
    loading: () => (
      <div className="animate-pulse space-y-6">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    )
  }
);

export default function ContactSupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ContactFormWrapper />
    </div>
  );
}