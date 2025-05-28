"use client";

import { useEffect, useState } from "react";
import { memoryManager } from "@/utils/memoryManager";

/**
 * Client component that initializes memory management
 * Used in the root layout to ensure memory management runs only on the client
 */
export function MemoryProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Skip if already initialized to prevent duplicate initializations
    if (isInitialized) return;

    try {
      // Initialize memory management safely
      const cleanup = memoryManager.initializeMemoryManagement();

      // Mark as initialized
      setIsInitialized(true);

      // Clean up when the component unmounts
      return () => {
        try {
          if (cleanup) cleanup();
        } catch (error) {
          console.error("[MemoryProvider] Error during cleanup:", error);
        }
      };
    } catch (error) {
      console.error(
        "[MemoryProvider] Error initializing memory management:",
        error
      );
      // Mark as initialized anyway to prevent retries
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Just render children, this is a "provider" only in that it sets up memory management
  return <>{children}</>;
}

export default MemoryProvider;
