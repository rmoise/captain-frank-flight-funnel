"use client";

import React, { forwardRef, useState, useEffect, useRef } from "react";
import {
  CalendarIcon as BaseCalendarIcon,
  XMarkIcon as BaseXMarkIcon,
} from "@heroicons/react/24/outline";
import { format, isValid, parseISO } from "date-fns";
import { useTranslation } from "@/hooks/useTranslation";

const CalendarIcon = BaseCalendarIcon as React.FC<
  React.ComponentProps<typeof BaseCalendarIcon>
>;
const XMarkIcon = BaseXMarkIcon as React.FC<
  React.ComponentProps<typeof BaseXMarkIcon>
>;

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
  console.log("=== safeParseDateString ENTRY ===", {
    value,
    type: value instanceof Date ? "Date" : typeof value,
    timestamp: new Date().toISOString(),
  });

  if (!value) return "";

  try {
    // If it's already in DD.MM.YYYY format, return as is
    if (typeof value === "string" && value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
      console.log("Found DD.MM.YYYY format, returning as is:", value);
      return value;
    }

    // If it's a Date object
    if (value instanceof Date) {
      if (!isValid(value)) {
        console.log("Invalid Date object:", value);
        return "";
      }
      const formatted = format(value, "dd.MM.yyyy");
      console.log("Formatted Date object:", formatted);
      return formatted;
    }

    // If it's a string in YYYY-MM-DD format
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsedDate = parseISO(value);
      if (!isValid(parsedDate)) {
        console.log("Invalid ISO date string:", value);
        return "";
      }
      const formatted = format(parsedDate, "dd.MM.yyyy");
      console.log("Formatted ISO date:", formatted);
      return formatted;
    }

    console.log("No valid format found for:", value);
    return "";
  } catch (error) {
    console.error("Error in safeParseDateString:", error);
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
      console.log("=== CustomDateInput useEffect ENTRY ===", {
        value,
        inputValue,
        isValidDate,
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        lastManualInput: inputState.current.lastManualInput,
        timestamp: new Date().toISOString(),
      });

      // Skip updates if user is typing manually
      if (inputState.current.isManualInput) {
        console.log("Skipping update due to manual input");
        return;
      }

      // Skip updates for specific calendar selection cases
      if (inputState.current.isCalendarSelection && inputValue && isValidDate) {
        console.log(
          "Skipping update due to calendar selection with valid date"
        );
        return;
      }

      if (
        inputState.current.isCalendarSelection &&
        !value &&
        inputValue &&
        isValidDate
      ) {
        console.log("Skipping update due to calendar selection with no value");
        return;
      }

      // Format and set the input value if it has changed
      const formattedValue = safeParseDateString(value);
      console.log("Parsed formatted value:", formattedValue);

      if (formattedValue && formattedValue !== inputValue) {
        console.log("Setting new input value:", formattedValue);
        setInputValue(formattedValue);
        inputState.current.lastManualInput = formattedValue;
        setIsValidDate(true);
      }

      inputState.current.isInitialMount = false;

      console.log("=== CustomDateInput useEffect EXIT ===", {
        value,
        formattedValue: safeParseDateString(value),
        inputValue,
        newInputValue: formattedValue,
        isValidDate,
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        lastManualInput: inputState.current.lastManualInput,
        timestamp: new Date().toISOString(),
      });
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
      } else if (isComplete) {
        const [day, month, yearStr] = formattedValue.split(".").map(Number);
        const year =
          yearStr < 100
            ? yearStr >= 30
              ? 1900 + yearStr
              : 2000 + yearStr
            : yearStr;

        // Create a Date object and convert to ISO string
        const dateObj = new Date(year, month - 1, day);
        if (isValid(dateObj)) {
          eventValue = dateObj.toISOString();
        }
      }

      // Always trigger onChange with the current value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: eventValue },
      };
      onChange?.(syntheticEvent);

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
      console.log("=== handleCalendarClick ENTRY ===", {
        inputValue,
        isValidDate,
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        lastManualInput: inputState.current.lastManualInput,
        timestamp: new Date().toISOString(),
      });

      e.preventDefault();
      e.stopPropagation();

      // Set calendar selection flag
      inputState.current.isCalendarSelection = true;
      inputState.current.isManualInput = false;

      // Store the current input value before any changes
      const currentValue = inputValue;

      // If we have a valid date in the input, convert it to a Date object
      if (currentValue && isValidDate) {
        const [day, month, yearStr] = currentValue.split(".").map(Number);
        let year = yearStr;
        if (yearStr < 100) {
          year = yearStr >= 30 ? 1900 + yearStr : 2000 + yearStr;
          console.log("Year conversion in calendar click:", {
            yearStr,
            year,
            resultingDate: new Date(year, month - 1, day),
          });
        }
        const dateObj = new Date(year, month - 1, day);

        console.log("Calendar date conversion:", {
          inputValue: currentValue,
          day,
          month,
          yearStr,
          year,
          dateObj,
          isValid: isValid(dateObj),
        });

        if (isValid(dateObj)) {
          const isoString = dateObj.toISOString();
          console.log("Triggering onChange with ISO string:", isoString);

          // Store the current input value
          inputState.current.lastManualInput = currentValue;

          // Create and dispatch the change event
          const syntheticEvent = {
            target: { value: isoString },
          } as React.ChangeEvent<HTMLInputElement>;

          // First trigger the onChange
          onChange?.(syntheticEvent);

          // Then open the calendar
          if (onClick && !disabled) {
            console.log("Calling onClick handler with date:", isoString);
            onClick();
          }

          return;
        }
      }

      // If no valid date, just open the calendar
      if (onClick && !disabled) {
        console.log("Calling onClick handler without date");
        onClick();
      }

      console.log("=== handleCalendarClick EXIT ===", {
        inputValue: currentValue,
        isValidDate,
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        timestamp: new Date().toISOString(),
      });
    };

    const handleClear = () => {
      console.log("=== handleClear ENTRY ===", {
        currentValue: inputValue,
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        lastManualInput: inputState.current.lastManualInput,
        timestamp: new Date().toISOString(),
      });

      // Reset all states
      inputState.current.isManualInput = true;
      setInputValue("");
      setIsValidDate(true);
      setErrorMessage("");
      inputState.current.lastManualInput = "";
      inputState.current.previousLength = 0;

      if (onClear) {
        console.log("Calling onClear handler");
        onClear();
      } else {
        console.log("Triggering onChange with empty value");
        const syntheticEvent = {
          target: { value: "" },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(syntheticEvent);
      }

      console.log("=== handleClear EXIT ===", {
        newValue: "",
        isManualInput: inputState.current.isManualInput,
        isCalendarSelection: inputState.current.isCalendarSelection,
        lastManualInput: inputState.current.lastManualInput,
        timestamp: new Date().toISOString(),
      });
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
