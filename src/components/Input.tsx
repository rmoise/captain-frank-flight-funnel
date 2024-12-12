import React from 'react';

interface InputProps {
  label: string;
  focusedLabel?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isFocused?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  focusedLabel,
  value,
  onChange,
  onFocus,
  onBlur,
  isFocused = false,
}) => {
  const inputContainerClasses = `
    relative w-full lg:w-[267px] h-14
  `;

  const inputClasses = `
    w-full h-14 px-4 pt-5 pb-2
    text-[#4b616d] text-xl lg:text-[28px] font-medium font-['Heebo'] tracking-tight
    bg-[#eceef1] rounded-xl
    border border-[#e0e1e4]
    transition-all duration-200
    ${isFocused ? 'border-[#464646] border-2' : ''}
    focus:outline-none
  `;

  const labelClasses = `
    absolute left-4
    transition-all duration-200 pointer-events-none
    text-[#909090] font-['Heebo']
    ${isFocused || value ? 'top-2 text-[10px]' : 'top-4 text-base'}
    ${isFocused ? 'text-[#464646]' : ''}
  `;

  return (
    <div className={inputContainerClasses}>
      <label className={labelClasses}>
        {isFocused ? focusedLabel || label : label}
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        className={inputClasses}
        placeholder=""
      />
    </div>
  );
}; 