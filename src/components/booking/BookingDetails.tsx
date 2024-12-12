import React from 'react';
import { useBookingContext } from '@/context/BookingContext';

export default function BookingDetails() {
  const { state } = useBookingContext();
  const { selectedFlight, experienceType, passengerDetails } = state;

  if (!selectedFlight || !experienceType || !passengerDetails) {
    return (
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            Missing booking information. Please complete all previous steps.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-semibold text-gray-800">
            Booking Summary
          </h2>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Flight Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Flight Number</p>
                <p className="font-medium">{selectedFlight.flightNumber}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Airline</p>
                <p className="font-medium">{selectedFlight.airline}</p>
              </div>
              <div>
                <label className="text-gray-600">From</label>
                <p className="font-medium">{selectedFlight.departureCity}</p>
                <p className="text-sm text-gray-500">{selectedFlight.departureTime}</p>
              </div>
              <div>
                <label className="text-gray-600">To</label>
                <p className="font-medium">{selectedFlight.arrivalCity}</p>
                <p className="text-sm text-gray-500">{selectedFlight.arrivalTime}</p>
              </div>
              <div className="mt-4">
                <p className="text-lg font-medium">
                  Price: ${selectedFlight.price.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Experience Type
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="font-medium capitalize">
                {experienceType} Experience
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Passenger Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">
                  {passengerDetails.firstName} {passengerDetails.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{passengerDetails.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{passengerDetails.phone}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Price Details
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-500">Base Price</p>
                <p className="font-medium">${selectedFlight.price}</p>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-gray-500">Experience Upgrade</p>
                <p className="font-medium">
                  $
                  {experienceType === 'premium'
                    ? '200'
                    : experienceType === 'luxury'
                    ? '700'
                    : '0'}
                </p>
              </div>
              <div className="border-t mt-4 pt-4">
                <div className="flex justify-between items-center font-semibold">
                  <p>Total</p>
                  <p className="text-blue-600">
                    $
                    {selectedFlight.price +
                      (experienceType === 'premium'
                        ? 200
                        : experienceType === 'luxury'
                        ? 700
                        : 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t">
          <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Confirm Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export { BookingDetails };
