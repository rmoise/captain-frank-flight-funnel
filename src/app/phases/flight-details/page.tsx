'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setFlightDetails, completePhase } from '@/store/bookingSlice';
import { validateForm, rules } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import PhaseGuard from '@/components/shared/PhaseGuard';

interface FormData {
  flightDate: string;
  flightNumber: string;
  bookingReference: string;
}

interface FormErrors {
  [key: string]: string[];
}

const validationRules = {
  flightDate: [
    rules.required('Flight date is required'),
    rules.date('Please enter a valid flight date')
  ],
  flightNumber: [
    rules.required('Flight number is required'),
    rules.flightNumber('Please enter a valid flight number')
  ],
  bookingReference: [
    rules.required('Booking reference is required'),
    rules.bookingReference('Please enter a valid booking reference')
  ]
};

export default function FlightDetailsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showLoading, hideLoading } = useLoading();
  const savedFlightDetails = useAppSelector((state) => state.booking.flightDetails);

  const [formData, setFormData] = useState<FormData>({
    flightDate: savedFlightDetails?.flightDate || '',
    flightNumber: savedFlightDetails?.flightNumber || '',
    bookingReference: savedFlightDetails?.bookingReference || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    flightDate: false,
    flightNumber: false,
    bookingReference: false
  });

  // Validate on blur
  const handleBlur = (field: keyof FormData) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const fieldErrors = validateForm({ [field]: formData[field] }, {
      [field]: validationRules[field]
    });
    setErrors(prev => ({ ...prev, [field]: fieldErrors[field] || [] }));
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const fieldErrors = validateForm({ [field]: value }, {
        [field]: validationRules[field]
      });
      setErrors(prev => ({ ...prev, [field]: fieldErrors[field] || [] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      flightDate: true,
      flightNumber: true,
      bookingReference: true
    });

    // Validate form
    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Saving flight details...');

    try {
      // Save flight details
      dispatch(setFlightDetails(formData));
      dispatch(completePhase(3));

      // Navigate to next phase
      router.push('/phases/trip-experience');
    } catch (error) {
      console.error('Failed to save flight details:', error);
      setErrors({
        submit: ['Failed to save flight details. Please try again.']
      });
    } finally {
      hideLoading();
    }
  };

  return (
    <PhaseGuard requiredPhase={3} requiredPreviousPhases={[1, 2]}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-3xl font-bold mb-8">Flight Details</h1>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight Date
                </label>
                <input
                  type="date"
                  value={formData.flightDate}
                  onChange={(e) => handleChange('flightDate', e.target.value)}
                  onBlur={() => handleBlur('flightDate')}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent ${
                    errors.flightDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <FormError errors={errors.flightDate} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Flight Number
                </label>
                <input
                  type="text"
                  value={formData.flightNumber}
                  onChange={(e) => handleChange('flightNumber', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('flightNumber')}
                  placeholder="e.g. BA123"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent ${
                    errors.flightNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <FormError errors={errors.flightNumber} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Reference
                </label>
                <input
                  type="text"
                  value={formData.bookingReference}
                  onChange={(e) => handleChange('bookingReference', e.target.value.toUpperCase())}
                  onBlur={() => handleBlur('bookingReference')}
                  placeholder="e.g. ABC123"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent ${
                    errors.bookingReference ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <FormError errors={errors.bookingReference} />
              </div>

              <FormError errors={errors.submit} />

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => router.push('/phases/compensation-estimate')}
                  className="px-6 py-3 text-[#F54538] hover:bg-[#FEF2F2] rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
                >
                  Continue
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </PhaseGuard>
  );
}