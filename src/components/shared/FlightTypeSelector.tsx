'use client';

import React from 'react';

interface FlightTypeSelectorProps {
  types: readonly {
    id: 'direct' | 'multi';
    label: string;
  }[];
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
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeSelect(type.id)}
          className={`w-full h-12 px-4 rounded-lg border-2 transition-colors ${
            selectedType === type.id
              ? 'border-[#F54538] bg-red-50 text-[#F54538]'
              : 'border-gray-200 text-gray-700 hover:border-[#F54538]'
          }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};

export default FlightTypeSelector;
