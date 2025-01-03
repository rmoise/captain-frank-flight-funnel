'use client';

import React, { useState, useMemo } from 'react';
import { Flight } from '@/types/store';
import { DatePicker } from '@/components/forms/DatePicker';

interface FlightSelectorProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date | null) => void;
  onFlightSelect: (flight: Flight) => void;
  flights: Flight[];
}

export const FlightSelector: React.FC<FlightSelectorProps> = ({
  selectedDate,
  onDateSelect,
  onFlightSelect,
  flights,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Determine if search should be enabled
  const isSearchEnabled = useMemo(() => {
    return !!selectedDate;
  }, [selectedDate]);

  // Filter flights based on search query
  const filteredFlights = useMemo(() => {
    if (!searchQuery.trim()) return flights;

    const query = searchQuery.toLowerCase();
    return flights.filter(
      (flight) =>
        flight.flightNumber.toLowerCase().includes(query) ||
        flight.airline.toLowerCase().includes(query)
    );
  }, [flights, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Date Picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Flight Date
        </label>
        <DatePicker
          selected={selectedDate}
          onChange={onDateSelect}
          className="w-full"
        />
      </div>

      {/* Flight Search */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Flights
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by flight number or airline..."
          disabled={!isSearchEnabled}
          className={`w-full p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-[#F54538] focus:border-transparent ${
            !isSearchEnabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
          }`}
        />
      </div>

      {/* Flight List */}
      {isSearchEnabled && (
        <div className="space-y-4">
          {filteredFlights.map((flight) => (
            <button
              key={flight.flightNumber}
              onClick={() => onFlightSelect(flight)}
              className="w-full p-4 border rounded-lg hover:border-[#F54538] transition-colors bg-white hover:bg-[#FEF2F2] text-left"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{flight.airline}</p>
                  <p className="text-sm text-gray-500">
                    Flight {flight.flightNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{flight.departureTime}</p>
                  <p className="text-sm text-gray-500">{flight.arrivalTime}</p>
                </div>
              </div>
            </button>
          ))}
          {filteredFlights.length === 0 && (
            <p className="text-center text-gray-500 py-4">
              No flights found matching your search
            </p>
          )}
        </div>
      )}
    </div>
  );
};
