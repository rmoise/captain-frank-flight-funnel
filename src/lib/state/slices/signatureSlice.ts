import { StoreStateValues } from '../types';

export interface SignatureSlice {
  signature: string | undefined;
  hasSignature: boolean;
}

export interface SignatureActions {
  setSignature: (signature: string | undefined) => void;
  setHasSignature: (hasSignature: boolean) => void;
  validateSignature: () => boolean;
}

export const initialSignatureState: SignatureSlice = {
  signature: undefined,
  hasSignature: false,
};

export const createSignatureSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): SignatureActions => ({
  setSignature: (signature) => {
    set((state) => ({
      ...state,
      signature: signature || undefined,
      hasSignature: Boolean(signature),
      validationState: {
        ...state.validationState,
        isSignatureValid: Boolean(signature),
        stepValidation: {
          ...state.validationState.stepValidation,
          6: Boolean(signature),
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          6: true,
        },
      },
      _lastUpdate: Date.now(),
    }));
  },
  setHasSignature: (hasSignature: boolean) => {
    set((state) => ({
      ...state,
      hasSignature,
      validationState: {
        ...state.validationState,
        isSignatureValid: hasSignature,
        stepValidation: {
          ...state.validationState.stepValidation,
          6: hasSignature,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          6: true,
        },
      },
      _lastUpdate: Date.now(),
    }));
  },
  validateSignature: () => {
    let isValid = false;
    set((state) => {
      isValid = state.hasSignature;
      return state;
    });
    return isValid;
  },
});
