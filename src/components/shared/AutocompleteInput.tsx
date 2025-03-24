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
import { useTranslation } from '@/hooks/useTranslation';

const LoadingSpinner = () => (
  <div className="relative w-6 h-6">
    <div
      className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#F54538] border-r-[#F54538]/30"
      style={{ animationDuration: '0.8s' }}
    />
  </div>
);

export type Location = LocationData

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
  preventInitialSearch?: boolean;
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
  preventInitialSearch = false,
}) => {
  const { t } = useTranslation();
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
  const userInteractionRef = useRef<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);

  // Add new ref to track if we're handling tab navigation
  const isTabNavigatingRef = useRef(false);

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
        // Skip search if preventInitialSearch is true and there's no user interaction
        if (preventInitialSearch && !userInteractionRef.current) {
          setOptions([]);
          setLoading(false);
          return;
        }

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
    [onSearch, preventInitialSearch]
  );

  const handleOptionSelect = useCallback(
    (option: LocationData, isAutoSelect = false) => {
      // Prevent processing if no option is provided
      if (!option) return;

      // Extract the full name and code
      const fullName = option.dropdownLabel
        ? option.dropdownLabel.split(' (')[0]
        : option.description || option.label;
      const code = option.value;

      // Ensure we have a valid code
      if (!code) {
        console.warn('Invalid option selected:', option);
        return;
      }

      const updatedOption = {
        ...option,
        label: code,
        value: code,
        description: fullName,
        dropdownLabel: `${fullName} (${code})`,
      };

      // Update state based on selection type
      setIsTyping(false);
      setHighlightedIndex(null);
      setIsTouched(true);
      setInputValue(code);

      if (isAutoSelect) {
        // Keep dropdown open for auto-select
        setIsFocused(true);
        setIsOpen(true);
      } else {
        // Close dropdown for manual selection or tab
        setIsFocused(false);
        setIsOpen(false);
        setOptions([]);
        setLoading(false);

        // Move to next input
        requestAnimationFrame(() => {
          const currentInput = inputRef.current;
          if (currentInput) {
            const stepContainer = currentInput.closest('[data-step]');
            if (stepContainer) {
              const allInputs = Array.from(
                stepContainer.querySelectorAll('input')
              );
              const currentIndex = allInputs.indexOf(currentInput);
              const nextInput = allInputs[currentIndex + 1];
              if (nextInput) {
                nextInput.focus();
              }
            }
          }
        });
      }

      // Trigger the onChange callback
      onChange(updatedOption);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab') {
      // Set tab navigation flag immediately to prevent any other operations
      isTabNavigatingRef.current = true;

      // Cancel any pending searches immediately
      debouncedSearch.cancel();

      // If we have a 3-letter code, try to auto-select FIRST
      if (inputValue.length === 3) {
        const code = inputValue.toUpperCase();

        // Check if it matches IATA code pattern (3 uppercase letters)
        if (/^[A-Z]{3}$/.test(code)) {
          e.preventDefault();
          // Create a generic airport option - the actual name will be updated later if needed
          const airportOption = {
            label: code,
            value: code,
            description: `${code} International Airport`,
            dropdownLabel: `${code} International Airport (${code})`,
          };
          handleOptionSelect(airportOption, false);

          // Optionally trigger a search to update the airport name later
          onSearch(code)
            .then((results) => {
              const exactMatch = results.find((r) => r.value === code);
              if (exactMatch && !isTabNavigatingRef.current) {
                handleOptionSelect(exactMatch, false);
              }
            })
            .catch(() => {
              // If search fails, we still have the generic airport option selected
              console.log(
                'Could not fetch airport details, using generic name'
              );
            });
          return;
        }

        // Check for exact match in current options as fallback
        const exactMatch = options.find((option) => option.value === code);
        if (exactMatch) {
          e.preventDefault();
          handleOptionSelect(exactMatch, false);
          return;
        }
      }

      // Clear all states immediately
      setIsOpen(false);
      setHighlightedIndex(null);
      setLoading(false);
      setOptions([]);

      // Reset input if no valid selection was made
      if (isTyping) {
        setInputValue(value?.label || '');
        setIsTyping(false);
      }

      // Keep tab navigation flag true for longer to handle rapid tabbing
      setTimeout(() => {
        isTabNavigatingRef.current = false;
      }, 300);
    }
  };

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Don't process if we're tabbing away
      if (isTabNavigatingRef.current) {
        return;
      }

      const newValue = e.target.value.toUpperCase();

      // Always allow input changes
      setInputValue(newValue);
      setIsTyping(true);
      setIsTouched(true);
      setIsOpen(true);
      setIsFocused(true);

      // Handle empty input
      if (!newValue) {
        setOptions([]);
        onChange(null);
        return;
      }

      // If the input is exactly 3 characters and matches an IATA code format
      if (newValue.length === 3 && /^[A-Z]{3}$/.test(newValue)) {
        // Cancel any previous search
        debouncedSearch.cancel();

        let isCancelled = false;

        // Try both IATA code and city name search
        const searchWithBothMethods = async () => {
          if (isTabNavigatingRef.current) return; // Exit if tabbing

          setLoading(true);
          try {
            // First try with the IATA code
            const iataResults = await onSearch(newValue);

            if (!isCancelled && !isTabNavigatingRef.current) {
              // Create a temporary option for immediate feedback
              const tempOption = {
                label: newValue,
                value: newValue,
                description: `${newValue} International Airport`,
                dropdownLabel: `${newValue} International Airport (${newValue})`,
              };

              // If we don't have an exact match in the results, add our temporary option
              if (!iataResults.some((r) => r.value === newValue)) {
                iataResults.unshift(tempOption);
              }

              setOptions(iataResults);
              setIsOpen(true);

              // Try to find an exact match
              const exactMatch = iataResults.find(
                (option) => option.value === newValue
              );
              if (exactMatch && !isTabNavigatingRef.current) {
                handleOptionSelect(exactMatch, true);
              } else {
                // If no exact match found, use the temporary option
                handleOptionSelect(tempOption, true);
              }

              // Try city name search as additional results
              const cityMap: Record<string, string> = {
                BER: 'BERLIN',
                FRA: 'FRANKFURT',
                MUC: 'MUNICH',
                HAM: 'HAMBURG',
                // Add more common city mappings if needed
              };

              const cityName = cityMap[newValue];
              if (cityName) {
                const cityResults = await onSearch(cityName);
                if (!isCancelled && !isTabNavigatingRef.current) {
                  const combinedResults = [...iataResults];
                  cityResults.forEach((cityResult) => {
                    if (
                      !combinedResults.some((r) => r.value === cityResult.value)
                    ) {
                      combinedResults.push(cityResult);
                    }
                  });

                  setOptions(combinedResults);
                }
              }
            }
          } catch (error) {
            console.error('Error searching locations:', error);
            if (!isCancelled && !isTabNavigatingRef.current) {
              // Even if search fails, show temporary option
              const tempOption = {
                label: newValue,
                value: newValue,
                description: `${newValue} International Airport`,
                dropdownLabel: `${newValue} International Airport (${newValue})`,
              };
              setOptions([tempOption]);
              handleOptionSelect(tempOption, true);
            }
          } finally {
            if (!isCancelled && !isTabNavigatingRef.current) {
              setLoading(false);
            }
          }
        };

        searchWithBothMethods();
        return () => {
          isCancelled = true;
        };
      } else {
        // Normal search for other cases
        debouncedSearch(newValue);
      }
    },
    [debouncedSearch, onChange, onSearch, handleOptionSelect, value]
  );

  const handleInputFocus = useCallback(async () => {
    // Don't show dropdown if we're tabbing or if we just auto-selected
    if (isTabNavigatingRef.current) {
      return;
    }

    // If we have a valid selection, don't show dropdown immediately
    if (value?.label === inputValue && inputValue.length === 3) {
      return;
    }

    // Skip initial search if preventInitialSearch is true and there's no user interaction
    if (preventInitialSearch && !userInteractionRef.current) {
      return;
    }

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
        if (!isTabNavigatingRef.current) {
          // Check again in case user started tabbing
          setOptions(results);
        }
      } catch (error) {
        console.error('Error loading initial options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }
    // If there's a value but no options, perform a search
    else if (inputValue && !options.length && !value?.label) {
      debouncedSearch(inputValue);
    }
  }, [debouncedSearch, inputValue, options.length, onFocus, value, preventInitialSearch]);

  // Modify the blur handler
  const handleBlur = () => {
    debouncedSearch.cancel();

    if (isTabNavigatingRef.current) {
      setIsFocused(false);
      setIsOpen(false);
      setHighlightedIndex(null);
      setLoading(false);
      setOptions([]);

      if (isTyping) {
        setInputValue(value?.label || '');
        setIsTyping(false);
      }
      onBlur?.();
      return;
    }

    // For non-tab blur, use shorter timeout
    setTimeout(() => {
      if (!isTabNavigatingRef.current) {
        setIsFocused(false);
        setIsOpen(false);
        setHighlightedIndex(null);
        setLoading(false);

        if (isTyping) {
          setInputValue(value?.label || '');
          setIsTyping(false);
        }
      }
    }, 50);

    onBlur?.();
  };

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
      setLoading(false);
      isTabNavigatingRef.current = false;
      if (inputRef.current) {
        inputRef.current.focus();
        // Reset typing state after a small delay to allow new input
        setTimeout(() => {
          setIsTyping(false);
          setIsFocused(true);
        }, 0);
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
            {options.map((option, index) => {
              // Extract the full name and code from dropdownLabel
              const fullName = option.dropdownLabel
                ? option.dropdownLabel.split(' (')[0]
                : option.description || option.label;
              const code = option.dropdownLabel
                ? option.dropdownLabel.split(' (')[1]?.replace(')', '')
                : option.value;

              const isSelected = option.value === value?.value;

              return (
                <li
                  key={option.value || index}
                  onClick={() =>
                    option.value ? handleOptionSelect(option) : null
                  }
                  className={`px-4 py-2 ${
                    option.value
                      ? 'cursor-pointer hover:bg-gray-100'
                      : 'text-gray-500 cursor-default'
                  } ${isSelected ? 'bg-[#FEF2F2] text-[#F54538]' : ''} ${
                    highlightedIndex === index ? 'bg-gray-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-base font-medium ${isSelected ? 'text-[#F54538]' : 'text-[#4B616D]'}`}
                    >
                      {fullName}
                    </span>
                    {code && (
                      <span
                        className={`text-sm ml-2 ${isSelected ? 'text-[#F54538]' : 'text-gray-500'}`}
                      >
                        {code}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-2 text-[#4B616D]">{t.common.noResults}</div>
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
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
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
