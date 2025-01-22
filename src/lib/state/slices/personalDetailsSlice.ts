import type { StoreStateValues } from '../types';
import { ValidationManager } from '@/lib/validation/ValidationManager';
import { createValidationContext } from '@/lib/validation/ValidationContext';
import type { PassengerDetails } from '@/types/store';

export interface PersonalDetailsSlice {
  personalDetails: PassengerDetails | null;
  isClaimSuccess: boolean;
  showAdditionalFields: boolean;
}

export interface PersonalDetailsActions {
  setPersonalDetails: (details: PassengerDetails | null) => void;
  validatePersonalDetails: () => Promise<boolean>;
}

export const initialPersonalDetailsState: PersonalDetailsSlice = {
  personalDetails: null,
  isClaimSuccess: false,
  showAdditionalFields: false,
};

export const createPersonalDetailsSlice = (
  set: (fn: (state: StoreStateValues) => Partial<StoreStateValues>) => void,
  get: () => StoreStateValues
): PersonalDetailsSlice & PersonalDetailsActions => {
  const validationManager = new ValidationManager();

  const updateValidationState = (
    state: StoreStateValues,
    isValid: boolean,
    now: number,
    details: PassengerDetails | null
  ) => ({
    validationState: {
      ...state.validationState,
      isPersonalValid: isValid,
      stepValidation: {
        ...state.validationState.stepValidation,
        [state.currentPhase]: isValid,
        3: isValid,
      },
      stepInteraction: {
        ...state.validationState.stepInteraction,
        [state.currentPhase]: details !== null,
        3: details !== null,
      },
    },
    _lastUpdate: now,
  });

  return {
    ...initialPersonalDetailsState,

    setPersonalDetails: (details: PassengerDetails | null) => {
      const currentState = get();
      const hasChanged =
        JSON.stringify(currentState.personalDetails) !==
        JSON.stringify(details);

      if (!hasChanged) {
        return;
      }

      const now = Date.now();

      // Update details immediately with type coercion
      set(() => ({
        personalDetails: details
          ? {
              salutation: details.salutation || '',
              firstName: details.firstName || '',
              lastName: details.lastName || '',
              email: details.email || '',
              phone: details.phone || '',
              address: details.address || '',
              postalCode: details.postalCode || '',
              city: details.city || '',
              country: details.country || '',
            }
          : null,
        _lastUpdate: now,
      }));

      // Immediately invalidate if null or empty
      if (
        !details ||
        Object.values(details).every((value) => !value || value.trim() === '')
      ) {
        set((state) => updateValidationState(state, false, now, details));
        return;
      }

      // Check required fields immediately
      const requiredFields = ['firstName', 'lastName', 'email'];
      const hasEmptyRequired = requiredFields.some(
        (field) => !details[field as keyof PassengerDetails]?.trim()
      );

      if (hasEmptyRequired) {
        set((state) => updateValidationState(state, false, now, details));
        return;
      }

      // Proceed with full validation
      const context = createValidationContext(
        { ...currentState, personalDetails: details },
        {
          step: 3,
          type: 'personal_details',
          timestamp: now,
        }
      );

      // Run validation immediately
      validationManager.validate(context.state, 3).then((result) => {
        const currentDetails = get().personalDetails;
        if (currentDetails === details) {
          set((state) =>
            updateValidationState(state, result.isValid, Date.now(), details)
          );
        }
      });
    },

    validatePersonalDetails: async () => {
      const details = get().personalDetails;
      const now = Date.now();

      if (
        !details ||
        Object.values(details).every((value) => !value || value.trim() === '')
      ) {
        return false;
      }

      const requiredFields = ['firstName', 'lastName', 'email'];
      if (
        requiredFields.some(
          (field) => !details[field as keyof PassengerDetails]?.trim()
        )
      ) {
        return false;
      }

      const context = createValidationContext(get(), {
        step: 3,
        type: 'personal_details',
        timestamp: now,
      });

      const result = await validationManager.validate(context.state, 3);
      set(() => updateValidationState(get(), result.isValid, now, details));
      return result.isValid;
    },
  };
};
