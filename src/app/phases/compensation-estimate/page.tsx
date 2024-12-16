'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function CompensationEstimatePage() {
  const router = useRouter();
  const { selectedFlight, wizardAnswers, personalDetails } = useAppSelector(
    (state) => state.booking
  );

  // Check if user should be allowed on this page
  React.useEffect(() => {
    // If phase 1 is not complete, redirect to home
    if (!selectedFlight || !wizardAnswers.length || !personalDetails) {
      router.push('/');
    }
  }, [selectedFlight, wizardAnswers, personalDetails, router]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <main className="max-w-3xl mx-auto px-4 pt-8 pb-24">
        <h1 className="text-3xl font-bold mb-8">Your Potential Compensation</h1>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Flight Summary</h2>
            {selectedFlight && (
              <div className="space-y-2">
                <p>Flight Number: {selectedFlight.flightNumber}</p>
                <p>From: {selectedFlight.departureCity}</p>
                <p>To: {selectedFlight.arrivalCity}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Estimated Compensation</h2>
            <div className="text-2xl font-bold text-[#F54538]">
              Up to €600
            </div>
            <p className="text-gray-600 mt-2">
              Final amount will be determined after reviewing your complete case details.
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => router.push('/phases/flight-details')}
            className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
          >
            Continue to Flight Details
          </button>
        </div>
      </main>
    </div>
  );
}