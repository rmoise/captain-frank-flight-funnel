import React, { useState, useRef, useEffect } from 'react';
import { MoneyInputControls } from './MoneyInputControls';

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  isFocused,
  placeholder = '',
  className = '',
  required = false,
}) => {
  const [showWarning, setShowWarning] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== MoneyInput handleChange ===', {
      newValue: e.target.value,
      currentValue: value,
    });

    const newValue = e.target.value;

    // Allow empty input
    if (!newValue) {
      setShowWarning(false);
      setLocalValue('');
      onChange('');
      return;
    }

    // Only allow valid numeric input with at most one decimal point
    const numericValue = newValue.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');

    // Validate format
    if (parts.length > 2 || !/^\d*\.?\d*$/.test(numericValue)) {
      setShowWarning(true);
      return;
    }

    setShowWarning(false);
    setLocalValue(numericValue);
    onChange(numericValue);
  };

  const handleInputFocus = () => {
    onFocus?.();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only blur if clicking outside the wrapper
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      setShowWarning(false);

      // Format the value with decimals on blur
      if (localValue) {
        const numericValue = parseFloat(
          localValue.replace(/[^0-9.-]+/g, '') || '0'
        );
        if (!isNaN(numericValue)) {
          const formattedValue = numericValue.toFixed(2);
          setLocalValue(formattedValue);
          onChange(formattedValue);
        }
      }

      onBlur?.();
    }
  };

  // Format the display value - strip € from input value and use local value for display
  const displayValue = localValue || '';

  return (
    <div
      className={`relative money-input-container ${className}`}
      ref={wrapperRef}
    >
      <div className="relative p-[2px] group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <span className="text-base">€</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          aria-label={label}
          placeholder=""
          className={`
            peer w-full h-14 pl-10 pr-10
            text-[#4b616d] text-base font-normal font-heebo
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused
                ? 'border-2 border-blue-500'
                : 'border border-[#e0e1e4] hover:border-blue-500'
            }
            focus:outline-none
          `}
        />
        <label
          className={`
            absolute left-10 top-1/2 -translate-y-1/2
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#909090] font-heebo ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isFocused || localValue
                ? '-translate-y-8 text-[10px] px-1 bg-white'
                : 'text-base'
            }
            ${isFocused ? 'text-[#464646]' : ''}
          `}
        >
          {placeholder || label}
        </label>
      </div>
      {showWarning && (
        <div className="absolute -bottom-6 left-0 text-sm text-[#F54538]">
          Please enter numbers only
        </div>
      )}
      <MoneyInputControls
        value={localValue}
        onChange={(newValue) => {
          if (newValue === '+' || newValue === '-') {
            const currentValue = parseFloat(localValue || '0');
            const updatedValue =
              newValue === '+'
                ? currentValue + 1
                : Math.max(0, currentValue - 1);
            const formattedValue = updatedValue.toFixed(2);
            setLocalValue(formattedValue);
            onChange(formattedValue);
          } else if (newValue === '') {
            // Handle clear action
            setLocalValue('');
            setShowWarning(false);
            onChange('');
          } else {
            setLocalValue(newValue);
            onChange(newValue);
          }
        }}
        containerRef={wrapperRef}
      />
    </div>
  );
};
