'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import type { LocationData } from '@/types/store';
import { debounce } from 'lodash';
import { PiAirplaneTakeoff, PiAirplaneLanding } from 'react-icons/pi';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

const LoadingSpinner = () => (
  <div className="relative w-6 h-6">
    <div
      className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#F54538] border-r-[#F54538]/30"
      style={{ animationDuration: '0.8s' }}
    />
  </div>
);

export interface Location extends LocationData {}

export interface AutocompleteInputProps {
  label: string;
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  onSearch: (term: string) => Promise<LocationData[]>;
  onFocus?: () => Promise<LocationData[]>;
  onBlur?: () => void;
  leftIcon?: 'departure' | 'arrival';
  error?: string;
  disabled?: boolean;
  showError?: boolean;
  required?: boolean;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSearch,
  onFocus,
  onBlur,
  leftIcon,
  error,
  disabled = false,
  showError = true,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value?.label || '');
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const prevValueRef = useRef<string | undefined>(value?.label);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Sync input value with external value
  useEffect(() => {
    if (!isTyping && value?.label !== prevValueRef.current) {
      setInputValue(value?.label || '');
      setIsTyping(false);
      prevValueRef.current = value?.label;
    }
  }, [value?.label, isTyping]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        // Only skip search for empty strings, allow single character searches
        if (!term.trim()) {
          setOptions([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          const results = await onSearch(term);
          setOptions(results);
          setLoading(false);
        } catch (error) {
          console.error('Error searching locations:', error);
          setOptions([]);
          setLoading(false);
        }
      }, 100), // Reduce debounce time for better responsiveness
    [onSearch]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInputValue(newValue);
      setIsTyping(true);
      setIsTouched(true);

      // Always open dropdown when typing
      setIsOpen(true);

      if (!newValue) {
        onChange(null);
        setOptions([]);
        setIsTyping(false);
        return;
      }

      // Trigger search immediately
      debouncedSearch(newValue);
    },
    [debouncedSearch, onChange]
  );

  const handleOptionSelect = useCallback(
    (option: LocationData) => {
      onChange(option);
      setInputValue(option.label || '');
      setIsOpen(false);
      setIsTyping(false);
      setHighlightedIndex(null);
      setIsFocused(true);
      setIsTouched(true);

      // Keep focus in the current field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [onChange]
  );

  const handleInputFocus = useCallback(async () => {
    setIsFocused(true);
    setIsOpen(true);

    // Update dropdown position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }

    // Load initial options if onFocus is provided
    if (onFocus) {
      setLoading(true);
      try {
        const results = await onFocus();
        setOptions(results);
      } catch (error) {
        console.error('Error loading initial options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }
    // If there's a value but no options, perform a search
    else if (inputValue && !options.length) {
      debouncedSearch(inputValue);
    }
  }, [debouncedSearch, inputValue, options.length, onFocus]);

  const handleInputBlur = useCallback(() => {
    // Delay closing to allow click events on options
    setTimeout(() => {
      const dropdownElement = document.getElementById('autocomplete-dropdown');
      const activeElement = document.activeElement;
      const isClickingDropdown = dropdownElement?.contains(activeElement);

      if (!isClickingDropdown) {
        setIsFocused(false);
        setIsTyping(false);
        setIsOpen(false);
        setIsTouched(true);

        // Reset input value to selected value if user was typing
        if (isTyping && value?.label) {
          setInputValue(value.label);
        }

        onBlur?.();
      }
    }, 150);
  }, [onBlur, isTyping, value]);

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setInputValue('');
      setOptions([]);
      setIsOpen(false);
      setHighlightedIndex(null);
      setIsTyping(false);
      setIsTouched(true);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [onChange]
  );

  // Update dropdown position
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      if (containerRef.current) {
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
      const isClickingDropdown = dropdownElement?.contains(target);
      const isClickingInput = containerRef.current?.contains(target);

      if (!isClickingDropdown && !isClickingInput) {
        setIsOpen(false);
        setIsFocused(false);
        setIsTyping(false);
        setIsTouched(true);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownContent = (
      <div
        id="autocomplete-dropdown"
        className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-auto"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : options.length > 0 ? (
          <ul className="py-2">
            {options.map((option, index) => (
              <li
                key={option.value || index}
                onClick={() =>
                  option.value ? handleOptionSelect(option) : null
                }
                className={`px-4 py-2 ${
                  option.value
                    ? 'cursor-pointer hover:bg-gray-100'
                    : 'text-gray-500 cursor-default'
                } ${highlightedIndex === index ? 'bg-gray-100' : ''}`}
              >
                <div
                  className={`${option.value ? 'font-medium text-[#4B616D]' : 'text-gray-500'}`}
                >
                  {option.dropdownLabel ||
                    `${option.label} - ${option.description}`}
                </div>
                {option.description && option.value && (
                  <div className="text-sm text-[#4B616D]/70">
                    {option.description}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-2 text-[#4B616D]">
            Keine Ergebnisse gefunden
          </div>
        )}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  const inputClassName = `
    w-full h-14 pl-12 pr-12 pt-5 pb-2
    text-[#4B616D] ${
      value && !isFocused && !isTyping
        ? 'text-xl lg:text-[28px] font-medium'
        : 'text-base font-medium'
    } tracking-tight
    bg-white rounded-xl
    transition-all duration-[250ms] ease-in-out
    ${
      isFocused
        ? 'border-2 border-blue-500'
        : error && isTouched
          ? 'border border-[#F54538]'
          : 'border border-[#e0e1e4] group-hover:border-blue-500'
    }
    focus:outline-none
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${required ? 'required' : ''}
  `;

  const labelClassName = `
    absolute left-12
    transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
    text-[#9BA3AF] after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]
    ${
      isFocused || inputValue
        ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
        : 'translate-y-[14px] text-base'
    }
    ${isFocused ? 'text-[#9BA3AF]' : ''}
  `;

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative p-[2px] group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {leftIcon === 'departure' ? (
            <PiAirplaneTakeoff size={20} />
          ) : leftIcon === 'arrival' ? (
            <PiAirplaneLanding size={20} />
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onClick={handleInputFocus}
          onBlur={handleInputBlur}
          className={inputClassName}
          placeholder=""
          disabled={disabled}
          aria-invalid={
            ((error && isTouched) || false).toString() as 'true' | 'false'
          }
          aria-describedby={error && isTouched ? `${label}-error` : undefined}
        />
        <label className={labelClassName}>{label.replace(' *', '')}</label>
        <div
          className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2"
          onClick={handleInputFocus}
        >
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {inputValue && !disabled && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClear(e);
                  }}
                  className="p-1"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-[#F54538] transition-colors" />
                </button>
              )}
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </>
          )}
        </div>
      </div>
      {renderDropdown()}
      {showError && error && isTouched && (
        <p
          className="mt-2 text-sm text-red-600"
          id={`${label}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
