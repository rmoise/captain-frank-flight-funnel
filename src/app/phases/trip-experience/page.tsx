'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setTripDetails, completePhase } from '@/store/bookingSlice';
import { validateForm, rules } from '@/utils/validation';
import FormError from '@/components/shared/FormError';
import { useLoading } from '@/providers/LoadingProvider';
import PhaseGuard from '@/components/shared/PhaseGuard';

interface FormData {
  whatHappened: string;
  actualFlights: string;
  tripCost: string;
  informedDate: string;
}

interface FormErrors {
  [key: string]: string[];
}

export default function TripExperiencePage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { showLoading, hideLoading } = useLoading();
  const savedTripDetails = useAppSelector((state) => state.booking.tripDetails);

  const [formData, setFormData] = useState<FormData>({
    whatHappened: savedTripDetails?.whatHappened || '',
    actualFlights: savedTripDetails?.actualFlights || '',
    tripCost: savedTripDetails?.tripCost || '',
    informedDate: savedTripDetails?.informedDate || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const validationRules = {
    whatHappened: [rules.required('Please select what happened with your flight')],
    actualFlights: [rules.required('Please list the flights you actually took')],
    tripCost: [
      rules.required('Please enter the total trip cost'),
      rules.numeric('Trip cost must be a number')
    ],
    informedDate: [
      rules.required('Please enter when you were informed'),
      rules.date('Please enter a valid date')
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const validationErrors = validateForm(formData, validationRules);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    showLoading('Saving trip experience details...');

    try {
      // Save trip details
      dispatch(setTripDetails(formData));
      dispatch(completePhase(4));

      // Navigate to next phase
      router.push('/phases/claim-eligibility');
    } catch (error) {
      console.error('Failed to save trip details:', error);
      setErrors({
        submit: ['Failed to save trip details. Please try again.']
      });
    } finally {
      hideLoading();
    }
  };

  return (
    <PhaseGuard requiredPhase={4} requiredPreviousPhases={[1, 2, 3]}>
      <div className="min-h-screen bg-[#f5f7fa]">
        <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
          <h1 className="text-3xl font-bold mb-8">Your Trip Experience</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">What Happened?</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select what happened with your flight
                  </label>
                  <select
                    value={formData.whatHappened}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, whatHappened: e.target.value }));
                      setErrors(prev => ({ ...prev, whatHappened: [] }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  >
                    <option value="">Select an option</option>
                    <option value="delayed">Flight was delayed</option>
                    <option value="cancelled">Flight was cancelled</option>
                    <option value="overbooked">Flight was overbooked</option>
                    <option value="missed-connection">Missed connection</option>
                  </select>
                  <FormError errors={errors.whatHappened} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Flight Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Actual flights flown
                  </label>
                  <textarea
                    value={formData.actualFlights}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, actualFlights: e.target.value }));
                      setErrors(prev => ({ ...prev, actualFlights: [] }));
                    }}
                    placeholder="Please list all flights you actually took"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                    rows={3}
                  />
                  <FormError errors={errors.actualFlights} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total trip cost (EUR)
                  </label>
                  <input
                    type="number"
                    value={formData.tripCost}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, tripCost: e.target.value }));
                      setErrors(prev => ({ ...prev, tripCost: [] }));
                    }}
                    placeholder="Enter amount in EUR"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                  <FormError errors={errors.tripCost} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    When were you first informed by the airline?
                  </label>
                  <input
                    type="date"
                    value={formData.informedDate}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, informedDate: e.target.value }));
                      setErrors(prev => ({ ...prev, informedDate: [] }));
                    }}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#F54538] focus:border-transparent"
                  />
                  <FormError errors={errors.informedDate} />
                </div>
              </div>
            </div>

            <FormError errors={errors.submit} />

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => router.push('/phases/flight-details')}
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