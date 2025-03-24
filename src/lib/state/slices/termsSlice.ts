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
    set((state) => {
      const isValid = accepted && state.privacyAccepted;
      return {
        termsAccepted: accepted,
        validationState: {
          ...state.validationState,
          stepValidation: {
            ...state.validationState.stepValidation,
            4: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            4: true,
          },
          stepCompleted: {
            ...state.validationState.stepCompleted,
            4: isValid
          },
          isTermsValid: isValid,
          _timestamp: Date.now(),
        },
        _lastUpdate: Date.now(),
      };
    });
  },
  setPrivacyAccepted: (accepted: boolean) => {
    set((state) => {
      const isValid = accepted && state.termsAccepted;
      return {
        privacyAccepted: accepted,
        validationState: {
          ...state.validationState,
          stepValidation: {
            ...state.validationState.stepValidation,
            4: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            4: true,
          },
          stepCompleted: {
            ...state.validationState.stepCompleted,
            4: isValid
          },
          isTermsValid: isValid,
          _timestamp: Date.now(),
        },
        _lastUpdate: Date.now(),
      };
    });
  },
  setMarketingAccepted: (accepted: boolean) => {
    set(() => ({
      marketingAccepted: accepted,
      _lastUpdate: Date.now(),
    }));
  },
  validateTerms: () => {
    let isValid = false;
    set((state) => {
      isValid = state.termsAccepted && state.privacyAccepted;
      return {
        validationState: {
          ...state.validationState,
          stepValidation: {
            ...state.validationState.stepValidation,
            4: isValid,
          },
          stepInteraction: {
            ...state.validationState.stepInteraction,
            4: true,
          },
          stepCompleted: {
            ...state.validationState.stepCompleted,
            4: isValid
          },
          isTermsValid: isValid,
          _timestamp: Date.now(),
        },
        _lastUpdate: Date.now(),
      };
    });
    return isValid;
  },
});
