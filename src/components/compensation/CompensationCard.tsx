'use client';

import React from 'react';
import type { Flight, PassengerDetails } from '@/types/store';
import { calculateCompensation } from '@/utils/compensation';
import { Card } from '@/components/shared/Card';
import { formatCurrency } from '@/utils/currency';

interface CompensationCardProps {
  flights: Flight[];
  details: PassengerDetails | null;
}

export function CompensationCard({ flights, details }: CompensationCardProps) {
  // Return empty card if no flights
  if (!flights?.length) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-600">
          Keine Fluginformationen verfügbar
        </div>
      </Card>
    );
  }

  const compensation = calculateCompensation(flights[0]);
  const name = details ? `${details.firstName} ${details.lastName}` : '';

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Dein möglicher Anspruch
            </h2>
            {name && <p className="text-sm text-gray-600 mt-1">für {name}</p>}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(compensation.amount)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Geschätzte Entschädigung
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mt-4">
          <p className="text-sm text-gray-600">
            Diese Einschätzung basiert auf der EU-Verordnung 261/2004 und deinen
            Angaben. Die finale Entschädigungshöhe kann von dieser Einschätzung
            abweichen.
          </p>
        </div>
      </div>
    </Card>
  );
}
