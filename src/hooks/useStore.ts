import { useStore } from "@/store";
import type { Store } from "@/store/types";

// It's a good practice to ensure the hook is correctly typed if re-exporting,
// or simply re-export directly.

// Option 1: Typed re-export (if you need to use the Store type here for some reason)
// const useAppStore = (): Store => useStore();
// export { useAppStore as useStore };

// Option 2: Direct re-export (simplest and most common)
export { useStore };
