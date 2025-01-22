import { StoreStateValues } from '../types';

export interface LanguageSlice {
  language: string;
}

export interface LanguageActions {
  setLanguage: (lang: string) => void;
}

export const initialLanguageState: LanguageSlice = {
  language: 'de',
};

export const createLanguageSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): LanguageActions => ({
  setLanguage: (lang) => {
    set((state) => ({
      ...state,
      language: lang,
    }));
  },
});
