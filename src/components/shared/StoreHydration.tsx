"use client";

import { useEffect, useState } from "react";
import useStore from "@/store";

interface StoreHydrationProps {
  children: React.ReactNode;
}

/**
 * StoreHydration component ensures proper Zustand store hydration in Next.js 13+ App Router
 *
 * This component follows Next.js and Zustand best practices by:
 * 1. Preventing hydration mismatches between server and client
 * 2. Ensuring store is properly hydrated before rendering children
 * 3. Providing a loading state during hydration
 *
 * Best practices implemented:
 * - Uses `useEffect` to detect client-side mounting
 * - Waits for store hydration to complete before rendering content
 * - Provides graceful loading state
 * - Prevents SSR/hydration mismatches
 */
export function StoreHydration({ children }: StoreHydrationProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Check if store is already hydrated
    const checkHydration = () => {
      const store = useStore.getState();

      // Check if the store has been hydrated
      // We use the core.isInitialized flag to determine this
      if (store.core?.isInitialized) {
        console.log("[StoreHydration] Store already hydrated");
        setIsHydrated(true);
        return;
      }

      // If not hydrated, wait for the hydration to complete
      const unsubscribe = useStore.subscribe((state) => {
        if (state.core?.isInitialized) {
          console.log("[StoreHydration] Store hydration completed");
          setIsHydrated(true);
          unsubscribe(); // Clean up subscription
        }
      });

      // Also listen for the onFinishHydration callback if available
      if (useStore.persist?.onFinishHydration) {
        useStore.persist.onFinishHydration(() => {
          console.log("[StoreHydration] Persist hydration finished");
          setIsHydrated(true);
        });
      }

      // Cleanup function
      return () => {
        unsubscribe();
      };
    };

    // Start hydration check
    const cleanup = checkHydration();

    // Set a maximum timeout to prevent indefinite loading
    const timeoutId = setTimeout(() => {
      console.warn("[StoreHydration] Hydration timeout - forcing render");
      setIsHydrated(true);
    }, 3000); // 3 second timeout

    return () => {
      if (cleanup) cleanup();
      clearTimeout(timeoutId);
    };
  }, []);

  // Show loading state during hydration
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fa]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F54538] mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Initializing application...</p>
        </div>
      </div>
    );
  }

  // Render children once hydrated
  return <>{children}</>;
}
