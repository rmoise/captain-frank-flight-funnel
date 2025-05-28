'use client';

import React from 'react';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, label }) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F54538] focus:ring-[#F54538] sm:text-sm"
      />
    </div>
  );
};