import React from 'react';
import { useBookingContext } from '@/context/BookingContext';

export default function BookingDetails() {
  const { state } = useBookingContext();
  const { selectedFlights, experienceType, passengerDetails } = state;
  const selectedFlight = selectedFlights[0]; // Use the first flight for now

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
          {selectedFlights.map((flight, index) => (
            <div key={index}>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {selectedFlights.length > 1
                  ? `Flight ${index + 1} Details`
                  : 'Flight Details'}
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Flight Number</p>
                  <p className="font-medium">{flight.flightNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Airline</p>
                  <p className="font-medium">{flight.airline}</p>
                </div>
                <div>
                  <label className="text-gray-600">From</label>
                  <p className="font-medium">{flight.departureCity}</p>
                  <p className="text-sm text-gray-500">
                    {flight.departureTime}
                  </p>
                </div>
                <div>
                  <label className="text-gray-600">To</label>
                  <p className="font-medium">{flight.arrivalCity}</p>
                  <p className="text-sm text-gray-500">{flight.arrivalTime}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    Status: {flight.status || 'Scheduled'}
                  </p>
                  {flight.price !== undefined && (
                    <p className="text-sm text-gray-500">
                      Price: ${flight.price.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { BookingDetails };
