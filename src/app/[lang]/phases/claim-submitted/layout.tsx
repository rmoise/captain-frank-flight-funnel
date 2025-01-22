'use client';

import React from 'react';

interface ClaimSubmittedLayoutProps {
  children: React.ReactNode;
}

export default function ClaimSubmittedLayout({
  children,
}: ClaimSubmittedLayoutProps) {
  return <div className="min-h-screen">{children}</div>;
}
