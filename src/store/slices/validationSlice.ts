import { StateCreator } from "zustand";
import { Store } from "../types";
import {
  ValidationPhase,
  ValidationState,
  ValidationActions,
  ValidationError,
  initialValidationState,
} from "@/types/shared/validation";

export const createValidationSlice: StateCreator<
  Store,
  [],
  [],
  ValidationActions
> = (set) => ({
  setStepValidation: (phase: ValidationPhase, isValid: boolean) => {
    console.log("🔍 VALIDATION SLICE: setStepValidation called", {
      phase,
      isValid,
      timestamp: new Date().toISOString(),
    });

    // Use the standard Zustand set function. Persist middleware handles storage.
    set((state) => {
      console.log("🔍 VALIDATION SLICE: Current state before update", {
        currentValidation: state.validation.stepValidation,
        updating: { [phase]: isValid },
      });

      const newState = {
        validation: {
          ...state.validation,
          stepValidation: {
            ...state.validation.stepValidation,
            [phase]: isValid,
          },
          _timestamp: Date.now(),
        },
      };

      console.log("🔍 VALIDATION SLICE: New state after update", {
        newValidation: newState.validation.stepValidation,
      });

      // No manual localStorage update needed here

      return newState;
    });
  },

  setStepCompleted: (phase: ValidationPhase, isComplete: boolean) =>
    set((state) => ({
      validation: {
        ...state.validation,
        stepCompleted: {
          ...state.validation.stepCompleted,
          [phase]: isComplete,
        },
        _timestamp: Date.now(),
      },
    })),

  setStepInteraction: (phase: ValidationPhase, hasInteracted: boolean) =>
    set((state) => ({
      validation: {
        ...state.validation,
        stepInteraction: {
          ...state.validation.stepInteraction,
          [phase]: hasInteracted,
        },
        _timestamp: Date.now(),
      },
    })),

  setStepSummary: (step: ValidationPhase, summary: string) =>
    set((state) => ({
      validation: {
        ...state.validation,
        stepSummary: {
          ...state.validation.stepSummary,
          [step]: summary,
        },
        _timestamp: Date.now(),
      },
    })),

  addStepError: (step: ValidationPhase, error: ValidationError) =>
    set((state) => ({
      validation: {
        ...state.validation,
        errors: {
          ...state.validation.errors,
          [step]: [...(state.validation.errors[step] || []), error.message],
        },
        _timestamp: Date.now(),
      },
    })),

  clearStepErrors: (step: ValidationPhase) =>
    set((state) => ({
      validation: {
        ...state.validation,
        errors: {
          ...state.validation.errors,
          [step]: [],
        },
        _timestamp: Date.now(),
      },
    })),

  addFieldError: (fieldName: string, error: string) =>
    set((state) => ({
      validation: {
        ...state.validation,
        fieldErrors: {
          ...state.validation.fieldErrors,
          [fieldName]: [
            ...(state.validation.fieldErrors[fieldName] || []),
            error,
          ],
        },
        _timestamp: Date.now(),
      },
    })),

  clearFieldErrors: (fieldName: string) =>
    set((state) => ({
      validation: {
        ...state.validation,
        fieldErrors: {
          ...state.validation.fieldErrors,
          [fieldName]: [],
        },
        _timestamp: Date.now(),
      },
    })),

  setIsValid: (isValid: boolean) =>
    set((state) => ({
      validation: {
        ...state.validation,
        isValid,
        _timestamp: Date.now(),
      },
    })),

  setIsComplete: (isComplete: boolean) =>
    set((state) => ({
      validation: {
        ...state.validation,
        isComplete,
        _timestamp: Date.now(),
      },
    })),

  resetValidation: () => {
    // Initialize errors structure with the correct type
    const initializeErrors = () => {
      const phases = Object.values(ValidationPhase);
      return phases.reduce(
        (acc, phase) => ({
          ...acc,
          [phase]: [],
        }),
        {} as Record<ValidationPhase, string[]>
      );
    };

    return set((state) => ({
      validation: {
        ...initialValidationState,
        errors: initializeErrors(), // Use the correctly initialized errors structure
        _timestamp: Date.now(),
      },
    }));
  },
});
