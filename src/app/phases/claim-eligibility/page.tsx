'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setExtendedPersonalDetails, completePhase } from '@/store/bookingSlice';
import { validateForm, rules } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import PhaseGuard from '@/components/shared/PhaseGuard';

interface FormData {
  phone: string;
  street: string;
  houseNumber: string;
  zipCode: string;
  city: string;
  country: string;
  dateOfBirth: string;
  nationality: string;
}

interface FormErrors {
  [key: string]: string[];
}

export default function ClaimEligibilityPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showLoading, hideLoading } = useLoading();
  const savedDetails = useAppSelector((state) => state.booking.extendedPersonalDetails);

  const [formData, setFormData] = useState<FormData>({
    phone: savedDetails?.phone || '',
    street: savedDetails?.street || '',
    houseNumber: savedDetails?.houseNumber || '',
    zipCode: savedDetails?.zipCode || '',
    city: savedDetails?.city || '',
    country: savedDetails?.country || '',
    dateOfBirth: savedDetails?.dateOfBirth || '',
    nationality: savedDetails?.nationality || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    phone: [rules.required(), rules.phone()],
    street: [rules.required(), rules.minLength(3)],
    houseNumber: [rules.required()],
    zipCode: [rules.required(), rules.zipCode()],
    city: [rules.required(), rules.minLength(2)],
    country: [rules.required(), rules.minLength(2)],
    dateOfBirth: [rules.required(), rules.date()],
    nationality: [rules.required(), rules.minLength(2)]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Saving your details...');

    try {
      // Save extended personal details
      dispatch(setExtendedPersonalDetails(formData));
      dispatch(completePhase(5));

      // Navigate to next phase
      router.push('/phases/agreement');
    } catch (error) {
      console.error('Failed to save personal details:', error);
      setErrors({
        submit: ['Failed to save your details. Please try again.']
      });
    } finally {
      hideLoading();
    }
  };

  return (
    <PhaseGuard requiredPhase={5} requiredPreviousPhases={[1, 2, 3, 4]}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-3xl font-bold mb-8">Complete Your Details</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, phone: e.target.value }));
                      setErrors(prev => ({ ...prev, phone: [] }));
                    }}
                    placeholder="Enter your phone number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.phone} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }));
                      setErrors(prev => ({ ...prev, dateOfBirth: [] }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.dateOfBirth} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Street
                  </label>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, street: e.target.value }));
                      setErrors(prev => ({ ...prev, street: [] }));
                    }}
                    placeholder="Enter street name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.street} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    House Number
                  </label>
                  <input
                    type="text"
                    value={formData.houseNumber}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, houseNumber: e.target.value }));
                      setErrors(prev => ({ ...prev, houseNumber: [] }));
                    }}
                    placeholder="Enter house number"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.houseNumber} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, zipCode: e.target.value }));
                      setErrors(prev => ({ ...prev, zipCode: [] }));
                    }}
                    placeholder="Enter ZIP code"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.zipCode} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, city: e.target.value }));
                      setErrors(prev => ({ ...prev, city: [] }));
                    }}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.city} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, country: e.target.value }));
                      setErrors(prev => ({ ...prev, country: [] }));
                    }}
                    placeholder="Enter country"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.country} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.nationality}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, nationality: e.target.value }));
                      setErrors(prev => ({ ...prev, nationality: [] }));
                    }}
                    placeholder="Enter nationality"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.nationality} />
                </div>
              </div>
            </div>

            <FormError errors={errors.submit} />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/phases/trip-experience')}
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
        </main>
      </div>
    </PhaseGuard>
  );
}