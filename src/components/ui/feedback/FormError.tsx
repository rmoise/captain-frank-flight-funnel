import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

interface FormErrorProps {
  errors?: string[];
  className?: string;
}

export default function FormError({ errors, className = '' }: FormErrorProps) {
  if (!errors || errors.length === 0) return null;

  return (
    <div className={`mt-1 ${className}`}>
      {errors.map((error, index) => (
        <div key={index} className="flex items-center text-sm text-red-600">
          <ExclamationCircleIcon className="w-4 h-4 mr-1 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ))}
    </div>
  );
}
