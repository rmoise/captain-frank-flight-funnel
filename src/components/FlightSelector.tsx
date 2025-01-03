'use client';

import React, { useEffect, useState } from 'react';
import { useStore } from '@/lib/state/store';
import type { Flight } from '@/types/store';
import { format } from 'date-fns';

interface FlightSelectorProps {
  onSelect?: (flight: Flight | Flight[]) => void;
  onInteract?: () => void;
  disabled?: boolean;
}

export const FlightSelector: React.FC<FlightSelectorProps> = ({
  onSelect = () => {},
  onInteract = () => {},
  disabled = false,
}) => {
  const { fromLocation, toLocation, selectedDate, selectedFlights } =
    useStore();

  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlights = async () => {
      if (!fromLocation || !toLocation || !selectedDate) {
        setFlights([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/flights?from=${fromLocation}&to=${toLocation}&date=${selectedDate}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch flights');
        }

        const data = await response.json();
        setFlights(data);
      } catch (err) {
        console.error('Error fetching flights:', err);
        setError('Failed to load available flights');
        setFlights([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFlights();
  }, [fromLocation, toLocation, selectedDate]);

  const handleFlightSelect = (flight: Flight) => {
    if (disabled) return;
    onSelect(flight);
    onInteract();
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading available flights...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  if (!fromLocation || !toLocation || !selectedDate) {
    return (
      <div className="p-4 text-center text-gray-600">
        Please select departure, arrival locations and date to see available
        flights.
      </div>
    );
  }

  if (flights.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        No flights available for the selected route and date.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Available Flights</h3>
      <div className="grid gap-4">
        {flights.map((flight) => {
          const isSelected = selectedFlights.some((f) => f.id === flight.id);
          return (
            <button
              key={flight.id}
              onClick={() => handleFlightSelect(flight)}
              disabled={disabled}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary-600 bg-primary-50'
                  : 'border-gray-200 hover:border-primary-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">
                    {flight.airline} {flight.flightNumber}
                  </p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(flight.departureTime), 'HH:mm')} -{' '}
                    {format(new Date(flight.arrivalTime), 'HH:mm')}
                  </p>
                  <p className="text-sm text-gray-600">
                    {flight.departureCity} → {flight.arrivalCity}
                  </p>
                </div>
                {flight.arrivalDelay && (
                  <div className="text-right">
                    <p className="font-medium text-red-600">
                      Delayed by {Math.round(flight.arrivalDelay / 60)} minutes
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
