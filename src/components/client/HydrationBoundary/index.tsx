"use client";

import { useEffect, useState, type ReactNode } from "react";

interface SafeHydrationBoundaryProps {
  children: ReactNode;
}

export function SafeHydrationBoundary({
  children,
}: SafeHydrationBoundaryProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null; // or a loading spinner/skeleton
  }

  return <>{children}</>;
}
