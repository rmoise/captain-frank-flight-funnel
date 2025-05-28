import React from "react";

interface Option {
  value: string;
  label: string;
}

interface DropdownInputProps {
  label: string;
  focusedLabel?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
}

export const DropdownInput: React.FC<DropdownInputProps> = ({
  label,
  focusedLabel,
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  isFocused = false,
}) => {
  const containerClasses = `
    relative w-full lg:w-[267px] h-14
  `;

  const selectClasses = `
    w-full h-14 px-4 pt-5 pb-2
    text-[#4b616d] text-xl lg:text-[28px] font-medium font-['Heebo'] tracking-tight
    bg-[#eceef1] rounded-xl
    border border-[#e0e1e4]
    transition-all duration-200
    ${isFocused ? "border-blue-500 border-2" : ""}
    focus:outline-none
    appearance-none
  `;

  const labelClasses = `
    absolute left-4
    transition-all duration-200 pointer-events-none
    text-[#909090] font-['Heebo']
    ${isFocused || value ? "top-2 text-[10px]" : "top-4 text-base"}
    ${isFocused ? "text-[#464646]" : ""}
  `;

  return (
    <div className={containerClasses}>
      <label className={labelClasses}>
        {isFocused ? focusedLabel || label : label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={selectClasses}
      >
        <option value="" disabled>
          Select an option
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          width="12"
          height="8"
          viewBox="0 0 12 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 1.5L6 6.5L11 1.5"
            stroke="#909090"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
