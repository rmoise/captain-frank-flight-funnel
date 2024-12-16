import React, { useRef, useState } from 'react';
import { MoneyInputControls } from './MoneyInputControls';

interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  value,
  onChange,
  label = '',
  error = null,
  required = false,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label
          className={`block text-sm font-medium text-gray-700 mb-2 ${
            required ? 'after:content-["*"] after:ml-1 after:text-red-500' : ''
          }`}
        >
          {label}
        </label>
      )}
      <div
        className={`relative flex items-center border rounded-lg transition-all ${
          isFocused
            ? 'border-blue-500'
            : error
            ? 'border-red-500'
            : 'border-gray-300'
        }`}
      >
        <span className="absolute left-4 text-gray-500">€</span>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="w-full py-3 pl-8 pr-20 bg-transparent focus:outline-none"
          required={required}
        />
        <MoneyInputControls
          value={value}
          onChange={onChange}
          containerRef={wrapperRef}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
