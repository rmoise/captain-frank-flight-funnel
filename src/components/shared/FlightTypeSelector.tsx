import React from 'react';

interface FlightType {
  id: 'direct' | 'multi';
  label: string;
}

interface FlightTypeSelectorProps {
  types: readonly FlightType[];
  selectedType: 'direct' | 'multi';
  onTypeSelect: (typeId: 'direct' | 'multi') => void;
  className?: string;
}

export const FlightTypeSelector: React.FC<FlightTypeSelectorProps> = ({
  types,
  selectedType,
  onTypeSelect,
  className = '',
}) => {
  return (
    <div className={`flex space-x-4 ${className}`}>
      {types.map((type) => (
        <button
          key={type.id}
          onClick={() => onTypeSelect(type.id)}
          className={`flex-1 py-3 px-4 rounded-lg border-2 transition-colors
            ${
              selectedType === type.id
                ? 'border-[#F54538] bg-red-50 text-[#F54538]'
                : 'border-gray-200 hover:border-gray-300 text-gray-600'
            }`}
        >
          {type.label}
        </button>
      ))}
    </div>
  );
};