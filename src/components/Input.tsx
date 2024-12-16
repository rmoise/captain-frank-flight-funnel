import React from 'react';

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
  alwaysOpen?: boolean;
  error?: string | null;
  autocomplete?: string;
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
  alwaysOpen = false,
  error = null,
  autocomplete,
}) => {
  const handleContainerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(e.target.value);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onBlur?.();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
  };

  return (
    <div className={`relative ${className}`} onClick={handleContainerClick}>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoComplete={autocomplete}
          className={`
            w-full h-14 px-4 pt-5 pb-2
            text-[#4b616d] text-base font-normal font-['Heebo']
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused
                ? 'border-2 border-blue-500'
                : alwaysOpen
                ? 'border border-[#e0e1e4] hover:border-blue-500'
                : 'border border-[#e0e1e4]'
            }
            ${value ? 'pr-10' : ''}
            ${error ? 'border-[#F54538]' : ''}
            focus:outline-none
          `}
          placeholder=""
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2 2L10 10M2 10L10 2"
                stroke="#909090"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <label
          className={`
            absolute left-4
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#909090] font-['Heebo'] font-normal ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isFocused || value || alwaysOpen
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
          `}
        >
          {label}
        </label>
      </div>
    </div>
  );
};
