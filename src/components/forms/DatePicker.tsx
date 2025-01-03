import React from 'react';
import ReactDatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import clsx from 'clsx';

// Custom CSS to fix dropdown width issues
const customDatePickerStyles = `
  .react-datepicker__month-dropdown {
    width: 12rem !important;
  }
  .react-datepicker__year-dropdown {
    width: 8rem !important;
  }
  .react-datepicker__month-dropdown-container,
  .react-datepicker__year-dropdown-container {
    font-size: 0.875rem;
  }
`;

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  label?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  selected,
  onChange,
  label,
  error,
  required,
  className,
}) => {
  return (
    <div className="space-y-2">
      <style>{customDatePickerStyles}</style>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <ReactDatePicker
        selected={selected}
        onChange={onChange}
        className={clsx(
          'block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          className,
          {
            'border-red-500': error,
          }
        )}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
