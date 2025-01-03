'use client';

import React, { useEffect, useCallback } from 'react';
import { useStore } from '@/lib/state/store';

export default function ClaimSubmittedPage() {
  const personalDetails = useStore((state) => state.personalDetails);
  const hideLoading = useStore((state) => state.hideLoading);

  const handleHideLoading = useCallback(() => {
    hideLoading();
  }, [hideLoading]);

  useEffect(() => {
    handleHideLoading();
  }, [handleHideLoading]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Claim Submitted</h1>
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          Thank You, {personalDetails?.firstName}!
        </h2>
        <p className="text-gray-700 mb-4">
          Your claim has been successfully submitted. We will review your case
          and get back to you as soon as possible.
        </p>
        <p className="text-gray-700 mb-4">
          You will receive a confirmation email at {personalDetails?.email} with
          your claim details.
        </p>
        <p className="text-gray-700">
          If you have any questions or need to provide additional information,
          please don&apos;t hesitate to contact our support team.
        </p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Next Steps</h3>
        <ul className="list-disc list-inside text-gray-700 space-y-2">
          <li>We will review your claim within 2-3 business days</li>
          <li>
            Our team will contact you if we need any additional information
          </li>
          <li>You will receive updates about your claim status via email</li>
        </ul>
      </div>
    </div>
  );
}
