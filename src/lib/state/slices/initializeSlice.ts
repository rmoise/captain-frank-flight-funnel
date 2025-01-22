import { StoreStateValues } from '../types';

export interface InitializeSlice {
  isInitializing: boolean;
  isLoading: boolean;
  locationError: string | null;
}

export const initialInitializeState: InitializeSlice = {
  isInitializing: false,
  isLoading: false,
  locationError: null,
};

export interface InitializeActions {
  startInitializing: () => void;
  finishInitializing: () => void;
  startLoading: () => void;
  finishLoading: () => void;
  setLocationError: (error: string | null) => void;
  initializeStore: () => Promise<void>;
}

export const createInitializeSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get: () => StoreStateValues
): InitializeActions => ({
  startInitializing: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      isInitializing: true,
      _lastUpdate: Date.now(),
    }));
  },

  finishInitializing: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      isInitializing: false,
      _lastUpdate: Date.now(),
    }));
  },

  startLoading: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      isLoading: true,
      _lastUpdate: Date.now(),
    }));
  },

  finishLoading: () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      isLoading: false,
      _lastUpdate: Date.now(),
    }));
  },

  setLocationError: (error) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set((state) => ({
      locationError: error,
      _lastUpdate: Date.now(),
    }));
  },

  initializeStore: async () => {
    set((state) => ({
      ...state,
      _lastUpdate: Date.now(),
    }));
  },
});
