import { useEffect, useState } from "react";
import { SafeHydrationBoundary } from "@/components/shared/SafeHydrationBoundary";
import useStore from "@/store";
import { ReactNode } from "react";
import type { Store } from "@/store/types";

interface StoreProviderProps {
  children: ReactNode;
}

export default function StoreProvider({ children }: StoreProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for store hydration before rendering children
  useEffect(() => {
    // Initialize store after hydration
    const unsubHydrate = useStore.persist.onHydrate(() => {
      setIsHydrated(false);
    });

    const unsubFinish = useStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
      // Set store as initialized using proper core structure
      useStore.setState((state) => ({
        core: {
          ...state.core,
          isInitialized: true,
          lastUpdate: new Date(),
        },
      }));
    });

    // Start hydration
    useStore.persist.rehydrate();

    return () => {
      unsubHydrate();
      unsubFinish();
    };
  }, []);

  if (!isHydrated) {
    return null; // or a loading spinner
  }

  return <SafeHydrationBoundary>{children}</SafeHydrationBoundary>;
}
