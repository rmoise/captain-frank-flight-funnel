import React from 'react';
import clsx from 'clsx';

interface FlightOption {
  id: string;
  flightNumber: string;
  departureTime: string;
  arrivalTime: string;
  airline: string;
}

interface FlightOptionCardProps {
  flight: FlightOption;
  isSelected: boolean;
  onClick: () => void;
}

export const FlightOptionCard: React.FC<FlightOptionCardProps> = ({
  flight,
  isSelected,
  onClick,
}) => {
  return (
    <div
      className={clsx(
        'p-4 rounded-lg border cursor-pointer transition-all duration-200',
        isSelected
          ? 'border-[#F54538] bg-[#FEF2F2]'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">{flight.airline}</h3>
          <p className="text-sm text-gray-500">Flight {flight.flightNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">
            {new Date(flight.departureTime).toLocaleTimeString()} -{' '}
            {new Date(flight.arrivalTime).toLocaleTimeString()}
          </p>
        </div>
      </div>
    </div>
  );
};
