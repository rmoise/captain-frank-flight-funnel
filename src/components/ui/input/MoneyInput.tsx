import React, { useRef, useState, useEffect } from "react";
import { MoneyInputControls } from "./MoneyInputControls";

interface MoneyInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export const MoneyInput: React.FC<MoneyInputProps> = ({
  label,
  value,
  onChange,
  onFocus,
  onBlur,
  isFocused,
  placeholder = "",
  className = "",
  required = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isFocusedInternal, setIsFocusedInternal] = useState(isFocused);

  // Sync local value with prop value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Sync focused state with prop
  useEffect(() => {
    setIsFocusedInternal(isFocused);
    if (isFocused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    // Only allow numbers and a single decimal point
    if (/^[0-9]*\.?[0-9]*$/.test(newValue) || newValue === "") {
      setLocalValue(newValue);
      onChange(newValue);
    }
  };

  const handleInputFocus = () => {
    setIsFocusedInternal(true);
    onFocus?.();
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocusedInternal(false);
    onBlur?.();

    // Format the value on blur
    let formattedValue = localValue;

    // If there's a value, ensure it has 2 decimal places
    if (formattedValue && !formattedValue.includes(".")) {
      formattedValue = `${formattedValue}.00`;
    } else if (formattedValue && formattedValue.includes(".")) {
      const parts = formattedValue.split(".");
      if (parts[1].length === 0) {
        formattedValue = `${parts[0]}.00`;
      } else if (parts[1].length === 1) {
        formattedValue = `${parts[0]}.${parts[1]}0`;
      }
    }

    setLocalValue(formattedValue);
    onChange(formattedValue);
  };

  // Using a simpler approach with fixed positioning
  return (
    <div className={`relative ${className}`}>
      <div className="relative w-full h-16">
        {/* Label */}
        <label
          htmlFor="money-input"
          className={`absolute left-4 transition-all duration-200 pointer-events-none z-10 ${
            isFocusedInternal || localValue
              ? "text-xs text-gray-500"
              : "text-sm text-gray-400"
          }`}
          style={{
            top: isFocusedInternal || localValue ? "8px" : "50%",
            transform:
              isFocusedInternal || localValue ? "none" : "translateY(-50%)",
          }}
        >
          {label}
        </label>

        {/* Euro symbol - fixed position regardless of input state */}
        <div
          className="absolute left-4 text-gray-500 pointer-events-none z-10"
          style={{
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          €
        </div>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          id="money-input"
          value={localValue}
          onChange={handleChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          className={`w-full h-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isFocusedInternal ? "border-blue-500" : "border-gray-300"
          }`}
          style={{
            paddingLeft: "2rem",
            paddingRight: "6rem",
            // Fixed text position that doesn't move regardless of state
            paddingTop: "0px",
            paddingBottom: "0px",
            // Position text in exact center, with fixed offset when label is shown
            position: "absolute",
            top: "0",
            left: "0",
            // Ensures text is always vertically centered regardless of state
            display: "flex",
            alignItems: "center",
            fontSize: "1rem",
            // Label offset - only applied when label is shown
            textIndent: "8px",
          }}
        />

        {/* Controls - fixed position */}
        <div className="absolute right-4 h-full flex items-center">
          <MoneyInputControls
            value={localValue}
            onChange={(newValue) => {
              if (newValue === "") {
                setLocalValue("");
                onChange("");
              } else if (newValue === "+") {
                const currentValue = parseFloat(localValue || "0");
                const newVal = (currentValue + 1).toString();
                setLocalValue(newVal);
                onChange(newVal);
              } else if (newValue === "-") {
                const currentValue = parseFloat(localValue || "0");
                const newVal = Math.max(0, currentValue - 1).toString();
                setLocalValue(newVal);
                onChange(newVal);
              } else {
                setLocalValue(newValue);
                onChange(newValue);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
