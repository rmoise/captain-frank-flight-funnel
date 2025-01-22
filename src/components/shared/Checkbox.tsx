import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          type="checkbox"
          className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${className} ${
            error ? 'border-red-500' : ''
          }`}
          {...props}
        />
      </div>
      {label && (
        <div className="ml-3 text-sm">
          <label
            htmlFor={props.id}
            className={`font-medium ${error ? 'text-red-500' : 'text-gray-700'}`}
          >
            {label}
          </label>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
};
