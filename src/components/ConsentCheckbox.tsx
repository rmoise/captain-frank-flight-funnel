import React, { useState } from 'react';

interface ConsentCheckboxProps {
  text: string;
  linkText: string;
  link: string;
  onChange?: (checked: boolean) => void;
  required?: boolean;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  text,
  linkText,
  link,
  onChange,
  required = false,
}) => {
  const [isChecked, setIsChecked] = useState(false);

  const handleChange = () => {
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  return (
    <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-[#e0e1e4] transition-colors hover:bg-gray-50">
      <div
        className={`
          mt-1 w-4 h-4 rounded border transition-colors cursor-pointer
          ${isChecked
            ? 'bg-[#F54538] border-[#F54538]'
            : 'border-zinc-300 hover:border-[#F54538]'
          }
        `}
        onClick={handleChange}
      >
        {isChecked && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-4 h-4 text-white"
          >
            <path
              d="M20 6L9 17L4 12"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      <div className="flex-1 text-sm text-[#4b616d] font-['Heebo']">
        <span>{text} </span>
        <a
          href={link}
          className="text-[#F54538] hover:text-[#E03F33] transition-colors underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {linkText}
        </a>
        <span> and agree to them{required && <span className="text-[#F54538] ml-0.5">*</span>}</span>
      </div>
    </div>
  );
};
