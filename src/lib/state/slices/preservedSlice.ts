import { StoreStateValues } from '../types';

export interface PreservedSlice {
  _lastUpdate?: number;
  _lastPersist?: number;
  _lastPersistedState?: string;
  _isRestoring: boolean;
  _persistVersion: number;
}

export const initialPreservedState: PreservedSlice = {
  _lastUpdate: Date.now(),
  _lastPersist: Date.now(),
  _lastPersistedState: '',
  _isRestoring: false,
  _persistVersion: 1,
};

export interface PreservedActions {
  markStateUpdated: () => void;
  markStatePersisted: (serializedState: string) => void;
  startStateRestore: () => void;
  finishStateRestore: () => void;
  resetStore: () => void;
  setPreservedState: (preservedState: PreservedSlice) => void;
  setPreservedStateFromStorage: (preservedState: PreservedSlice) => void;
  setPreservedStateFromUrl: (preservedState: PreservedSlice) => void;
  setPreservedStateFromApi: (preservedState: PreservedSlice) => void;
  setPreservedStateFromBookingNumber: (preservedState: PreservedSlice) => void;
}

export const createPreservedSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: () => StoreStateValues
): PreservedActions => ({
  markStateUpdated: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      _lastUpdate: Date.now(),
    }));
  },

  markStatePersisted: (serializedState: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      _lastPersist: Date.now(),
      _lastPersistedState: serializedState,
    }));
  },

  startStateRestore: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      _isRestoring: true,
    }));
  },

  finishStateRestore: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      _isRestoring: false,
      _lastUpdate: Date.now(),
      _lastPersist: Date.now(),
    }));
  },

  resetStore: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      ...initialPreservedState,
      _lastUpdate: Date.now(),
      _lastPersist: Date.now(),
      _lastPersistedState: '',
      _isRestoring: false,
      _persistVersion: 1,
    }));
  },

  setPreservedState: (preservedState) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      preservedState,
      _lastUpdate: Date.now(),
    }));
  },

  setPreservedStateFromStorage: (preservedState) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      preservedState,
      _lastUpdate: Date.now(),
    }));
  },

  setPreservedStateFromUrl: (preservedState) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      preservedState,
      _lastUpdate: Date.now(),
    }));
  },

  setPreservedStateFromApi: (preservedState) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      preservedState,
      _lastUpdate: Date.now(),
    }));
  },

  setPreservedStateFromBookingNumber: (preservedState) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      preservedState,
      _lastUpdate: Date.now(),
    }));
  },
});
