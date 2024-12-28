'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import { PiAirplaneTakeoff, PiAirplaneLanding } from 'react-icons/pi';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

// Export all interfaces and types
export interface Location {
  value: string;
  label: string;
  description?: string;
  city?: string;
}

export interface AutocompleteInputProps {
  label: string;
  value?: Location | null;
  onChange: (location: Location | null) => void;
  onSearch: (term: string) => Promise<Location[]>;
  onFocus?: () => Promise<Location[]>;
  placeholder?: string;
  leftIcon?: string;
  rightIcon?: string;
  error?: string;
  allowClear?: boolean;
}

const LoadingSpinner = () => (
  <div className="relative w-6 h-6">
    <div
      className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#F54538] border-r-[#F54538]/30"
      style={{ animationDuration: '0.8s' }}
    />
  </div>
);

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSearch,
  onFocus,
  leftIcon,
  rightIcon,
  error,
  allowClear = true,
}) => {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && value && typeof value === 'object' && 'value' in value) {
      setInputValue(value.value);
    }
  }, [value, mounted]);

  const getDisplayValue = useCallback((location?: Location | null) => {
    if (!location || typeof location !== 'object') return '';
    return location.value;
  }, []);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (searchTerm: string) => {
        if (!searchTerm) return;

        setLoading(true);
        try {
          const results = await onSearch(searchTerm);
          setOptions(results);
        } catch (err) {
          console.error('Search failed:', err);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    [onSearch]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setIsTyping(true);
      setInputValue(newValue);
      setIsOpen(true);

      if (!newValue) {
        onChange(null);
        setOptions([]);
        return;
      }

      debouncedSearch(newValue);
    },
    [onChange, debouncedSearch]
  );

  const handleOptionSelect = useCallback(
    (option: Location, event?: React.MouseEvent) => {
      if (!option || typeof option !== 'object' || !('value' in option)) return;

      // Prevent event propagation
      event?.stopPropagation();
      event?.preventDefault();

      setIsTyping(false);
      setInputValue(getDisplayValue(option));
      onChange(option);

      // Close dropdown but maintain focus
      setIsOpen(false);

      // Keep focus in the current field
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [onChange, getDisplayValue]
  );

  const handleInputFocus = useCallback(async () => {
    setIsFocused(true);
    setIsOpen(true);

    // Always load options on focus if onFocus is provided
    setLoading(true);
    try {
      const results = onFocus ? await onFocus() : await onSearch('');
      setOptions(results);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to load options:', error);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, [onFocus, onSearch]);

  const handleInputBlur = useCallback(() => {
    // Only blur if we're not selecting an option
    setTimeout(() => {
      const dropdownElement = document.getElementById('autocomplete-dropdown');
      const activeElement = document.activeElement;
      const isClickingDropdown = dropdownElement?.contains(
        activeElement as Node
      );

      if (!isClickingDropdown) {
        setIsFocused(false);
        setIsTyping(false);
        setIsOpen(false);
      }
    }, 200);
  }, []);

  const handleClear = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      setIsTyping(false);
      setInputValue('');
      setOptions([]);
      onChange(null);

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
        {loading ? (
          <div className="px-4 py-3 text-gray-500">Loading...</div>
        ) : options.length === 0 ? (
          <div className="px-4 py-3 text-gray-500">
            Type to search airports...
          </div>
        ) : (
          options.map((option, index) => (
            <div
              key={`${option.value}-${index}`}
              className={`
                px-4 py-3 hover:bg-gray-100 cursor-pointer
                text-[#4B616D] font-heebo font-medium
                ${highlightedIndex === index ? 'bg-gray-100' : ''}
              `}
              onClick={(e) => handleOptionSelect(option, e)}
              onMouseEnter={() => setHighlightedIndex(index)}
              role="option"
              aria-selected={highlightedIndex === index}
            >
              <div className="flex items-center justify-between">
                <span className="text-base font-medium font-heebo">
                  {option.description || option.label}
                </span>
                <span className="text-sm text-gray-500 font-heebo">
                  {option.value}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  const inputClassName = `
    w-full h-14 pl-12 pr-12 pt-5 pb-2
    text-[#4B616D] ${
      mounted && value && !isFocused && !isTyping
        ? 'text-xl lg:text-[28px] font-medium'
        : 'text-base font-medium'
    } font-heebo tracking-tight
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
  `;

  const labelClassName = `
    absolute left-12
    transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
    text-[#9BA3AF] font-heebo after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]
    ${
      mounted && (isFocused || inputValue)
        ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
        : 'translate-y-[14px] text-base'
    }
    ${isFocused ? 'text-[#9BA3AF]' : ''}
  `;

  if (!mounted) {
    return (
      <div className="relative">
        <div className="relative p-[2px] group">
          <input
            type="text"
            className="w-full h-14 pl-12 pr-12 pt-5 pb-2 text-base font-medium font-heebo tracking-tight bg-white rounded-xl border border-[#e0e1e4]"
            value=""
            readOnly
          />
          <label className="absolute left-12 translate-y-[14px] text-base text-[#9BA3AF] font-heebo">
            {label.replace(' *', '')}
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative p-[2px] group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {leftIcon ? (
            <PiAirplaneTakeoff size={20} />
          ) : rightIcon ? (
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
              {inputValue && allowClear && (
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
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default AutocompleteInput;
