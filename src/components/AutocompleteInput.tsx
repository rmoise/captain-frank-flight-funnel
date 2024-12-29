import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { PiAirplaneTakeoff, PiAirplaneLanding } from 'react-icons/pi';
import debounce from 'lodash/debounce';

export interface Option {
  value: string;
  label: string;
  description?: string;
}

export interface AutocompleteInputProps {
  label?: string;
  value?: string | Option;
  options: Option[];
  error?: string | null;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  isFocused?: boolean;
  onSearch: (term: string) => Option[] | Promise<Option[]>;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  iconType?: 'from' | 'to';
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  label,
  value,
  onChange,
  onSearch,
  onFocus,
  onBlur,
  options = [],
  className = '',
  required = false,
  error = null,
  isLoading = false,
  isFocused = false,
  disabled = false,
  iconType,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localInputValue, setLocalInputValue] = useState(() => {
    if (!value) return '';
    return typeof value === 'object' ? value.value : value;
  });
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isTouched, setIsTouched] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(isFocused);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update input value when value prop changes
  useEffect(() => {
    if (value !== undefined) {
      const newValue = typeof value === 'object' ? value.value : value;
      setLocalInputValue(newValue);
    }
  }, [value]);

  // Update focus state when prop changes
  useEffect(() => {
    setIsInputFocused(isFocused);
  }, [isFocused]);

  // Create a debounced search function
  const debouncedSearchRef = useRef<ReturnType<typeof debounce> | null>(null);

  useEffect(() => {
    debouncedSearchRef.current = debounce((term: string) => {
      if (onSearch && term.length >= 3) {
        onSearch(term);
      }
    }, 300);

    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [onSearch]);

  const debouncedSearch = useCallback((term: string) => {
    debouncedSearchRef.current?.(term);
  }, []);

  const handleInputChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const term = event.target.value;
    setLocalInputValue(term);
    setIsOpen(true);
    onChange(term);
    debouncedSearch(term);
  };

  const handleOptionSelect = (option: Option) => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setLocalInputValue(option.value);
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    setIsTouched(true);
    setIsInputFocused(false);
  };

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setIsOpen(true);
    setIsInputFocused(true);
    onFocus?.();

    // If we have a value and it's long enough, trigger a search
    const currentValue = typeof value === 'object' ? value.value : value;
    if (
      currentValue &&
      typeof currentValue === 'string' &&
      currentValue.length >= 3
    ) {
      onSearch(currentValue);
    }
  };

  const handleInputBlur = () => {
    // Store the timeout ID so we can clear it if needed
    blurTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsInputFocused(false);
      setIsTouched(true);
      onBlur?.();

      // If there's a selected value from options, use that
      const currentValue = typeof value === 'object' ? value.value : value;
      const option = options.find((opt) => opt.value === currentValue);
      if (option) {
        setLocalInputValue(option.value);
      }
    }, 200);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Clear any pending blur timeout
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
    setLocalInputValue('');
    onChange('');
    if (typeof onSearch === 'function') {
      onSearch('');
    }
    setIsTouched(true);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      debouncedSearchRef.current?.cancel();
    };
  }, [debouncedSearchRef]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < options.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleOptionSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  // Scroll highlighted option into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[
        highlightedIndex
      ] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  }, [highlightedIndex, isOpen]);

  const showError = error && isTouched;
  const showRequiredError = required && isTouched && !value;

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

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

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <div
        id="autocomplete-dropdown"
        className="absolute bg-white rounded-xl shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-[9999]"
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width,
        }}
      >
        <ul className="py-1" role="listbox">
          {isLoading ? (
            <li className="px-4 py-3 text-gray-500">Loading...</li>
          ) : options.length === 0 ? (
            <li className="px-4 py-3 text-gray-500">
              {localInputValue.length < 3
                ? 'Enter at least 3 characters'
                : 'No options found'}
            </li>
          ) : (
            options.map((option, index) => (
              <li
                key={`${option.value}-${index}`}
                className={`
                  px-4 py-3 hover:bg-gray-100 cursor-pointer
                  text-[#4b616d] font-heebo
                  ${highlightedIndex === index ? 'bg-gray-100' : ''}
                `}
                onClick={() => handleOptionSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                role="option"
                aria-selected={highlightedIndex === index}
              >
                <div className="flex items-center justify-between">
                  <span className="text-base">
                    {iconType ? option.description : option.label}
                  </span>
                  {iconType && (
                    <span className="text-sm text-gray-500 ml-2">
                      {option.value}
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        {iconType && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            {iconType === 'from' ? (
              <PiAirplaneTakeoff className="w-5 h-5" />
            ) : (
              <PiAirplaneLanding className="w-5 h-5" />
            )}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={localInputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`
            w-full h-14 ${iconType ? 'pl-12' : 'pl-4'} pr-10 ${
              iconType ? 'pt-5 pb-2' : 'py-2'
            }
            text-[#4B616D] ${
              iconType
                ? 'text-xl lg:text-[28px] font-medium tracking-tight uppercase'
                : 'text-base font-normal'
            }
            font-['Heebo']
            bg-white rounded-xl
            transition-[border-color,border-width] duration-[250ms] ease-in-out
            ${
              isInputFocused
                ? 'border-2 border-blue-500'
                : error && isTouched && !isOpen
                  ? 'border border-[#F54538]'
                  : 'border border-[#e0e1e4] hover:border-blue-500'
            }
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
            focus:outline-none
          `}
          aria-invalid={showError || showRequiredError}
          aria-describedby={
            showError || showRequiredError ? `${label}-error` : undefined
          }
        />
        <label
          className={`
            absolute ${iconType ? 'left-12' : 'left-4'}
            transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
            text-[#9BA3AF] font-heebo font-normal
            ${
              required
                ? "after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]"
                : ''
            }
            ${
              isInputFocused || localInputValue
                ? 'translate-y-[-8px] text-[10px] px-1 bg-white'
                : 'translate-y-[14px] text-base'
            }
            ${isInputFocused ? 'text-[#464646]' : ''}
          `}
        >
          {label}
        </label>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {localInputValue && !isLoading && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              type="button"
              aria-label="Clear input"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400" />
            </button>
          )}
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#F54538] border-t-transparent" />
          ) : (
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
      {renderDropdown()}
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
