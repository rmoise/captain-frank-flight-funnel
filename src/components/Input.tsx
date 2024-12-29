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
  placeholder?: string;
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
  placeholder = '',
  maxLength,
}) => {
  const [isFieldFocused, setIsFieldFocused] = useState(isFocused);
  const [isTouched, setIsTouched] = useState(false);

  const handleFocus = () => {
    setIsFieldFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFieldFocused(false);
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
          className={`w-full px-4 py-3 rounded-lg border ${
            showError ? 'border-red-500' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-[#F54538] focus:border-transparent ${className}`}
          autoComplete={autocomplete}
          placeholder={placeholder}
          maxLength={maxLength}
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
              isFieldFocused || value
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
            ${isFieldFocused ? 'text-[#464646]' : ''}
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
