import React, { useState, useRef, useEffect } from 'react';
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
  suggestionsVisible?: boolean;
  placeholder?: string;
  name?: string;
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
  suggestionsVisible = false,
  placeholder,
  name,
}) => {
  const [isFieldFocused, setIsFieldFocused] = useState(isFocused);
  const [isTouched, setIsTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    console.log(`[${label}] Focus - Current value:`, value);
    setIsFieldFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    console.log(
      `[${label}] Blur - Current value:`,
      value,
      'Required:',
      required
    );
    setIsFieldFocused(false);
    if (value.trim() || required) {
      console.log(
        `[${label}] Setting touched to true - Has value or is required`
      );
      setIsTouched(true);
    }
    onBlur?.();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log(`[${label}] Change - New value:`, newValue);
    onChange(newValue);
    if (!newValue.trim() && !required) {
      console.log(
        `[${label}] Resetting touched - Empty value and not required`
      );
      setIsTouched(false);
    }
    if (type === 'email' && newValue.trim()) {
      const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
      const isValid = emailRegex.test(newValue.trim());
      console.log(`[${label}] Email validation:`, { value: newValue, isValid });
      if (isValid) {
        setIsTouched(false);
      }
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    console.log(`[${label}] Clear clicked`);
    e.stopPropagation();
    e.preventDefault();
    onChange('');
    setIsTouched(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  useEffect(() => {
    if (
      !error ||
      (type === 'email' &&
        value.trim() &&
        /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value))
    ) {
      console.log(
        `[${label}] Error cleared or valid email - Resetting touched state`
      );
      setIsTouched(false);
    }
  }, [error, value, type, label]);

  const showError =
    error &&
    isTouched &&
    (!type ||
      type !== 'email' ||
      !value.trim() ||
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value));
  const showRequiredError = required && isTouched && !value.trim();

  console.log(`[${label}] Render state:`, {
    value,
    error,
    isTouched,
    isFieldFocused,
    showError,
    showRequiredError,
    required,
  });

  useEffect(() => {
    setIsFieldFocused(isFocused);
  }, [isFocused]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative p-[2px]">
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={`
            w-full px-4 py-3 pt-5 pb-2
            text-[#4B616D] text-base font-medium
            bg-white rounded-xl border
            transition-colors duration-[250ms] ease-in-out
            ${
              isFieldFocused
                ? 'border-2 border-blue-500'
                : showError || showRequiredError
                  ? 'border border-[#F54538]'
                  : 'border border-gray-300 hover:border-blue-500'
            }
            focus:outline-none
            selection:bg-blue-100
            [&:-webkit-autofill]:pt-5
            [&:-webkit-autofill]:pb-2
            [&:-webkit-autofill]:[transition:background-color_9999s_ease-in-out_0s]
            [&:-webkit-autofill+label]:opacity-0
          `}
          autoComplete={autocomplete}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-label={label}
          name={name}
          aria-invalid={showError || showRequiredError}
          aria-describedby={
            showError || showRequiredError ? `${label}-error` : undefined
          }
        />
        {value && (
          <button
            onClick={handleClear}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F54538] transition-colors z-20"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        )}
        <label
          className={`
            absolute left-4
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1)
            pointer-events-none select-none
            text-[#9BA3AF] font-heebo bg-white
            ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isFieldFocused || value || suggestionsVisible
                ? '-translate-y-[8px] text-[10px] px-1 z-10'
                : 'translate-y-[14px] text-base'
            }
            ${isFieldFocused ? 'text-[#464646]' : ''}
            [input:-webkit-autofill+&]:opacity-0
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
