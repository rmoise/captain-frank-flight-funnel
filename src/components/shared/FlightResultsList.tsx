import React from 'react';
import { Flight } from '@/types';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface FlightResultsListProps {
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
  onFlightDelete?: (flight: Flight) => void;
  onFlightEdit?: (flight: Flight) => void;
  selectedFlights?: Flight[];
  className?: string;
}

export const FlightResultsList: React.FC<FlightResultsListProps> = ({
  flights,
  onFlightSelect,
  onFlightDelete,
  onFlightEdit,
  selectedFlights = [],
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Selected Flights Section */}
      {selectedFlights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Selected Flights
          </h2>
          {selectedFlights.map((flight, index) => (
            <div
              key={flight.id}
              className="p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">
                      Flight {index + 1}: {flight.flightNumber}
                    </p>
                    <span className="text-sm text-gray-500">•</span>
                    <p className="text-sm text-gray-500">{flight.date}</p>
                  </div>
                  <div className="flex items-center space-x-8 mt-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {flight.departureTime}
                      </p>
                      <p className="text-sm text-gray-500">
                        {flight.departureCity} ({flight.departure})
                      </p>
                    </div>
                    <div className="flex-1 border-t border-gray-300 relative">
                      <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-50 px-2">
                        ✈️
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {flight.arrivalTime}
                      </p>
                      <p className="text-sm text-gray-500">
                        {flight.arrivalCity} ({flight.arrival})
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {flight.duration}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onFlightEdit?.(flight)}
                    className="p-2 text-gray-500 hover:text-[#F54538]"
                  >
                    <PencilIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onFlightDelete?.(flight)}
                    className="p-2 text-gray-500 hover:text-[#F54538]"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Available Flights Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Available Flights
        </h2>
        {flights.map((flight) => (
          <button
            key={flight.id}
            onClick={() => onFlightSelect(flight)}
            className="w-full p-4 border-2 rounded-lg hover:border-[#F54538] transition-colors group"
          >
            <div className="flex justify-between items-start">
              <div className="text-left">
                <p className="font-medium text-gray-900 group-hover:text-[#F54538]">
                  {flight.airline} - {flight.flightNumber}
                </p>
                <div className="mt-2 flex items-center space-x-8">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {flight.departureTime}
                    </p>
                    <p className="text-sm text-gray-500">
                      {flight.departureCity} ({flight.departure})
                    </p>
                  </div>
                  <div className="flex-1 border-t border-gray-300 relative">
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2">
                      ✈️
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {flight.arrivalTime}
                    </p>
                    <p className="text-sm text-gray-500">
                      {flight.arrivalCity} ({flight.arrival})
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {flight.duration}
                    </p>
                  </div>
                </div>
              </div>
              {flight.price !== undefined && (
                <span className="text-lg font-semibold text-gray-900">
                  ${flight.price}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
