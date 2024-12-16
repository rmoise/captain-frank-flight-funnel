'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { useAppSelector } from '@/store/hooks';

export default function ClaimSubmittedPage() {
  const router = useRouter();
  const { personalDetails } = useAppSelector((state) => state.booking);

  // Check if user should be allowed on this page
  React.useEffect(() => {
    if (!personalDetails) {
      router.push('/');
    }
  }, [personalDetails, router]);

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <main className="max-w-3xl mx-auto px-4 pt-16 pb-24">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <CheckCircleIcon className="w-20 h-20 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold mb-4">
            Claim Successfully Submitted!
          </h1>

          <p className="text-lg text-gray-600 mb-8">
            Thank you for submitting your claim. We'll start processing it right away.
          </p>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">What happens next?</h2>
            <div className="text-left space-y-4">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                  1
                </div>
                <p className="text-gray-700">
                  Our team will review your claim within the next 24 hours
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                  2
                </div>
                <p className="text-gray-700">
                  We'll contact the airline and start the compensation process
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#F54538] text-white flex items-center justify-center text-sm">
                  3
                </div>
                <p className="text-gray-700">
                  You'll receive regular updates about your claim status via email
                </p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
            <p className="text-sm text-blue-800">
              We've sent a confirmation email to <strong>{personalDetails?.email}</strong> with your claim details.
            </p>
          </div>

          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-[#F54538] text-white rounded-lg hover:bg-[#E03F33] transition-colors"
          >
            Return to Home
          </button>
        </div>
      </main>
    </div>
  );
}