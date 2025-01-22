import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div>
      {label && (
        <label
          htmlFor={props.id}
          className={`block text-sm font-medium ${
            error ? 'text-red-500' : 'text-gray-700'
          }`}
        >
          {label}
        </label>
      )}
      <div className="mt-1">
        <input
          className={`block w-full rounded-md shadow-sm ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary focus:ring-primary'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
};
