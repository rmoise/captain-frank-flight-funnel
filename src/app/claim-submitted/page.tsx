'use client';

import React from 'react';
import { useAppSelector } from '@/store/hooks';
import { Card } from '@/components/shared/Card';
import { formatCurrency } from '@/utils/helpers';

export default function ClaimSubmittedPage() {
  const personalDetails = useAppSelector((state) => state.user.personalDetails);
  const selectedFlights = useAppSelector(
    (state) => state.flight.selectedFlights
  );
  const compensationAmount = useAppSelector(
    (state) => state.compensation.compensationAmount
  );

  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="bg-white p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Claim Submitted Successfully
            </h1>
            <p className="text-lg text-gray-600">
              Thank you for submitting your claim. We&apos;ll be in touch soon.
            </p>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Claim Summary</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Reference Number</p>
                    <p className="font-medium">
                      {selectedFlights[0]?.id || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      Estimated Compensation
                    </p>
                    <p className="font-medium">
                      {formatCurrency(compensationAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Flight Details</h2>
              <div className="space-y-4">
                {selectedFlights.map((flight) => (
                  <div
                    key={flight.id}
                    className="bg-gray-50 rounded-lg p-4 space-y-2"
                  >
                    <div className="flex justify-between">
                      <div>
                        <p className="font-medium">
                          {flight.departureCity} to {flight.arrivalCity}
                        </p>
                        <p className="text-sm text-gray-600">
                          {flight.departure} - {flight.arrival}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Flight {flight.id}</p>
                        <p className="text-sm text-gray-600">{flight.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">Personal Details</h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">
                      {personalDetails?.firstName} {personalDetails?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{personalDetails?.email}</p>
                  </div>
                  {personalDetails?.phone && (
                    <div>
                      <p className="text-sm text-gray-600">Phone</p>
                      <p className="font-medium">{personalDetails.phone}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center text-gray-600">
              <p>
                We&apos;ll send you an email confirmation shortly with more
                details about your claim.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
