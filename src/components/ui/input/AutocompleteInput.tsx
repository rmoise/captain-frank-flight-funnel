"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import type { LocationData } from "@/types/shared/location";
import { debounce } from "lodash";
import { PiAirplaneTakeoff, PiAirplaneLanding } from "react-icons/pi";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * @requires tailwindcss/plugin-scrollbar - Make sure to have @tailwindcss/forms and tailwind-scrollbar plugins installed
 */

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

// Keep the existing scrollable styles definition
const scrollableStyles = `
  overflow-y-auto
  overflow-x-hidden
  max-h-[100px]
  whitespace-normal
  break-words
  scrollbar-thin
  scrollbar-thumb-gray-300
  scrollbar-track-transparent
  scrollbar-thumb-rounded-full
`;

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
  const isTabNavigatingRef = useRef(false);

  // Add hydration safety check
  const shouldRenderIcon = typeof window !== "undefined" && leftIcon;

  // Sync input value with external value
  useEffect(() => {
    if (!isTyping && value?.label !== prevValueRef.current) {
      console.log("Syncing input value from props:", value);

      // For Phase 4 or when we have a valid value, always sync
      // Only skip syncing if value is truly empty AND we're not in a restoration scenario
      // Also check if the value has empty/placeholder codes which should be treated as empty
      const isValueEmpty =
        !value?.label && !value?.value && !value?.description;
      const isValuePlaceholder = value?.value === "" || value?.label === "";
      const shouldSkipSync =
        (isValueEmpty || isValuePlaceholder) && prevValueRef.current;

      if (shouldSkipSync) {
        console.log(
          "Skipping sync with empty props value while we have previous value"
        );
        return;
      }

      // If we have placeholder data, clear the input
      if (isValuePlaceholder) {
        console.log("Clearing input due to placeholder data");
        setInputValue("");
        prevValueRef.current = undefined;
        return;
      }

      let newInputValue = "";
      if (value?.description && value?.label) {
        // Format with description and code
        newInputValue = `${value.description} (${value.label})`;
      } else if (value?.dropdownLabel) {
        // Use dropdownLabel if available
        newInputValue = value.dropdownLabel;
      } else {
        // Fallback to just the label if no description is available
        newInputValue = value?.label || "";
      }

      console.log("Setting input value to:", newInputValue);
      setInputValue(newInputValue);
      setIsTyping(false);
      prevValueRef.current = value?.label;
    }
  }, [
    value?.label,
    value?.description,
    value?.dropdownLabel,
    value?.value,
    isTyping,
  ]);

  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        // Absolutely prevent search for empty or too short terms
        const trimmedTerm = term.trim();
        if (!trimmedTerm || trimmedTerm.length < 3) {
          console.log(
            "Debounced search: Term is empty or too short, skipping API call.",
            { term }
          );
          setOptions([]);
          setLoading(false);
          setIsOpen(false); // Close dropdown if term is invalid
          return;
        }

        // Skip search if preventInitialSearch is true and there's no user interaction
        // This check might be redundant now but kept for safety
        if (preventInitialSearch && !userInteractionRef.current) {
          setOptions([]);
          setLoading(false);
          return;
        }

        setLoading(true);
        try {
          // Use the already trimmed term
          console.log(
            "AutocompleteInput: Calling onSearch with term:",
            trimmedTerm
          );
          const results = await onSearch(trimmedTerm);
          setOptions(results);
          setLoading(false);
          // Ensure dropdown stays open if we get results
          if (results.length > 0) {
            setIsOpen(true);
          } else {
            setIsOpen(false);
          }
        } catch (error) {
          console.error("Error searching locations:", error);
          setOptions([]);
          setLoading(false);
          setIsOpen(false); // Close dropdown on error
        }
      }, 100), // Reduce debounce time for better responsiveness
    [onSearch, preventInitialSearch]
  );

  const handleOptionSelect = useCallback(
    (option: LocationData, isAutoSelect = false) => {
      // Prevent processing if no option is provided
      if (!option) return;

      // Log for debugging
      console.log("Selected option:", option);

      // Don't transform the option, use it exactly as provided by the API
      const selectedOption = option;

      // Update state
      setIsTyping(false);
      console.log("handleOptionSelect: Set isTyping to false"); // DEBUG LOG
      setHighlightedIndex(null);
      setIsTouched(true);

      // Ensure we get a display value with fallbacks
      let displayValue = "";
      if (option.dropdownLabel) {
        displayValue = option.dropdownLabel;
      } else if (option.description && option.value) {
        displayValue = `${option.description} (${option.value})`;
      } else if (option.label && option.value) {
        displayValue = `${option.label} (${option.value})`;
      } else {
        displayValue = option.value || option.label || option.description || "";
      }

      // Set the input value
      console.log("Setting input value to:", displayValue);
      setInputValue(displayValue);
      setOptions([]);
      setIsOpen(false);

      // Add logging and error handling around the onChange call
      if (onChange) {
        console.log(
          "[AutocompleteInput] About to call onChange with:",
          selectedOption
        );
        try {
          onChange(selectedOption);
          console.log("[AutocompleteInput] onChange called successfully.");
        } catch (e) {
          console.error("[AutocompleteInput] Error calling onChange prop:", e);
        }
      } else {
        console.warn("[AutocompleteInput] onChange prop is missing.");
      }

      // Update the reference
      prevValueRef.current = option.label;

      // Always close dropdown on selection
      setIsFocused(false);

      // Move to next input after a brief delay to ensure state updates
      setTimeout(() => {
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
              (nextInput as HTMLElement).focus();
            }
          }
        }
      }, 50);
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
      console.log("handleInputChange:", {
        newValue: e.target.value,
        leftIcon,
        currentValue: inputValue,
      });

      // Don't process if we're tabbing away
      if (isTabNavigatingRef.current) {
        return;
      }

      const newValue = e.target.value;

      // Update state immediately for responsiveness
      setInputValue(newValue);
      setIsTyping(true);
      setIsTouched(true);
      setIsOpen(true);
      setIsFocused(true);

      // Handle empty input explicitly
      if (!newValue) {
        console.log(
          "handleInputChange: Input cleared, clearing options and calling onChange(null)."
        );
        setOptions([]);
        onChange(null);
        debouncedSearch.cancel(); // Cancel any pending search
        return;
      }

      // Determine the display text of the currently selected value (if any)
      let selectedValueDisplayText = "";
      if (value?.description && value?.label) {
        selectedValueDisplayText = `${value.description} (${value.label})`;
      } else if (value?.dropdownLabel) {
        selectedValueDisplayText = value.dropdownLabel;
      } else {
        selectedValueDisplayText = value?.label || "";
      }

      // Only trigger search if the input value is different from the selected value's display text
      // OR if there is no selected value.
      if (!value || newValue !== selectedValueDisplayText) {
        console.log(
          "handleInputChange: Input differs from selected value or no value selected. Triggering search.",
          { newValue, selectedValueDisplayText }
        );
        userInteractionRef.current = true; // Mark interaction

        // Special handling for 3-char IATA-like input (might be removed if causing issues)
        if (
          newValue.length === 3 &&
          /^[A-Z]{3}$/.test(newValue.toUpperCase())
        ) {
          console.log(
            "handleInputChange: Detected 3-char IATA-like input, searching immediately."
          );
          debouncedSearch.cancel(); // Cancel previous debounce
          // Direct search (consider if debouncing this specific case is better)
          onSearch(newValue.toUpperCase())
            .then((results) => {
              setOptions(results);
              setIsOpen(true);
              setLoading(false);
            })
            .catch((error) => {
              console.error("Error during direct 3-char search:", error);
              setOptions([]);
              setLoading(false);
              setIsOpen(false);
            });
        } else {
          // Normal debounced search for other cases
          console.log("handleInputChange: Triggering debounced search.");
          debouncedSearch(newValue);
        }
      } else {
        console.log(
          "handleInputChange: Input matches selected value display text. Skipping search.",
          { newValue }
        );
        // If input matches display text, ensure options are closed and search is cancelled
        debouncedSearch.cancel();
        setOptions([]);
        setIsOpen(false);
        setLoading(false);
      }
    },
    [debouncedSearch, onChange, onSearch, value, inputValue, leftIcon]
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

      debouncedSearch.cancel(); // Cancel any pending searches immediately

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
    [onChange, debouncedSearch]
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
        className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-[300px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
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
                      {option.description ? (
                        <>
                          {option.description}
                          {option.value && ` `}
                          {option.value && (
                            <span className="font-bold">{`(${option.value})`}</span>
                          )}
                        </>
                      ) : option.label ? (
                        <>
                          {option.label}
                          {option.value && option.value !== option.label && ` `}
                          {option.value && option.value !== option.label && (
                            <span className="font-bold">{`(${option.value})`}</span>
                          )}
                        </>
                      ) : (
                        option.value
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-2 text-[#4B616D]">
            {t("common.noResults", "No results found")}
          </div>
        )}
      </div>
    );

    return createPortal(dropdownContent, document.body);
  };

  const inputClassName = `
    w-full h-auto min-h-[52px] pl-14 pr-14 pt-4 pb-2
    text-[#4B616D] text-sm font-medium
    bg-white rounded-xl
    transition-all duration-[250ms] ease-in-out
    ${
      isFocused
        ? "border-2 border-blue-500"
        : error && isTouched && inputValue
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
        : "translate-y-[12px] text-base"
    }
    ${isFocused ? "text-[#9BA3AF]" : ""}
  `;

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative p-[2px] group w-full">
        {/* Always render the input element */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          required={required}
          aria-label={label}
          className={inputClassName}
          autoComplete="off"
        />

        {/* Floating Label */}
        <label htmlFor={label} className={labelClassName}>
          {label.replace(" *", "")}
        </label>

        {/* Left Icon */}
        {shouldRenderIcon && (
          <div className="absolute left-5 top-[50%] -translate-y-1/2 pointer-events-none text-gray-400">
            {leftIcon === "departure" ? (
              <PiAirplaneTakeoff size={20} />
            ) : leftIcon === "arrival" ? (
              <PiAirplaneLanding size={20} />
            ) : null}
          </div>
        )}

        {/* Right Icons (Clear/Dropdown/Loading) */}
        <div className="absolute right-5 top-[50%] -translate-y-1/2 flex items-center space-x-2">
          {loading ? (
            <LoadingSpinner />
          ) : (
            <>
              {inputValue && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600"
                  aria-label={t("common.clearInput", "Clear input")}
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
              <ChevronDownIcon
                className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && renderDropdown()}

      {/* Error Message */}
      {showError && error && isTouched && inputValue && (
        <p className="text-[#F54538] text-xs mt-1 ml-1">{error}</p>
      )}
    </div>
  );
};
