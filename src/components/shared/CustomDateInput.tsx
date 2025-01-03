'use client';

import React, { forwardRef, useState, useEffect } from 'react';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface CustomDateInputProps {
  value?: string;
  onClick?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onClear?: () => void;
  label?: string;
}

export const CustomDateInput = forwardRef<
  HTMLInputElement,
  CustomDateInputProps
>(
  (
    {
      value,
      onClick,
      onChange,
      placeholder = 'DD.MM.YYYY',
      onClear,
      label = 'Flight Date',
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState('');

    // inputValue is managed internally and only needs to be updated when the external value changes
    useEffect(() => {
      console.log('CustomDateInput useEffect:', {
        receivedValue: value,
        currentInputValue: inputValue,
      });

      // Format the date if it's in yyyy-MM-dd format
      if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = value.split('-');
        const newValue = `${day}.${month}.${year}`;
        console.log('Formatting date:', { value, newValue });
        setInputValue(newValue);
      } else if (value !== inputValue) {
        console.log('Using value as is:', value);
        setInputValue(value || '');
      }
    }, [value, inputValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log('handleChange:', {
        currentValue: e.target.value,
        currentInputValue: inputValue,
      });

      let newValue = e.target.value.replace(/[^\d.]/g, '');

      // Auto-add dots after day and month
      if (newValue.length === 2 && !inputValue.includes('.')) {
        newValue += '.';
      } else if (newValue.length === 5 && inputValue.length === 4) {
        newValue += '.';
      }

      // Limit to 10 characters (DD.MM.YYYY)
      if (newValue.length <= 10) {
        console.log('Setting new value:', newValue);
        setInputValue(newValue);
        const syntheticEvent = {
          ...e,
          target: { ...e.target, value: newValue },
        };
        onChange?.(syntheticEvent);
      }
    };

    const handleClear = () => {
      console.log('handleClear called');
      setInputValue('');
      // Only call onClear if it's provided
      if (onClear) {
        onClear();
      } else {
        // If no onClear provided, simulate a change event with empty value
        const syntheticEvent = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
    };

    const handleInputClick = (e: React.MouseEvent) => {
      console.log('handleInputClick:', { hasOnClick: !!onClick });
      e.preventDefault();
      onClick?.();
    };

    console.log('CustomDateInput render:', {
      inputValue,
      value,
      hasOnClick: !!onClick,
      hasOnChange: !!onChange,
      hasOnClear: !!onClear,
    });

    return (
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onClick={handleInputClick}
          ref={ref}
          className="peer w-full h-14 px-3 pl-10 pr-10 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F54538] focus:border-transparent bg-white text-[#4B616D]"
          placeholder={placeholder}
          readOnly
        />
        <button
          type="button"
          onClick={handleInputClick}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F54538] transition-colors cursor-pointer"
        >
          <CalendarIcon className="w-5 h-5" />
        </button>
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F54538] transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
        <label className="absolute text-sm text-gray-500 duration-300 transform bg-white px-2 -translate-y-4 scale-75 top-2 left-8 z-10">
          {label}
        </label>
      </div>
    );
  }
);

CustomDateInput.displayName = 'CustomDateInput';
