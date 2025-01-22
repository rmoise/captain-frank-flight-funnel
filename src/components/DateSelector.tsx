'use client';

import React from 'react';
import { useStore } from '@/lib/state/store';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import { CustomDateInput } from '@/components/shared/CustomDateInput';
import 'react-datepicker/dist/react-datepicker.css';

interface DateSelectorProps {
  onSelect?: () => void;
  disabled?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  onSelect = () => {},
  disabled = false,
}) => {
  const { selectedDate, setSelectedDate } = useStore();

  const handleDateChange = (date: Date | null) => {
    try {
      setSelectedDate(date ? format(date, 'yyyy-MM-dd') : null);
      if (date) {
        onSelect();
      }
    } catch (error) {
      console.error('Error setting date:', error);
    }
  };

  const handleClear = () => {
    setSelectedDate(null);
  };

  const parseDate = (dateString: string | null): Date | null => {
    if (!dateString) return null;
    try {
      return new Date(dateString);
    } catch (error) {
      console.error('Error parsing date:', error);
      return null;
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Departure Date
      </label>
      <div className="relative date-picker-input w-full">
        <DatePicker
          selected={parseDate(selectedDate)}
          onChange={handleDateChange}
          customInput={
            <CustomDateInput
              value={selectedDate || ''}
              onClear={handleClear}
              label="Select Date"
            />
          }
          disabled={disabled}
          minDate={new Date()}
          dateFormat="dd.MM.yyyy"
          showMonthDropdown
          showYearDropdown
          dropdownMode="select"
          isClearable={false}
          placeholderText="DD.MM.YYYY"
          shouldCloseOnSelect={true}
          popperProps={{
            strategy: 'fixed',
            placement: 'top-start',
          }}
          className="react-datepicker-popper"
          calendarClassName="custom-calendar"
        />
      </div>
    </div>
  );
};
