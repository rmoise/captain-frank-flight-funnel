import type { ValidationResult } from '@/types/validation';

export const validateBookingNumber = (
  bookingNumber: string | undefined | null
): ValidationResult => {
  const errors: string[] = [];

  // Handle empty/undefined values
  if (!bookingNumber) {
    errors.push('Booking number is required');
    return {
      isValid: false,
      errors,
    };
  }

  // Trim the booking number
  const trimmedBookingNumber = bookingNumber.trim();

  // Check if empty after trimming
  if (trimmedBookingNumber.length === 0) {
    errors.push('Booking number is required');
    return {
      isValid: false,
      errors,
    };
  }

  // Check minimum length
  if (trimmedBookingNumber.length < 6) {
    errors.push('Booking number must be at least 6 characters long');
  }

  // Check format (alphanumeric)
  if (!/^[A-Z0-9]+$/i.test(trimmedBookingNumber)) {
    errors.push('Booking number can only contain letters and numbers');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
