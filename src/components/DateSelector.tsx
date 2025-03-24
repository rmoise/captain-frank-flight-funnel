'use client';

import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import useStore from '@/lib/state/store';
import { format } from 'date-fns';
import { CustomDateInput } from '@/components/shared/CustomDateInput';

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
      setSelectedDate(date);
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Departure Date
      </label>
      <div className="relative date-picker-input w-full">
        <DatePicker
          selected={selectedDate}
          onChange={handleDateChange}
          customInput={
            <CustomDateInput
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
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
          placeholderText="DD.MM.YY / DD.MM.YYYY"
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
