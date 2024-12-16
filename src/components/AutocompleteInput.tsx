import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Option {
  value: string;
  label: string;
}

export interface AutocompleteInputProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
  className?: string;
  required?: boolean;
  error?: string | null;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value = '',
  options,
  onChange,
  onFocus,
  onBlur,
  isFocused = false,
  className = '',
  required = false,
  error = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on input value
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(
        (option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.value.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredOptions(filtered);
    }
  }, [inputValue, options]);

  // Update input value when value prop changes
  useEffect(() => {
    const selectedOption = options.find((opt) => opt.value === value);
    setInputValue(selectedOption ? selectedOption.value : value || '');
  }, [value, options]);

  // Update dropdown position
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

  // Handle click outside
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

  const handleContainerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
    setFilteredOptions(options);
    onFocus?.();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onBlur?.();
  };

  const handleOptionClick = (option: Option, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setInputValue(option.value);
    onChange(option.value);
    setIsOpen(false);
    onBlur?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

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
      if (filteredOptions[highlightedIndex]) {
        setInputValue(filteredOptions[highlightedIndex].label);
        onChange(filteredOptions[highlightedIndex].value);
        setIsOpen(false);
      }
    }
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
    if (!isOpen) {
      setFilteredOptions(options);
      onFocus?.();
    }
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <div
        id="autocomplete-dropdown"
        className="absolute bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-[9999]"
        style={{
          top: dropdownPosition.top + 8,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
        onClick={handleContainerClick}
      >
        {filteredOptions.map((option, index) => (
          <div
            key={`${option.value}-${index}`}
            className={`px-4 py-3 hover:bg-gray-100 cursor-pointer text-[#4b616d] font-['Heebo'] ${
              index === highlightedIndex ? 'bg-gray-100' : ''
            }`}
            onClick={(e) => handleOptionClick(option, e)}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{option.label}</span>
              {option.value !== option.label && (
                <span className="text-sm text-gray-500">({option.value})</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div
      className={`relative ${className}`}
      onClick={handleContainerClick}
      ref={containerRef}
    >
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`
            w-full h-14 pl-4 pr-10 pt-5 pb-2
            text-[#4b616d] text-base font-normal font-['Heebo']
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isFocused && !error
                ? 'border-2 border-blue-500'
                : error
                ? 'border border-[#F54538]'
                : 'border border-[#e0e1e4]'
            }
            focus:outline-none
          `}
          placeholder=""
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {inputValue && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setInputValue('');
                onChange('');
              }}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
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
          <button
            onClick={handleArrowClick}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>
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
              isFocused || inputValue || isOpen
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
          `}
        >
          {label}
        </label>
      </div>
      {renderDropdown()}
    </div>
  );
};
