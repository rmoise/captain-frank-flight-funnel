// This file is specifically for server components that need to import store types
// but must not include any client-side code

// Re-export types
export type { Store, PhaseState, WizardActions } from "./types";
export { ValidationPhase } from "@/types/shared/validation";
