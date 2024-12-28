import React from 'react';
import clsx from 'clsx';

interface RadioOption {
  id: string;
  value: string;
  label: string;
  showConfetti?: boolean;
  showCheck?: boolean;
  externalLink?: string;
  openInNewTab?: boolean;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  required?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  label,
  error,
  required,
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="space-y-3">
        {options.map((option) => (
          <div key={option.value}>
            <label
              className={clsx(
                'flex items-center w-full p-3 rounded-lg border cursor-pointer transition-all duration-200',
                value === option.value
                  ? 'border-[#F54538] bg-[#FEF2F2]'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              )}
              onClick={() => {
                if (option.externalLink) {
                  window.open(
                    option.externalLink,
                    option.openInNewTab ? '_blank' : '_self'
                  );
                  return;
                }
                onChange(option.value);
              }}
            >
              <input
                type="radio"
                name={option.id}
                value={option.value}
                checked={value === option.value}
                onChange={() => {
                  if (!option.externalLink) {
                    onChange(option.value);
                  }
                }}
                className="w-4 h-4 border-gray-300 text-[#F54538] focus:ring-[#F54538] focus:ring-offset-0 accent-[#F54538]"
              />
              <span className="ml-3 text-base text-gray-900">
                {option.label}
              </span>
            </label>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
