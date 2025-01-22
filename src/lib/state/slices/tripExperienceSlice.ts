import { StoreStateValues } from '../types';

export interface TripExperienceFormValues {
  description: string;
  impact?: string;
  expenses?: string;
  expenseAmount?: string;
}

export interface TripExperienceSlice {
  tripExperience: TripExperienceFormValues | null;
}

export interface TripExperienceActions {
  updateTripExperience: (experience: TripExperienceFormValues) => void;
  validateTripExperience: () => boolean;
}

export const initialTripExperienceState: TripExperienceSlice = {
  tripExperience: null,
};

export const createTripExperienceSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void
): TripExperienceActions => ({
  updateTripExperience: (experience: TripExperienceFormValues) => {
    set((state) => ({
      ...state,
      tripExperience: experience,
      validationState: {
        ...state.validationState,
        stepValidation: {
          ...state.validationState.stepValidation,
          4: true,
        },
        stepInteraction: {
          ...state.validationState.stepInteraction,
          4: true,
        },
      },
      _lastUpdate: Date.now(),
    }));
  },
  validateTripExperience: () => {
    let isValid = false;
    set((state) => {
      isValid = !!state.tripExperienceAnswers?.length;
      return state;
    });
    return isValid;
  },
});

export const validateTripExperience = (state: StoreStateValues): boolean => {
  let isValid = false;

  try {
    isValid = !!state.tripExperienceAnswers?.length;
  } catch (error) {
    console.error('Error validating trip experience:', error);
  }

  return isValid;
};
