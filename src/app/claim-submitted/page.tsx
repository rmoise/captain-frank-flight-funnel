'use client';

import React, { useEffect } from 'react';
import useStore from '@/lib/state/store';
import { useTranslation } from '@/hooks/useTranslation';

export default function ClaimSubmittedPage() {
  const personalDetails = useStore((state) => state.personalDetails);
  const hideLoading = useStore((state) => state.hideLoading);
  const { t } = useTranslation();

  useEffect(() => {
    hideLoading();
  }, [hideLoading]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="text-center mb-6">
        <span className="text-5xl mb-4 block">🎉</span>
        <h1 className="text-3xl font-bold mb-8">
          {t.phases.claimSubmitted.title}
        </h1>
      </div>
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-green-700 mb-4">
          {t.phases.claimSubmitted.thankYou.replace(
            '{firstName}',
            personalDetails?.firstName || ''
          )}
        </h2>
        <p className="text-gray-700 mb-4">
          {t.phases.claimSubmitted.description}
        </p>
        <p className="text-gray-700 mb-4">
          {t.phases.claimSubmitted.emailConfirmation.replace(
            '{email}',
            personalDetails?.email || ''
          )}
        </p>
        <p className="text-gray-700">{t.phases.claimSubmitted.support}</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t.phases.claimSubmitted.nextSteps.title}
        </h3>
        <ul className="list-disc pl-5 text-gray-700 space-y-2">
          <li>{t.phases.claimSubmitted.nextSteps.review}</li>
          <li>{t.phases.claimSubmitted.nextSteps.contact}</li>
          <li>{t.phases.claimSubmitted.nextSteps.updates}</li>
        </ul>
      </div>
    </div>
  );
}
