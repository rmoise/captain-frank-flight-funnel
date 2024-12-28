import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import clsx from 'clsx';

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  error,
  required,
}) => {
  const handleChange = (date: Date | null) => {
    if (date) {
      onChange(date.toISOString().split('T')[0]);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <ReactDatePicker
        selected={value ? new Date(value) : null}
        onChange={handleChange}
        dateFormat="dd.MM.yyyy"
        maxDate={new Date()}
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable={false}
        placeholderText="DD.MM.YYYY"
        shouldCloseOnSelect={true}
        className={clsx(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-[#F54538] focus:ring-[#F54538] sm:text-sm',
          error && 'border-red-500'
        )}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
