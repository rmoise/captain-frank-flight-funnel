'use client';

import React from 'react';
import type { Flight, PassengerDetails } from '@/types/store';
import { formatDate } from '@/utils/date';
import { formatCurrency } from '@/utils/currency';
import { calculateCompensation } from '@/utils/compensation';

interface CompensationSummaryProps {
  personalDetails: PassengerDetails | null;
  flights: Flight[];
}

export const CompensationSummary: React.FC<CompensationSummaryProps> = ({
  personalDetails,
  flights,
}) => {
  if (!personalDetails) {
    return null;
  }

  const compensation = calculateCompensation(flights[0]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Zusammenfassung</h3>
        <div className="mt-4 border-t border-b border-gray-200 divide-y divide-gray-200">
          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Flugnummer
                </h4>
                <p className="mt-1">{flights[0]?.flightNumber}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">Datum</h4>
                <p className="mt-1">{formatDate(flights[0]?.departure)}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500">
                  Fluggesellschaft
                </h4>
                <p className="mt-1">{flights[0]?.airline}</p>
              </div>
            </div>
          </div>

          <div className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="py-4">
            <div className="flex justify-between items-center">
              <h4 className="text-lg font-medium text-gray-900">
                Geschätzte Entschädigung
              </h4>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(compensation.amount)}
              </p>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Die tatsächliche Entschädigung kann von dieser Schätzung
              abweichen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
