export interface ValidationRule {
  test: (value: any) => boolean;
  message: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule[];
}

export interface ValidationErrors {
  [key: string]: string[];
}

export const validateForm = (data: any, rules: ValidationRules): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.entries(rules).forEach(([field, fieldRules]) => {
    const value = data[field];
    const fieldErrors = fieldRules
      .filter(rule => !rule.test(value))
      .map(rule => rule.message);

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
    }
  });

  return errors;
};

// Common validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule => ({
    test: (value: any) => {
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return value !== null && value !== undefined;
    },
    message
  }),

  email: (message = 'Please enter a valid email address'): ValidationRule => ({
    test: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message
  }),

  phone: (message = 'Please enter a valid phone number'): ValidationRule => ({
    test: (value: string) => /^\+?[\d\s-]{10,}$/.test(value),
    message
  }),

  minLength: (length: number, message = `Must be at least ${length} characters`): ValidationRule => ({
    test: (value: string) => value.length >= length,
    message
  }),

  maxLength: (length: number, message = `Must be no more than ${length} characters`): ValidationRule => ({
    test: (value: string) => value.length <= length,
    message
  }),

  numeric: (message = 'Must be a number'): ValidationRule => ({
    test: (value: string) => !isNaN(Number(value)),
    message
  }),

  date: (message = 'Please enter a valid date'): ValidationRule => ({
    test: (value: string) => !isNaN(Date.parse(value)),
    message
  }),

  flightNumber: (message = 'Please enter a valid flight number'): ValidationRule => ({
    test: (value: string) => /^[A-Z0-9]{2,3}\s*\d{1,4}[A-Z]?$/i.test(value),
    message
  }),

  bookingReference: (message = 'Please enter a valid booking reference'): ValidationRule => ({
    test: (value: string) => /^[A-Z0-9]{5,8}$/i.test(value),
    message
  }),

  zipCode: (message = 'Please enter a valid postal code'): ValidationRule => ({
    test: (value: string) => /^[A-Z0-9\s-]{3,10}$/i.test(value),
    message
  })
};