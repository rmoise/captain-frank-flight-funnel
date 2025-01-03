'use client';

import React from 'react';

interface FlightType {
  id: 'direct' | 'multi';
  label: string;
}

interface FlightTypeSelectorProps {
  types: FlightType[];
  selectedType: 'direct' | 'multi';
  onTypeSelect: (type: 'direct' | 'multi') => void;
  className?: string;
}

export const FlightTypeSelector: React.FC<FlightTypeSelectorProps> = ({
  types,
  selectedType,
  onTypeSelect,
  className = '',
}) => {
  return (
    <div className={className}>
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeSelect(type.id)}
          className={`w-full h-12 rounded-lg font-medium text-base transition-colors ${
            selectedType === type.id
              ? 'bg-[#F54538] text-white'
              : 'bg-white border border-gray-200 text-gray-700 hover:border-[#F54538] hover:text-[#F54538]'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};
