"use client";

import React, { forwardRef, useState, useEffect, useRef } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, isValid, parseISO } from "date-fns";
import {
  CalendarIcon as BaseCalendarIcon,
  XMarkIcon as BaseXMarkIcon,
} from "@heroicons/react/24/outline";
import { useTranslation } from "@/hooks/useTranslation";

// Type assertions for HeroIcons
const CalendarIcon = BaseCalendarIcon as React.FC<
  React.ComponentProps<typeof BaseCalendarIcon>
>;
const XMarkIcon = BaseXMarkIcon as React.FC<
  React.ComponentProps<typeof BaseXMarkIcon>
>;

interface DateSelectorProps {
  selected: Date | null;
  onSelect: (date: Date | null) => void;
  label?: string;
  disabled?: boolean;
  error?: string | null;
  required?: boolean;
}

// START: Original CustomDateInput Implementation
export interface CustomDateInputProps {
  value?: string | Date;
  onClick?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onClear?: () => void;
  label: string;
  disabled?: boolean;
}

// Helper function to safely parse and format dates
const safeParseDateString = (value: string | Date | undefined): string => {
  if (!value) return "";
  try {
    if (typeof value === "string" && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      return value;
    }
    if (value instanceof Date) {
      if (!isValid(value)) return "";
      const formatted = format(value, "dd.MM.yyyy");
      return formatted;
    }
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsedDate = parseISO(value);
      if (!isValid(parsedDate)) return "";
      const formatted = format(parsedDate, "dd.MM.yyyy");
      return formatted;
    }
    return "";
  } catch (error) {
    return "";
  }
};

export const CustomDateInput = forwardRef<
  HTMLInputElement,
  CustomDateInputProps
