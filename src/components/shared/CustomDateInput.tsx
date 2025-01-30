'use client';

import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { CalendarIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, isValid, parseISO } from 'date-fns';

export interface CustomDateInputProps {
  value?: string | Date;
  onClick?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onClear?: () => void;
  label: string;
  disabled?: boolean;
}

// Helper function to safely parse and format dates
const safeParseDateString = (value: string | Date | undefined): string => {
  if (!value) return '';

  try {
    // If it's already in DD.MM.YYYY format, return as is
    if (typeof value === 'string' && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return value;
    }

    // If it's a Date object
    if (value instanceof Date) {
      if (!isValid(value)) return '';
      return format(value, 'dd.MM.yyyy');
    }

    // If it's a string in YYYY-MM-DD format
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsedDate = parseISO(value);
      if (!isValid(parsedDate)) return '';
      return format(parsedDate, 'dd.MM.yyyy');
    }

    return '';
  } catch (error) {
    console.error('Error parsing date:', error);
    return '';
  }
};

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
      label = 'Departure Date',
      disabled,
    },
    ref
  ) => {
    const [inputValue, setInputValue] = useState('');
    const [isValidDate, setIsValidDate] = useState(true);
    const lastManualInput = useRef<string>('');
    const isCalendarSelection = useRef(false);
    const previousLength = useRef(0);
    const isInitialMount = useRef(true);
    const isManualInput = useRef(false);

    useEffect(() => {
      console.log('CustomDateInput value changed:', {
        value,
        type: value instanceof Date ? 'Date' : typeof value,
        isCalendarSelection: isCalendarSelection.current,
        isInitialMount: isInitialMount.current,
        isManualInput: isManualInput.current,
      });

      if (isManualInput.current) {
        return;
      }

      const formattedValue = safeParseDateString(value);
      setInputValue(formattedValue);
      lastManualInput.current = formattedValue;

      isCalendarSelection.current = false;
      isInitialMount.current = false;
    }, [value]);

    const validateDateFormat = (date: string): boolean => {
      if (date === '') return true;

      // Check for complete date format DD.MM.YYYY
      const formatRegex = /^\d{2}\.\d{2}\.\d{4}$/;
      if (!formatRegex.test(date)) {
        return false;
      }

      // Check if it's a valid date
      const [day, month, year] = date.split('.').map(Number);
      const dateObj = new Date(year, month - 1, day);
      return (
        dateObj.getDate() === day &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getFullYear() === year
      );
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      isManualInput.current = true;
      const newValue = e.target.value;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- might be used in future cursor position handling
      const cursorPosition = e.target.selectionStart || 0;

      // Only allow digits
      const digits = newValue.replace(/[^\d]/g, '');
      let formattedValue = digits;

      // Format as DD.MM.YYYY
      if (digits.length > 0) {
        // Add first dot after DD
        if (digits.length >= 2) {
          formattedValue = digits.slice(0, 2) + '.';
          // Add month digits
          if (digits.length > 2) {
            formattedValue += digits.slice(2, 4);
            // Add second dot after MM
            if (digits.length >= 4) {
              formattedValue += '.';
              // Add year digits
              if (digits.length > 4) {
                formattedValue += digits.slice(4);
              }
            }
          }
        }
      }

      // Limit to 10 characters (DD.MM.YYYY)
      if (formattedValue.length <= 10) {
        console.log('Manual input:', formattedValue);
        setInputValue(formattedValue);
        lastManualInput.current = formattedValue;

        // Check if it's a complete date and validate
        const isComplete = formattedValue.length === 10;
        const isValid = isComplete && validateDateFormat(formattedValue);
        setIsValidDate(isValid);

        // Only trigger onChange for complete valid dates or empty input
        if (formattedValue === '' || (isComplete && isValid)) {
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: formattedValue },
          };
          onChange?.(syntheticEvent);
        } else {
          // For incomplete or invalid dates, trigger onChange with empty value
          const syntheticEvent = {
            ...e,
            target: { ...e.target, value: '' },
          };
          onChange?.(syntheticEvent);
        }

        // Set cursor position
        if (e.target instanceof HTMLInputElement) {
          requestAnimationFrame(() => {
            // Calculate how many dots are before the cursor
            const digitsBeforeCursor = newValue.replace(/[^\d]/g, '').length;
            let newPosition = digitsBeforeCursor;
            if (digitsBeforeCursor > 4) newPosition += 2;
            else if (digitsBeforeCursor > 2) newPosition += 1;
            e.target.setSelectionRange(newPosition, newPosition);
          });
        }
      }
    };

    const handleCalendarClick = () => {
      console.log('Calendar clicked, setting isCalendarSelection');
      isCalendarSelection.current = true;
      isManualInput.current = false;
      onClick?.();
    };

    const handleClear = () => {
      console.log('Clearing input');
      isManualInput.current = true;
      setInputValue('');
      setIsValidDate(true);
      lastManualInput.current = '';
      previousLength.current = 0;
      if (onClear) {
        onClear();
      } else {
        const syntheticEvent = {
          target: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
    };

    return (
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          ref={ref}
          className={`peer w-full h-14 px-3 pl-10 pr-10 border ${
            !isValidDate ? 'border-red-500' : 'border-gray-300'
          } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F54538] focus:border-transparent bg-white text-[#4B616D]`}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-form-type="other"
          disabled={disabled}
        />
        <button
          type="button"
          onClick={handleCalendarClick}
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
