'use client';

import { useEffect, useState, useMemo } from 'react';

export function useDevBypass() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useMemo(() => {
    if (!mounted) return false;
    // Disable dev bypass by default
    return false;
  }, [mounted]);
}