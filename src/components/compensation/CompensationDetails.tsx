'use client';

import React from 'react';
import type { Flight } from '@/types/store';
import { Card } from '@/components/shared/Card';
import { getFlightIssueDetails } from '@/utils/flightIssues';

interface CompensationDetailsProps {
  flights: Flight[];
}

export function CompensationDetails({ flights }: CompensationDetailsProps) {
  const issueDetails = getFlightIssueDetails(flights[0]);

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

  const flight = flights[0]; // Currently handling single flight

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Details zu deinem Fall
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Flugnummer</span>
              <span className="font-medium text-gray-900">
                {flight.flightNumber}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Flugdatum</span>
              <span className="font-medium text-gray-900">
                {new Date(flight.departure).toLocaleDateString('de-DE')}
              </span>
            </div>

            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Problem</span>
              <span className="font-medium text-gray-900">
                {issueDetails.issueType}
              </span>
            </div>

            {flight.duration && (
              <div className="flex justify-between py-3 border-b border-gray-200">
                <span className="text-gray-600">Dauer</span>
                <span className="font-medium text-gray-900">
                  {flight.duration}
                </span>
              </div>
            )}

            <div className="flex justify-between py-3 border-b border-gray-200">
              <span className="text-gray-600">Flugstrecke</span>
              <span className="font-medium text-gray-900">
                {flight.distance} km
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">
            Rechtliche Grundlage
          </h4>
          <p className="text-sm text-gray-600">{issueDetails.description}</p>
        </div>
      </div>
    </Card>
  );
}
