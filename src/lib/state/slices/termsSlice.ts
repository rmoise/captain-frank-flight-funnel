import { StoreStateValues } from '../types';

export interface TermsSlice {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingAccepted: boolean;
}

export interface TermsActions {
  setTermsAccepted: (accepted: boolean) => void;
  setPrivacyAccepted: (accepted: boolean) => void;
  setMarketingAccepted: (accepted: boolean) => void;
  validateTerms: () => boolean;
}

export const initialTermsState: TermsSlice = {
  termsAccepted: false,
  privacyAccepted: false,
  marketingAccepted: false,
};

export const createTermsSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): TermsActions => ({
  setTermsAccepted: (accepted: boolean) => {
    set((state) => ({
      ...state,
      termsAccepted: accepted,
      validationState: {
        ...state.validationState,
        stepValidation: {
          ...state.validationState.stepValidation,
          4: accepted && state.privacyAccepted,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          4: true,
        },
        isTermsValid: accepted && state.privacyAccepted,
      },
      _lastUpdate: Date.now(),
    }));
  },
  setPrivacyAccepted: (accepted: boolean) => {
    set((state) => ({
      ...state,
      privacyAccepted: accepted,
      validationState: {
        ...state.validationState,
        stepValidation: {
          ...state.validationState.stepValidation,
          4: accepted && state.termsAccepted,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          4: true,
        },
        isTermsValid: accepted && state.termsAccepted,
      },
      _lastUpdate: Date.now(),
    }));
  },
  setMarketingAccepted: (accepted: boolean) => {
    set((state) => ({
      ...state,
      marketingAccepted: accepted,
      _lastUpdate: Date.now(),
    }));
  },
  validateTerms: () => {
    let isValid = false;
    set((state) => {
      isValid = state.termsAccepted && state.privacyAccepted;
      return state;
    });
    return isValid;
  },
});
