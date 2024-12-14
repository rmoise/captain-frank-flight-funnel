import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PiAirplaneTakeoff, PiAirplaneLanding } from 'react-icons/pi';

interface Option {
  value: string;
  label: string;
}

export interface AutocompleteInputProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  isFocused: boolean;
  className?: string;
  iconType?: 'from' | 'to';
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  isFocused,
  className = '',
  iconType = 'from',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const filtered = options.filter(
      (option) =>
        option.label.toLowerCase().includes(value.toLowerCase()) ||
        option.value.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [value, options]);

  useEffect(() => {
    const updatePosition = () => {
      if (containerRef.current && isOpen) {
        const rect = containerRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownElement = document.getElementById('autocomplete-dropdown');

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownElement &&
        !dropdownElement.contains(target)
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

  const handleClear = () => {
    onChange('');
  };

  const handleOptionClick = (option: Option) => {
    onChange(option.value);
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1)
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && highlightedIndex !== -1) {
      event.preventDefault();
      handleOptionClick(filteredOptions[highlightedIndex]);
    }
  };

  const renderDropdown = () => {
    if (!isOpen || !filteredOptions.length) return null;

    const dropdown = (
      <div
        id="autocomplete-dropdown"
        className="absolute bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-[9999]"
        style={{
          top: dropdownPosition.top + 8,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {filteredOptions.map((option, index) => (
          <div
            key={`${option.value}-${index}`}
            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-[#4b616d] font-['Heebo'] ${
              index === highlightedIndex ? 'bg-gray-100' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleOptionClick(option);
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-base font-medium">{option.label}</span>
              <span className="text-sm text-gray-500">
                ({option.value.replace(/^(from-|to-)/, '')})
              </span>
            </div>
          </div>
        ))}
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  // Find the matching option to display the label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.value : value;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative p-[2px]">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {iconType === 'from' ? (
            <PiAirplaneTakeoff size={20} />
          ) : (
            <PiAirplaneLanding size={20} />
          )}
        </div>
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            onFocus();
          }}
          onBlur={onBlur}
          onKeyDown={handleKeyDown}
          className={`
            w-full h-14 pl-12 pr-4 pt-5 pb-2
            text-[#4b616d] text-xl lg:text-[28px] font-medium font-['Heebo'] tracking-tight
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused
                ? 'border-2 border-[#F54538]'
                : 'border border-[#e0e1e4]'
            }
            focus:outline-none
          `}
          placeholder=""
        />
        <label
          className={`
            absolute left-12
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#909090] font-['Heebo'] after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]
            ${
              isFocused || displayValue
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
            ${isFocused ? 'text-[#464646]' : ''}
          `}
        >
          {label.replace(' *', '')}
        </label>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {displayValue && (
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
      {renderDropdown()}
    </div>
  );
};
