import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface AutocompleteInputProps {
  label: string;
  focusedLabel?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  focusedLabel,
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  isFocused = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const containerClasses = `
    relative w-full lg:w-[267px] h-14
  `;

  const inputClasses = `
    w-full h-14 px-4 pt-5 pb-2
    text-[#4b616d] text-xl lg:text-[28px] font-medium font-['Heebo'] tracking-tight
    bg-white rounded-xl
    border border-[#e0e1e4]
    transition-all duration-200
    ${isFocused ? 'border-[#464646] border-2' : ''}
    focus:outline-none
  `;

  const labelClasses = `
    absolute left-4
    transition-all duration-200 pointer-events-none
    text-[#909090] font-['Heebo']
    ${isFocused || value ? 'top-2 text-[10px]' : 'top-4 text-base'}
    ${isFocused ? 'text-[#464646]' : ''}
  `;

  useEffect(() => {
    const filtered = options.filter((option) =>
      option.label.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [value, options]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const handleOptionClick = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className={containerClasses} ref={containerRef}>
      <label className={labelClasses}>
        {isFocused || value ? focusedLabel || label : label}
      </label>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={(e) => {
          setIsOpen(true);
          onFocus?.();
        }}
        onBlur={onBlur}
        className={inputClasses}
        placeholder=""
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {value && (
          <button
            onClick={handleClear}
            className="p-1 pointer-events-auto"
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
        <div className="pointer-events-none">
          <svg
            width="12"
            height="8"
            viewBox="0 0 12 8"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`transform transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          >
            <path
              d="M1 1.5L6 6.5L11 1.5"
              stroke="#909090"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50">
          {filteredOptions.map((option) => (
            <div
              key={option.value}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-[#4b616d] font-['Heebo']"
              onClick={() => handleOptionClick(option)}
            >
              <span className="text-sm text-gray-500">{option.value}</span>
              <span className="ml-2">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
