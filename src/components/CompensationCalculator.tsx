'use client';

import React from 'react';
import { useStore } from '@/lib/state/store';
import { LoadingSpinner } from './shared/LoadingSpinner';

export const CompensationCalculator: React.FC = () => {
  const {
    compensationAmount,
    compensationLoading,
    compensationError,
    flightDetails,
    delayDuration,
  } = useStore();

  if (!flightDetails || !delayDuration) {
    return (
      <div className="text-center text-gray-500">
        Please enter your flight details and delay duration to calculate
        potential compensation.
      </div>
    );
  }

  if (compensationLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <LoadingSpinner className="w-8 h-8 text-primary-600" />
        <span className="ml-2 text-gray-600">Calculating compensation...</span>
      </div>
    );
  }

  if (compensationError) {
    return (
      <div className="text-center text-red-600 py-4">
        <p>{compensationError}</p>
        <p className="text-sm mt-2">
          Please try again or contact support if the problem persists.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">
        Estimated Compensation
      </h2>
      {compensationAmount !== null ? (
        <>
          <p className="text-4xl font-bold text-primary-600">
            {new Intl.NumberFormat('en-GB', {
              style: 'currency',
              currency: 'EUR',
            }).format(compensationAmount)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Based on EU regulation 261/2004
          </p>
          <div className="mt-4 text-sm text-gray-600">
            <p>Flight: {flightDetails.flightNumber}</p>
            <p>Delay: {delayDuration} hours</p>
          </div>
        </>
      ) : (
        <p className="text-gray-500">No compensation estimate available</p>
      )}
    </div>
  );
};
