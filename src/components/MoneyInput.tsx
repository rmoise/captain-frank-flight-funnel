import React, { useState, useRef } from 'react';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log('=== MoneyInput handleChange ===', {
      newValue: e.target.value,
      currentValue: value,
    });

    const newValue = e.target.value;
    // Only allow numbers and at most one decimal point
    if (/[^0-9.]/.test(newValue) || (newValue.match(/\./g) || []).length > 1) {
      setShowWarning(true);
      return;
    }
    setShowWarning(false);

    // If the value is empty, pass it through
    if (!newValue) {
      onChange('');
      return;
    }

    // Handle increment/decrement
    if (newValue === '+' || newValue === '-') {
      const currentValue = parseFloat(value.replace(/[^0-9.-]+/g, '') || '0');
      const newNumericValue =
        newValue === '+' ? currentValue + 1 : Math.max(0, currentValue - 1);
      onChange(`€${newNumericValue.toFixed(2)}`);
      return;
    }

    // Pass through the numeric value without immediate formatting
    const numericValue = newValue.replace(/[^0-9.]/g, '');
    onChange(`€${numericValue}`);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus?.();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only blur if clicking outside the wrapper
    if (!wrapperRef.current?.contains(e.relatedTarget as Node)) {
      e.preventDefault();
      e.stopPropagation();
      setShowWarning(false);

      // Format the value with decimals on blur
      if (value) {
        const numericValue = parseFloat(value.replace(/[^0-9.-]+/g, '') || '0');
        if (!isNaN(numericValue)) {
          const formattedValue = `€${numericValue.toFixed(2)}`;
          onChange(formattedValue);
        }
      }

      onBlur?.();
    }
  };

  // Format the display value - strip € from input value since we show it separately
  const displayValue = value.startsWith('€') ? value.slice(1) : value;

  return (
    <div
      className={`relative money-input-container ${className}`}
      ref={wrapperRef}
    >
      <div className="relative p-[2px]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <span className="text-base">€</span>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          aria-label={label}
          placeholder={placeholder}
          className={`
            w-full h-14 pl-8 pr-4
            text-[#4b616d] text-base font-normal font-['Heebo']
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused ? 'border-2 border-blue-500' : 'border border-[#e0e1e4]'
            }
            ${value ? 'pr-10' : ''}
            focus:outline-none
            flex items-center
            leading-none
          `}
          style={{ paddingTop: '0', paddingBottom: '0' }}
        />
        <label
          className={`
            absolute left-8 top-0
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#909090] font-['Heebo'] ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isFocused || value
                ? '-translate-y-[50%] text-[10px] px-1 bg-white opacity-100'
                : 'translate-y-[14px] text-base opacity-0'
            }
            ${isFocused ? 'text-[#464646]' : ''}
          `}
        >
          {label}
        </label>
      </div>
      {showWarning && (
        <div className="absolute -bottom-6 left-0 text-sm text-[#F54538]">
          Please enter numbers only
        </div>
      )}
      <MoneyInputControls
        value={value}
        onChange={onChange}
        containerRef={wrapperRef}
      />
    </div>
  );
};
