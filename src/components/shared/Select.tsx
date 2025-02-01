'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  id?: string;
  name?: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  error,
  options,
  disabled,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      setDropdownPosition({
        top: rect.bottom + scrollY + 4,
        left: rect.left + scrollX,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      const isClickingInput = containerRef.current?.contains(target);
      const dropdownElement = document.getElementById('select-dropdown');
      const isClickingDropdown = dropdownElement?.contains(target);

      if (!isClickingDropdown && !isClickingInput) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setIsTouched(true);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
    setIsTouched(true);
  };

  const containerClassName = `
    relative w-full h-14
    bg-white rounded-xl
    transition-all duration-[250ms] ease-in-out
    ${
      isOpen
        ? 'border-2 border-blue-500'
        : error && isTouched
          ? 'border border-[#F54538]'
          : 'border border-gray-300 hover:border-blue-500'
    }
  `;

  const labelClassName = `
    absolute left-4
    transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1)
    pointer-events-none select-none
    text-[#9BA3AF] font-heebo bg-white px-1
    ${
      value || isOpen
        ? '-translate-y-[8px] text-[10px] z-10'
        : 'translate-y-[14px] text-base'
    }
    ${isOpen ? 'text-[#464646]' : ''}
  `;

  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdownStyle = {
      position: 'absolute',
      top: `${dropdownPosition.top}px`,
      left: `${dropdownPosition.left}px`,
      width: `${dropdownPosition.width}px`,
      maxHeight: '240px',
      zIndex: 99999,
    } as const;

    return createPortal(
      <div
        id="select-dropdown"
        className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto"
        style={dropdownStyle}
      >
        <ul className="py-2" role="listbox" aria-label={label}>
          {options.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(option.value);
              }}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
            >
              <div className="text-[14px] font-normal text-gray-900">
                {option.label}
              </div>
              {option.description && (
                <div className="text-[12px] text-gray-500">
                  {option.description}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className={containerClassName} onClick={handleClick}>
        <button
          type="button"
          className={`
            w-full h-full px-4 text-left
            text-[#4B616D] text-base font-medium
            focus:outline-none
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          `}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-describedby={error && isTouched ? `${label}-error` : undefined}
        >
          {selectedOption?.label || ''}
        </button>
        {label && (
          <label className={labelClassName}>
            {label}
            {required && (
              <span className="text-[#F54538] ml-0.5 text-[10px] align-super">
                *
              </span>
            )}
          </label>
        )}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <ChevronDownIcon
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
      {renderDropdown()}
      {error && isTouched && (
        <p
          className="mt-2 text-sm text-red-600"
          id={`${label}-error`}
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
};
