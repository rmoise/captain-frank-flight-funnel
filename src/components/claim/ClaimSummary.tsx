'use client';

import React from 'react';
import type { PassengerDetails } from '@/types/store';

interface ClaimSummaryProps {
  personalDetails: PassengerDetails | null;
}

export const ClaimSummary: React.FC<ClaimSummaryProps> = ({
  personalDetails,
}) => {
  if (!personalDetails) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-500">Name</h4>
        <p className="mt-1">
          {personalDetails.firstName} {personalDetails.lastName}
        </p>
      </div>
      <div>
        <h4 className="text-sm font-medium text-gray-500">Email</h4>
        <p className="mt-1">{personalDetails.email}</p>
      </div>
    </div>
  );
};