>(
  (
    {
      value,
      onClick,
      onChange,
      placeholder = "DD.MM.YY / DD.MM.YYYY",
      onClear,
      label = "Departure Date",
      disabled,
    },
    ref
  ) => {
    const { t } = useTranslation();
    // State management
    const [inputValue, setInputValue] = useState("");
    const [isValidDate, setIsValidDate] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string>("");

    // Simplified refs - combine related flags into a single state object
    const inputState = useRef({
      isCalendarSelection: false,
      isManualInput: false,
      lastManualInput: "",
      previousLength: 0,
      isInitialMount: true,
    });

    useEffect(() => {
      // Skip updates if user is typing manually
      if (inputState.current.isManualInput) {
        return;
      }

      // Skip updates for specific calendar selection cases
      if (inputState.current.isCalendarSelection && inputValue && isValidDate) {
        return;
      }

      if (
        inputState.current.isCalendarSelection &&
        !value &&
        inputValue &&
        isValidDate
      ) {
        return;
      }

      // Format and set the input value if it has changed
      const formattedValue = safeParseDateString(value);
      if (formattedValue && formattedValue !== inputValue) {
        setInputValue(formattedValue);
        inputState.current.lastManualInput = formattedValue;
        setIsValidDate(true);
      }

      inputState.current.isInitialMount = false;
    }, [value, inputValue, isValidDate]);

    const validateDateFormat = (
      date: string
    ): { isValid: boolean; message: string } => {
      if (date === "") return { isValid: true, message: "" };

      const formatRegex = /^\d{2}\.\d{2}\.(\d{2}|\d{4})$/;
      if (!formatRegex.test(date)) {
        return {
          isValid: false,
          message: "Please enter a valid date in DD.MM.YYYY format",
        };
      }

      const [day, month, yearStr] = date.split(".").map(Number);
      let year = yearStr;

      // Handle two-digit years
      if (yearStr < 100) {
        year = yearStr >= 30 ? 1900 + yearStr : 2000 + yearStr;
      }

      const dateObj = new Date(year, month - 1, day);
      const isValidCheck =
        dateObj.getDate() === day &&
        dateObj.getMonth() === month - 1 &&
        (dateObj.getFullYear() === year ||
          dateObj.getFullYear() === 2000 + yearStr);

      if (!isValidCheck) {
        return { isValid: false, message: "The date is invalid" };
      }

      return { isValid: isValidCheck, message: "" };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      console.log("🔥 [CustomDateInput] handleChange called:", {
        value: e.target.value,
        label,
      });

      // Set manual input flag
      inputState.current.isManualInput = true;

      // Process and format the input value
      const newValue = e.target.value;
      const cleanValue = newValue.replace(/[^\d.]/g, "");
      const parts = cleanValue.split(".");

      // Format the input with automatic period insertion
      let formattedValue = "";
      if (parts[0]) {
        formattedValue = parts[0].slice(0, 2);
      }

      if (parts[1] || (parts[0] && parts[0].length > 2)) {
        const monthPart = parts[1] || parts[0].slice(2);
        formattedValue += "." + monthPart.slice(0, 2);
      }

      if (parts[2] || (parts[1] && parts[1].length > 2)) {
        const yearPart = parts[2] || parts[1].slice(2);
        formattedValue += "." + yearPart.slice(0, 4);
      }

      console.log("🔥 [CustomDateInput] Formatted value:", formattedValue);

      // Update state
      setIsValidDate(!(formattedValue.length > 0 && formattedValue.length < 8));
      setErrorMessage("");
      setInputValue(formattedValue);
      inputState.current.lastManualInput = formattedValue;

      // Check if date is complete and create ISO string
      const isComplete =
        formattedValue.length === 8 || formattedValue.length === 10;
      let eventValue = "";

      if (formattedValue === "") {
        eventValue = "";
        console.log(
          "🔥 [CustomDateInput] Empty value, calling onChange with empty string"
        );
      } else if (isComplete) {
        console.log(
          "🔥 [CustomDateInput] Complete date detected, processing..."
        );
        const { isValid: isValidFormat } = validateDateFormat(formattedValue);
        if (isValidFormat) {
          const [day, month, yearStr] = formattedValue.split(".").map(Number);
          let year = yearStr;

          if (yearStr < 100) {
            year = yearStr >= 30 ? 1900 + yearStr : 2000 + yearStr;
          }

          const dateObj = new Date(year, month - 1, day);
          if (isValid(dateObj)) {
            eventValue = dateObj.toISOString();
            console.log(
              "🔥 [CustomDateInput] Created ISO string from manual input:",
              eventValue
            );
          }
        }
      }

      if (eventValue !== undefined) {
        const syntheticEvent = {
          target: { value: eventValue },
        } as React.ChangeEvent<HTMLInputElement>;
        console.log(
          "🔥 [CustomDateInput] Calling onChange with event value:",
          eventValue
        );
        onChange?.(syntheticEvent);
      }

      inputState.current.previousLength = formattedValue.length;
    };

    const handleBlur = () => {
      if (inputValue) {
        if (inputValue.length < 8) {
          setIsValidDate(false);
          setErrorMessage("Please complete the date format");
        } else {
          const { isValid, message } = validateDateFormat(inputValue);
          setIsValidDate(isValid);
          setErrorMessage(message);
        }
      } else {
        setIsValidDate(true);
        setErrorMessage("");
      }
    };

    const handleCalendarClick = (e: React.MouseEvent) => {
      console.log("🔥 [CustomDateInput] handleCalendarClick called");
      e.preventDefault();
      e.stopPropagation();

      // Set calendar selection flag
      inputState.current.isCalendarSelection = true;
      inputState.current.isManualInput = false;

      const currentValue = inputValue;
      if (currentValue && isValidDate) {
        console.log(
          "🔥 [CustomDateInput] Processing existing date value:",
          currentValue
        );
        const [day, month, yearStr] = currentValue.split(".").map(Number);
        let year = yearStr;

        if (yearStr < 100) {
          year = yearStr >= 30 ? 1900 + yearStr : 2000 + yearStr;
        }

        const dateObj = new Date(year, month - 1, day);
        if (isValid(dateObj)) {
          const isoString = dateObj.toISOString();
          console.log("🔥 [CustomDateInput] Created ISO string:", isoString);
          inputState.current.lastManualInput = currentValue;

          const syntheticEvent = {
            target: { value: isoString },
          } as React.ChangeEvent<HTMLInputElement>;

          console.log(
            "🔥 [CustomDateInput] Calling onChange with synthetic event"
          );
          onChange?.(syntheticEvent);

          if (onClick && !disabled) {
            console.log("🔥 [CustomDateInput] Calling onClick");
            onClick();
          }
          return;
        }
      }

      if (onClick && !disabled) {
        console.log("🔥 [CustomDateInput] Calling onClick (fallback)");
        onClick();
      }
    };

    const handleClear = () => {
      // Reset all states
      inputState.current.isManualInput = true;
      setInputValue("");
      setIsValidDate(true);
      setErrorMessage("");
      inputState.current.lastManualInput = "";
      inputState.current.previousLength = 0;

      if (onClear) {
        onClear();
      } else {
        const syntheticEvent = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }
    };

    return (
      <div className="relative min-h-[4.5rem]">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            ref={ref}
            className={`peer w-full h-14 px-3 pl-10 pr-10 border ${
              !isValidDate ? "border-red-500" : "border-gray-300"
            } rounded-xl focus:outline-none focus:border-2 focus:border-blue-500 bg-white text-[#4B616D] hover:border-blue-500`}
            placeholder={placeholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-form-type="other"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={handleCalendarClick}
            disabled={disabled}
            className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:text-[#F54538] cursor-pointer"
            } transition-colors`}
          >
            <CalendarIcon className="w-5 h-5" />
          </button>
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#F54538] transition-colors cursor-pointer"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
          <label className="absolute text-sm text-gray-500 duration-300 transform bg-white px-2 -translate-y-4 scale-75 top-2 left-8 z-10">
            {label}
          </label>
        </div>
        {errorMessage && (
          <p className="absolute bottom-0 left-0 text-sm text-red-500 translate-y-7 mt-2">
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

CustomDateInput.displayName = "CustomDateInput";
// END: Original CustomDateInput Implementation

export const DateSelector: React.FC<DateSelectorProps> = ({
  selected,
  onSelect,
  label = "Select Date",
  disabled = false,
  error = null,
  required = false,
}) => {
  const handleDateChange = (date: Date | null) => {
    console.log("🔥 [DateSelector] handleDateChange called:", {
      date,
      dateType: typeof date,
      dateValue: date ? date.toString() : null,
      label,
    });
    try {
      onSelect(date);
      console.log("🔥 [DateSelector] onSelect called successfully");
    } catch (err) {
      console.error("Error setting date:", err);
    }
  };

  const handleClear = () => {
    console.log("🔥 [DateSelector] handleClear called");
    onSelect(null);
  };

  const handleDatePickerChange = (date: Date | null) => {
    console.log("🔥 [DateSelector] handleDatePickerChange called:", {
      date,
      dateType: typeof date,
      dateValue: date ? date.toString() : null,
      label,
    });
    onSelect(date);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("🔥 [DateSelector] handleInputChange called:", {
      value: e.target.value,
      label,
    });
    const isoString = e.target.value;
    if (isoString === "") {
      onSelect(null);
    } else {
      const parsedDate = parseISO(isoString);
      if (isValid(parsedDate)) {
        console.log("🔥 [DateSelector] Parsed date successfully:", parsedDate);
        onSelect(parsedDate);
      } else {
        console.log("🔥 [DateSelector] Failed to parse date:", isoString);
        onSelect(null);
      }
    }
  };

  return (
    <div className="relative">
      <DatePicker
        selected={selected}
        onChange={handleDatePickerChange}
        customInput={
          <CustomDateInput
            value={selected ?? undefined}
            onClear={handleClear}
            label={label}
            onChange={handleInputChange}
            disabled={disabled}
          />
        }
        dateFormat="dd.MM.yyyy"
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        isClearable={false}
        placeholderText="DD.MM.YY / DD.MM.YYYY"
        shouldCloseOnSelect={true}
        popperProps={{
          strategy: "fixed",
          placement: "top-start",
        }}
        className="react-datepicker-popper"
        calendarClassName="custom-calendar"
        disabled={disabled}
      />
    </div>
  );
};
