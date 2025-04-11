"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import type { LocationData } from "@/types/store";
import { debounce } from "lodash";
import { PiAirplaneTakeoff, PiAirplaneLanding } from "react-icons/pi";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@/hooks/useTranslation";

const LoadingSpinner = () => (
  <div className="relative w-6 h-6">
    <div
      className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#F54538] border-r-[#F54538]/30"
      style={{ animationDuration: "0.8s" }}
    />
  </div>
);

export type Location = LocationData;

export interface AutocompleteInputProps {
  label: string;
  value: LocationData | null;
  onChange: (location: LocationData | null) => void;
  onSearch: (term: string) => Promise<LocationData[]>;
  onFocus?: () => Promise<LocationData[]>;
  onBlur?: () => void;
  leftIcon?: "departure" | "arrival";
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
  const [inputValue, setInputValue] = useState(value?.label || "");
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
      if (value?.description && value?.label) {
        // Show formatted airport name with code
        setInputValue(`${value.description} (${value.label})`);
      } else {
        // Fallback to just the label if no description is available
        setInputValue(value?.label || "");
      }
      setIsTyping(false);
      prevValueRef.current = value?.label;
    }
  }, [value?.label, value?.description, isTyping]);

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
          console.error("Error searching locations:", error);
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

      // Don't transform the option, use it exactly as provided by the API
      // This preserves the original language and format
      const selectedOption = option;

      // Update state
      setIsTyping(false);
      setHighlightedIndex(null);
      setIsTouched(true);

      // Set input value for display
      setInputValue(
        option.dropdownLabel ||
          `${option.description || ""} (${option.value || ""})`
      );

      // Always close dropdown on selection
      setIsFocused(false);
      setIsOpen(false);
      setOptions([]);
      setLoading(false);

      // Move to next input
      requestAnimationFrame(() => {
        const currentInput = inputRef.current;
        if (currentInput) {
          const stepContainer = currentInput.closest("[data-step]");
          if (stepContainer) {
            const allInputs = Array.from(
              stepContainer.querySelectorAll("input")
            );
            const currentIndex = allInputs.indexOf(currentInput);
            const nextInput = allInputs[currentIndex + 1];
            if (nextInput) {
              nextInput.focus();
            }
          }
        }
      });

      // Pass the unmodified option to onChange
      onChange(selectedOption);
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Tab") {
      // Just set the tab flag but don't try to select anything
      isTabNavigatingRef.current = true;

      // Only reset if typing with no selection made
      if (isTyping && value?.label !== inputValue) {
        if (value?.label) {
          // Reset to previous value
          setInputValue(value.label);
        } else {
          // Clear it
          setInputValue("");
        }
        setIsTyping(false);
      }

      // Close any open dropdowns
      setIsOpen(false);
      setOptions([]);

      // Clear the tab flag after a delay
      setTimeout(() => {
        isTabNavigatingRef.current = false;
      }, 300);

      // Let the tab event continue naturally to the next field
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

      // Set a flag to mark that we've had user interaction
      userInteractionRef.current = true;

      // If the input is exactly 3 characters and matches an IATA code format
      if (newValue.length === 3 && /^[A-Z]{3}$/.test(newValue)) {
        // Cancel any previous search
        debouncedSearch.cancel();

        let isCancelled = false;

        // Direct search with IATA code
        const searchWithCode = async () => {
          if (isTabNavigatingRef.current) return; // Exit if tabbing

          setLoading(true);
          try {
            // Search with the IATA code
            const results = await onSearch(newValue);

            if (!isCancelled && !isTabNavigatingRef.current) {
              // Use results directly from API without modification
              setOptions(results);
              setIsOpen(true);
            }
          } catch (error) {
            console.error("Error searching locations:", error);
            if (!isCancelled && !isTabNavigatingRef.current) {
              setOptions([]);
            }
          } finally {
            if (!isCancelled && !isTabNavigatingRef.current) {
              setLoading(false);
            }
          }
        };

        searchWithCode();
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
        console.error("Error loading initial options:", error);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }
    // If there's a value but no options, perform a search
    else if (inputValue && !options.length && !value?.label) {
      debouncedSearch(inputValue);
    }
  }, [
    debouncedSearch,
    inputValue,
    options.length,
    onFocus,
    value,
    preventInitialSearch,
  ]);

  // Modify the blur handler
  const handleBlur = () => {
    // Don't cancel searches immediately
    // Let the mousedown event happen first before processing blur
    setTimeout(() => {
      debouncedSearch.cancel();

      if (isTabNavigatingRef.current) {
        setIsFocused(false);
        setIsOpen(false);
        setHighlightedIndex(null);
        setLoading(false);
        setOptions([]);

        if (isTyping) {
          if (value?.description && value?.label) {
            // Reset to full airport name format
            setInputValue(`${value.description} (${value.label})`);
          } else {
            // Fallback to just the code
            setInputValue(value?.label || "");
          }
          setIsTyping(false);
        }
        return;
      }

      // For non-tab blur, use longer timeout to allow dropdown clicks
      setIsFocused(false);
      setIsOpen(false);
      setHighlightedIndex(null);
      setLoading(false);

      if (isTyping) {
        if (value?.description && value?.label) {
          // Reset to full airport name format
          setInputValue(`${value.description} (${value.label})`);
        } else {
          // Fallback to just the code
          setInputValue(value?.label || "");
        }
        setIsTyping(false);
      }

      // Call the onBlur callback provided by parent
      onBlur?.();
    }, 200); // Increased timeout to allow dropdown interaction
  };

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange(null);
      setInputValue("");
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
    window.addEventListener("scroll", updatePosition);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const dropdownElement = document.getElementById("autocomplete-dropdown");
      const isClickingDropdown = dropdownElement?.contains(target);
      const isClickingInput = containerRef.current?.contains(target);

      if (!isClickingDropdown && !isClickingInput) {
        setIsOpen(false);
        setIsFocused(false);
        setIsTyping(false);
        setIsTouched(true);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
          maxWidth: "100%",
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : options.length > 0 ? (
          <ul className="py-2">
            {options.map((option, index) => {
              const isSelected = option.value === value?.value;

              return (
                <li
                  key={option.value || index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (option.value) {
                      handleOptionSelect(option, false);
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (option.value) {
                      handleOptionSelect(option, false);
                    }
                  }}
                  className={`px-4 py-3 ${
                    option.value
                      ? "cursor-pointer hover:bg-gray-100"
                      : "text-gray-500 cursor-default"
                  } ${isSelected ? "bg-[#FEF2F2] text-[#F54538]" : ""} ${
                    highlightedIndex === index ? "bg-gray-100" : ""
                  }`}
                >
                  <div className="flex flex-col">
                    <div
                      className={`text-sm font-medium ${
                        isSelected ? "text-[#F54538]" : "text-[#4B616D]"
                      }`}
                    >
                      {option.description || option.label || ""}{" "}
                      {option.value && `(${option.value})`}
                    </div>
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
    w-full h-[64px] pl-14 pr-14 pt-6 pb-3
    text-[#4B616D] text-sm font-medium tracking-tight
    bg-white rounded-xl
    transition-all duration-[250ms] ease-in-out
    ${
      isFocused
        ? "border-2 border-blue-500"
        : error && isTouched
        ? "border border-[#F54538]"
        : "border border-[#e0e1e4] group-hover:border-blue-500"
    }
    focus:outline-none
    ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
    ${required ? "required" : ""}
  `;

  const labelClassName = `
    absolute left-14
    transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1) pointer-events-none
    text-[#9BA3AF] after:content-['*'] after:text-[#F54538] after:ml-[1px] after:align-super after:text-[10px]
    ${
      isFocused || inputValue
        ? "translate-y-[-10px] text-[10px] px-1 bg-white"
        : "translate-y-[16px] text-base"
    }
    ${isFocused ? "text-[#9BA3AF]" : ""}
  `;

  return (
    <div className="relative w-full max-w-3xl" ref={containerRef}>
      <div className="relative p-[2px] group w-full">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          {leftIcon === "departure" ? (
            <PiAirplaneTakeoff size={20} />
          ) : leftIcon === "arrival" ? (
            <PiAirplaneLanding size={20} />
          ) : null}
        </div>

        {/* Custom input display for selected values */}
        {value && value.label && !isTyping ? (
          <div
            className={`w-full h-[64px] pl-14 pr-14 cursor-text relative
              bg-white rounded-xl
              flex items-center justify-start
              ${
                isFocused
                  ? "border-2 border-blue-500"
                  : error && isTouched
                  ? "border border-[#F54538]"
                  : "border border-[#e0e1e4] group-hover:border-blue-500"
              }
              ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}
            `}
            onClick={() => {
              if (!disabled && inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              {leftIcon === "departure" ? (
                <PiAirplaneTakeoff size={20} />
              ) : leftIcon === "arrival" ? (
                <PiAirplaneLanding size={20} />
              ) : null}
            </div>
            <label className="absolute top-0 left-14 -translate-y-1/2 text-[10px] text-[#9BA3AF] px-1 bg-white z-10">
              {label.replace(" *", "")}
            </label>
            <div className="text-sm font-medium text-[#4B616D] whitespace-normal break-words mr-6 py-1 mt-3 mb-2 leading-[1.1]">
              {value.description || value.label}{" "}
              {value.value && `(${value.value})`}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="absolute opacity-0 top-0 left-0 w-full h-full"
              placeholder=""
              disabled={disabled}
              aria-invalid={
                ((error && isTouched) || false).toString() as "true" | "false"
              }
              aria-describedby={
                error && isTouched ? `${label}-error` : undefined
              }
            />
          </div>
        ) : (
          /* Regular input when typing or no value selected */
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
            title={inputValue}
            aria-invalid={
              ((error && isTouched) || false).toString() as "true" | "false"
            }
            aria-describedby={error && isTouched ? `${label}-error` : undefined}
          />
        )}

        {/* Only show the label for the regular input state */}
        {!(value && value.label && !isTyping) && (
          <label className={labelClassName}>{label.replace(" *", "")}</label>
        )}

        <div
          className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center gap-2"
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
                  isOpen ? "rotate-180" : ""
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
