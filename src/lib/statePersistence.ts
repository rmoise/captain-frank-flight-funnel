import type { StoreState } from '@/lib/state/store';

export const loadState = (): Partial<StoreState> | undefined => {
  try {
    const serializedState = localStorage.getItem('captain-frank-state');
    if (serializedState === null) {
      return undefined;
    }
    return JSON.parse(serializedState);
  } catch (err) {
    return undefined;
  }
};

export const saveState = (state: Partial<StoreState>) => {
  try {
    const serializedState = JSON.stringify(state);
    localStorage.setItem('captain-frank-state', serializedState);
  } catch {
    // Ignore write errors
  }
};
