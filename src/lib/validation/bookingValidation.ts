import type { ValidationResult } from '@/types/validation';

export const validateBookingNumber = (
  bookingNumber: string
): ValidationResult => {
  const errors: string[] = [];

  // Trim the booking number
  const trimmedBookingNumber = bookingNumber.trim();

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
