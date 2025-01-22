import type { StoreStateValues } from '../state/types';

export interface ValidationContext {
  state: StoreStateValues;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export function createValidationContext(
  state: StoreStateValues,
  metadata?: Record<string, unknown>
): ValidationContext {
  return {
    state,
    timestamp: Date.now(),
    metadata,
  };
}
