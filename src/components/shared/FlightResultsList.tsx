import React from 'react';
import { Flight } from '@/types';

interface FlightResultsListProps {
  flights: Flight[];
  onFlightSelect: (flight: Flight) => void;
  onNotListedClick?: () => void;
  className?: string;
}

export const FlightResultsList: React.FC<FlightResultsListProps> = ({
  flights,
  onFlightSelect,
  onNotListedClick,
  className = '',
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">Available Flights</h2>
      {flights.map((flight) => (
        <button
          key={flight.id}
          onClick={() => onFlightSelect(flight)}
          className="w-full p-4 border-2 rounded-lg hover:border-blue-600 transition-colors group"
        >
          <div className="flex justify-between items-start">
            <div className="text-left">
              <p className="font-medium text-gray-900 group-hover:text-blue-600">
                {flight.airline} - {flight.flightNumber}
              </p>
              <div className="mt-2 flex items-center space-x-8">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {flight.departureTime}
                  </p>
                  <p className="text-sm text-gray-500">
                    {flight.departureCity}
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
                  <p className="text-sm text-gray-500">{flight.arrivalCity}</p>
                </div>
              </div>
            </div>
            <span className="text-lg font-semibold text-gray-900">
              ${flight.price}
            </span>
          </div>
        </button>
      ))}
      {onNotListedClick && (
        <button
          onClick={onNotListedClick}
          className="w-full text-center text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          Can&apos;t find your flight? Click here
        </button>
      )}
    </div>
  );
};
