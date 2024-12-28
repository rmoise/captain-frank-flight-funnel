import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
  className?: string;
  type?: string;
  required?: boolean;
  error?: string | null;
  autocomplete?: string;
  maxLength?: number;
}

export const Input: React.FC<InputProps> = ({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  isFocused = false,
  className = '',
  type = 'text',
  required = false,
  error = null,
  autocomplete,
  maxLength,
}) => {
  const [isTouched, setIsTouched] = useState(false);

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    setIsTouched(true);
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  const showError = error && isTouched;
  const showRequiredError = required && isTouched && !value;

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete={autocomplete}
          maxLength={maxLength}
          className={`
            w-full h-14 px-4 pt-5 pb-2
            text-[#4B616D] text-base font-medium font-heebo
            bg-white rounded-xl
            transition-all duration-[250ms] ease-in-out
            ${
              isFocused
                ? 'border-2 border-blue-500'
                : error
                ? 'border border-[#F54538]'
                : 'border border-[#e0e1e4] group-hover:border-blue-500'
            }
            focus:outline-none
            ${className}
          `}
          aria-invalid={showError || showRequiredError}
          aria-describedby={
            showError || showRequiredError ? `${label}-error` : undefined
          }
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F54538] transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
        <label
          className={`
            absolute left-4
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#9BA3AF] font-heebo ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isFocused || value
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
            ${isFocused ? 'text-[#464646]' : ''}
          `}
        >
          {label}
        </label>
      </div>
      {(showError || showRequiredError) && (
        <div className="h-6 relative z-10">
          <p
            className="mt-1 text-sm text-[#F54538]"
            id={`${label}-error`}
            role="alert"
          >
            {showError ? error : 'This field is required'}
          </p>
        </div>
      )}
    </div>
  );
};
