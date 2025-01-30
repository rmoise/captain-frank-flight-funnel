import type { ValidationResult } from '@/types/validation';

export const validateTerms = (isAccepted: boolean): ValidationResult => {
  const errors: string[] = [];

  if (!isAccepted) {
    errors.push('You must accept the terms and conditions to continue');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};