'use client';

import React from 'react';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: (value: string) => void;
  error?: string;
  required?: boolean;
  type?: string;
  disabled?: boolean;
}

export const TextInput: React.FC<TextInputProps> = ({
  label,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  type = 'text',
  disabled = false,
}) => {
  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onBlur(e.target.value)}
        disabled={disabled}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F54538] focus:ring-[#F54538] sm:text-sm disabled:opacity-50 disabled:bg-gray-100 ${
          error ? 'border-red-500' : ''
        }`}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
