import { StoreStateValues } from '../types';

export interface BookingSlice {
  bookingNumber: string | undefined;
}

export interface BookingActions {
  setBookingNumber: (number: string | undefined) => void;
}

export const initialBookingState: BookingSlice = {
  bookingNumber: undefined,
};

export const createBookingSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): BookingActions => ({
  setBookingNumber: (number) => {
    set((state) => ({
      bookingNumber: number || undefined,
      validationState: {
        ...state.validationState,
        isBookingNumberValid: Boolean(number),
        stepValidation: {
          ...state.validationState.stepValidation,
          [state.currentPhase]: Boolean(number),
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          [state.currentPhase]: true,
        },
      },
    }));
  },
});
