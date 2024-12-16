'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { XCircleIcon } from '@heroicons/react/24/solid';
import { useAppSelector } from '@/store/hooks';

export default function ClaimRejectedPage() {
  const router = useRouter();
  const { personalDetails, tripDetails } = useAppSelector((state) => state.booking);

  // Check if user should be allowed on this page
  React.useEffect(() => {
    if (!personalDetails || !tripDetails) {
      router.push('/');
    }
  }, [personalDetails, tripDetails, router]);

  // Function to get rejection reason based on trip details
  const getRejectionReason = () => {
    if (!tripDetails) return '';

    switch (tripDetails.whatHappened) {
      case 'delayed':
        return 'The delay duration does not meet the minimum requirement for compensation under EU regulation 261/2004.';
      case 'cancelled':
        return 'The cancellation was due to extraordinary circumstances which could not have been avoided by the airline.';
      case 'overbooked':
        return 'The airline provided alternative arrangements within the acceptable timeframe.';
      case 'missed-connection':
        return 'The connection time was outside the minimum connection time requirement.';
      default:
        return 'Your claim does not meet the eligibility criteria for compensation.';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <main className="max-w-3xl mx-auto px-4 pt-16 pb-24">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <XCircleIcon className="w-20 h-20 text-red-500" />
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Unable to Process Claim
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            We&apos;re sorry, but we are unable to process your claim at this time.
          </p>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Why was my claim rejected?</h2>
            <p className="text-gray-700 mb-6">
              {getRejectionReason()}
            </p>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">What you can do next:</h3>
              <ul className="text-left text-gray-700 space-y-2">
                <li>• Contact the airline directly for more information</li>
                <li>• Check if you have travel insurance coverage</li>
                <li>• Keep your documentation for future reference</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              We&apos;ve sent an email to <strong>{personalDetails?.email}</strong> with detailed information about this decision.
            </p>
          </div>

          <div className="space-x-4">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
            >
              Return to Home
            </button>
            <button
              onClick={() => router.push('/contact-support')}
              className="px-6 py-3 border border-[#F54538] text-[#F54538] rounded-lg hover:bg-[#FEF2F2] transition-colors"
            >
              Contact Support
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}