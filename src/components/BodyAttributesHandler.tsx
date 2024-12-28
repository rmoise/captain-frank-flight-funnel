'use client';

import { useEffect, useState } from 'react';

export function BodyAttributesHandler() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Remove any existing attribute to ensure clean state
    if (document.body.hasAttribute('cz-shortcut-listen')) {
      document.body.removeAttribute('cz-shortcut-listen');
    }
  }, []);

  // Suppress hydration warning by not rendering anything until client-side
  if (!isClient) {
    return null;
  }

  return (
    <div suppressHydrationWarning>
      {/* This empty div with suppressHydrationWarning will help handle any attribute mismatches */}
    </div>
  );
}
