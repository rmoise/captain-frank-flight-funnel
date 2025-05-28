import type { Flight } from "@/types/shared/flight";
import type { Answer } from "@/types/shared/wizard";

export interface ValidationRule {
  test: (value: unknown) => boolean;
  message: string;
}

export interface FormValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string[];
}

export interface FormData {
  [key: string]: unknown;
}

export type ValidatableFormData = FormData | globalThis.FormData;

export const validateForm = (
  data: ValidatableFormData,
  rules: FormValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};
  const formDataObj: FormData =
    data instanceof globalThis.FormData
      ? Object.fromEntries(
          Array.from(data.entries()).map(([key, value]) => [key, value])
        )
      : data;

  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = formDataObj[field];
    const fieldErrors = fieldRules
      .filter((rule: ValidationRule) => !rule.test(value))
      .map((rule: ValidationRule) => rule.message);

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return errors;
};

// Common validation rules
export const rules = {
  required: (message = "This field is required"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "boolean") return value === true;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message,
  }),

  email: (message = "Please enter a valid email address"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  phone: (message = "Please enter a valid phone number"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^\+?[\d\s-]{10,}$/.test(value);
    },
    message,
  }),

  minLength: (
    length: number,
    message = `Must be at least ${length} characters`
  ): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return value.length >= length;
    },
    message,
  }),

  maxLength: (
    length: number,
    message = `Must be no more than ${length} characters`
  ): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return value.length <= length;
    },
    message,
  }),

  numeric: (message = "Must be a number"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return !isNaN(Number(value));
    },
    message,
  }),

  date: (message = "Please enter a valid date"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return !isNaN(Date.parse(value));
    },
    message,
  }),

  flightNumber: (
    message = "Please enter a valid flight number"
  ): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^[A-Z0-9]{2,3}\s*\d{1,4}[A-Z]?$/i.test(value);
    },
    message,
  }),

  bookingReference: (
    message = "Please enter a valid booking reference"
  ): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^[A-Z0-9]{5,8}$/i.test(value);
    },
    message,
  }),

  zipCode: (message = "Please enter a valid postal code"): ValidationRule => ({
    test: (value: unknown): boolean => {
      if (typeof value !== "string") return false;
      return /^[A-Z0-9\s-]{3,10}$/i.test(value);
    },
    message,
  }),
};

export interface StepValidationRules {
  flight: (flight: Flight | Flight[] | null) => boolean;
  wizardAnswers: (answers: Answer[]) => boolean;
}

export const validationRules: StepValidationRules = {
  flight: (flight: Flight | Flight[] | null) => {
    if (Array.isArray(flight)) {
      return flight.length > 0;
    }
    return !!flight;
  },
  wizardAnswers: (answers: Answer[]) => {
    return answers.length > 0 && answers.every((answer) => answer.value !== "");
  },
};

export interface ValidationRecord {
  isValid: boolean;
  hasInteracted: boolean;
  errors: string[];
}

export const createEmptyValidationRecords = (
  steps: number
): Record<number, ValidationRecord> => {
  const records: Record<number, ValidationRecord> = {};
  for (let i = 1; i <= steps; i++) {
    records[i] = {
      isValid: false,
      hasInteracted: false,
      errors: [],
    };
  }
  return records;
};
