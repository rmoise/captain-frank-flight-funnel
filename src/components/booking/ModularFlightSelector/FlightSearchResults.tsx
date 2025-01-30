import React from 'react';
import { BottomSheet } from '@/components/shared/Sheet';
import type { Flight } from '@/types/store';

interface FlightSearchResultsProps {
  isOpen: boolean;
  onClose: () => void;
  flights: Flight[];
  onSelect: (flight: Flight) => void;
}

export const FlightSearchResults: React.FC<FlightSearchResultsProps> = ({
  isOpen,
  onClose,
  flights,
  onSelect,
}) => {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Available Flights">
      <div className="space-y-4">
        {flights.map((flight) => (
          <button
            key={flight.id}
            onClick={() => {
              onSelect(flight);
              onClose();
            }}
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
    </BottomSheet>
  );
};
