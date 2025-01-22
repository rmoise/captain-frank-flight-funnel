'use client';

import React from 'react';
import type { Flight } from '@/types/store';
import { getRejectionReason } from '@/utils/flightIssues';

interface RejectionReasonProps {
  flights: Flight[];
}

export const RejectionReason: React.FC<RejectionReasonProps> = ({
  flights,
}) => {
  const reason = getRejectionReason(flights[0]?.issueType || 'unknown');

  return (
    <div className="text-red-600">
      <p>{reason}</p>
    </div>
  );
};
