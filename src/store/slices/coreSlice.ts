import { StateCreator } from "zustand";
import type { Store, CoreState, CoreActions } from "../types";

// Define initial state for the core slice based on CoreState interface
const initialCoreState: CoreState = {
  expandedAccordions: {},
  isInitialized: false,
  lastUpdate: null, // Use null as per type definition
};

// Create the slice creator function
export const createCoreSlice: StateCreator<
  Store,
  [],
  [],
  CoreActions // This slice specifically provides CoreActions
> = (set) => ({
  // Implement the actions defined in CoreActions
  toggleAccordion: (id: string) =>
    set((state) => ({
      core: {
        ...state.core,
        expandedAccordions: {
          ...state.core.expandedAccordions,
          [id]: !state.core.expandedAccordions[id], // Toggle state
        },
        lastUpdate: new Date(), // Update timestamp
      },
    })),

  setInitialAccordionState: (accordionStates: Record<string, boolean>) =>
    set((state) => ({
      core: {
        ...state.core,
        expandedAccordions: accordionStates,
        lastUpdate: new Date(), // Update timestamp
      },
    })),

  // We might also need an action to set isInitialized, often called after hydration
  setIsInitialized: (isInitialized: boolean) =>
    set((state) => ({
      core: {
        ...state.core,
        isInitialized: isInitialized,
        lastUpdate: new Date(),
      },
    })),
});

// Export initial state if needed elsewhere, though it's primarily used internally here
export { initialCoreState };
