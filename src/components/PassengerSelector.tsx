import React from 'react';
import { useAppSelector } from '@/store/hooks';

export const PassengerSelector: React.FC = () => {
  const personalDetails = useAppSelector((state) => state.user.personalDetails);

  if (!personalDetails) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-2">Passenger Details</h3>
      <div className="space-y-2">
        <p>
          {personalDetails.firstName} {personalDetails.lastName}
        </p>
        <p className="text-gray-600">{personalDetails.email}</p>
        {personalDetails.phone && (
          <p className="text-gray-600">{personalDetails.phone}</p>
        )}
      </div>
    </div>
  );
};
