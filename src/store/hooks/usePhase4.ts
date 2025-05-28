import { useEffect, useRef } from "react";
import { useStore } from "../index";

export const usePhase4 = () => {
  const phase4Store = useStore((state) => state.phase4);
  const phase4Actions = useStore((state) => state.actions.phase4);
  const hasInitialized = useRef(false);

  // Initialize Phase 4 store with localStorage restoration
  useEffect(() => {
    // Only initialize once and only if the store is still initializing
    if (
      phase4Store.isInitializing &&
      !hasInitialized.current &&
      phase4Actions.restoreFromLocalStorage
    ) {
      console.log("[usePhase4] Initializing Phase 4 store from localStorage");
      hasInitialized.current = true;
      phase4Actions.restoreFromLocalStorage();
    }
  }, [phase4Store.isInitializing, phase4Actions]);

  // Reset the initialization flag if the store gets reset
  useEffect(() => {
    if (!phase4Store.isInitializing && hasInitialized.current) {
      // Store has been initialized, keep the flag
    } else if (phase4Store.isInitializing && !hasInitialized.current) {
      // Store needs initialization, flag is correct
    }
  }, [phase4Store.isInitializing]);

  return {
    ...phase4Store,
    ...phase4Actions,
  };
};
