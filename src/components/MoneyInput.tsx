import React, { useState } from 'react';

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused: boolean;
  placeholder?: string;
  className?: string;
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
}) => {
  const [showWarning, setShowWarning] = useState(false);

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newValue = e.target.value;

    // Check if input contains any letters
    if (/[a-zA-Z]/.test(newValue)) {
      setShowWarning(true);
      return;
    }

    setShowWarning(false);
    onChange(newValue);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.stopPropagation();
    setShowWarning(false);
    onBlur?.();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative p-[2px]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.5 4.80423C17.4428 4.28906 16.2552 4 15 4C10.5817 4 7 7.58172 7 12C7 16.4183 10.5817 20 15 20C16.2552 20 17.4428 19.7109 18.5 19.1958"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M5 10H15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <path
              d="M5 14H15"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={(e) => e.stopPropagation()}
          aria-label={label}
          placeholder={placeholder}
          className={`
            w-full h-14 pl-12 pr-4
            text-[#4b616d] text-base font-normal font-['Heebo']
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused
                ? 'border-2 border-[#F54538]'
                : 'border border-[#e0e1e4]'
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
            absolute left-12 top-0
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#909090] font-['Heebo'] after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]
            ${
              isFocused || value
                ? '-translate-y-[50%] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
            ${isFocused ? 'text-[#464646]' : ''}
          `}
        >
          {isFocused || value ? 'Amount' : 'Enter amount'}
        </label>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <button onClick={(e) => {
              e.stopPropagation();
              const num = parseFloat(value) || 0;
              onChange((num + 1).toString());
            }} className="p-1 hover:bg-gray-100 rounded">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 5L5 1L9 5" stroke="#909090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button onClick={(e) => {
              e.stopPropagation();
              const num = parseFloat(value) || 0;
              if (num > 0) onChange((num - 1).toString());
            }} className="p-1 hover:bg-gray-100 rounded">
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1 1L5 5L9 1" stroke="#909090" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          {value && (
            <button onClick={handleClear} className="p-1">
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
        </div>
      </div>
      {showWarning && (
        <div className="absolute -bottom-6 left-0 text-sm text-[#F54538]">
          Please enter numbers only
        </div>
      )}
    </div>
  );
};
