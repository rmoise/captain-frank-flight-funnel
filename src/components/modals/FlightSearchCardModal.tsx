import React from 'react';
import { Flight } from '@/types';

interface FlightSearchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
}

export default function FlightSearchCardModal({
  isOpen,
  onClose,
  flights,
  onFlightSelect,
}: FlightSearchCardModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold text-gray-800">
              Select Your Flight
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flights.map((flight) => (
            <div
              key={flight.id}
              className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {flight.airline}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Flight {flight.flightNumber}
                  </p>
                </div>
                <span className="text-lg font-bold text-blue-600">
                  ${flight.price}
                </span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {flight.departureCity}
                  </p>
                  <p className="text-xs text-gray-500">
                    {flight.departureTime}
                  </p>
                </div>
                <div className="flex-1 mx-4">
                  <div className="h-0.5 bg-gray-300 relative">
                    <div className="absolute inset-y-0 -mt-1">
                      <svg
                        className="h-3 w-3 text-gray-400"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M3.64 14.26l2.86.95 4.02-4.02-8-4.59 1.16-1.16c.1-.1.26-.14.41-.1l9.3 2.98c1.58-1.58 3.15-3.2 4.77-4.75.31-.33.7-.58 1.16-.73.45-.16.94-.2 1.42-.13.48.07.94.26 1.34.53.4.27.73.64.97 1.07.24.42.37.89.37 1.37 0 .49-.13.96-.37 1.39-.24.42-.57.79-.97 1.06L13.65 13l2.98 9.3c.05.15 0 .31-.1.41l-1.17 1.16-4.57-8.02L6.8 19.8l.95 2.84-.94.94-2.99-5.62-5.6-2.99.94-.94z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    {flight.arrivalCity}
                  </p>
                  <p className="text-xs text-gray-500">{flight.arrivalTime}</p>
                </div>
              </div>

              <button
                onClick={() => onFlightSelect(flight)}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Select Flight
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
