'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface CountryOption {
  value: string;
  label: string;
}

interface CountryAutocompleteProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: CountryOption[];
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export const CountryAutocomplete: React.FC<CountryAutocompleteProps> = ({
  label,
  value,
  onChange,
  error,
  options,
  disabled = false,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTouched, setIsTouched] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = searchTerm
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

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
      const dropdownElement = document.getElementById('country-dropdown');
      const isClickingDropdown = dropdownElement?.contains(target);

      if (!isClickingDropdown && !isClickingInput) {
        setIsOpen(false);
        setSearchTerm('');
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
    setSearchTerm('');
    setIsTouched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setIsOpen(true);
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
    setSearchTerm('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const containerClassName = `
    relative w-full h-14
    bg-white rounded-xl outline-none
    transition-all duration-[250ms] ease-in-out
    ${
      isOpen
        ? 'border-2 border-blue-500'
        : error && isTouched
          ? 'border border-[#F54538]'
          : 'border border-[#e0e1e4] hover:border-blue-500'
    }
  `;

  const labelClassName = `
    absolute left-4
    transition-all duration-[200ms] cubic-bezier(0.4, 0, 0.2, 1)
    pointer-events-none select-none
    text-[#9BA3AF] font-heebo bg-white px-1
    ${
      value || isOpen || searchTerm
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
        id="country-dropdown"
        className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-auto"
        style={dropdownStyle}
      >
        <ul className="py-2" role="listbox" aria-label={label}>
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onClick={() => handleSelect(option.value)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-100"
            >
              <div className="text-[14px] font-normal text-gray-900">
                {option.label}
              </div>
            </li>
          ))}
          {filteredOptions.length === 0 && (
            <li className="px-4 py-2 text-gray-500">
              Keine Ergebnisse gefunden
            </li>
          )}
        </ul>
      </div>,
      document.body
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={containerClassName}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          value={searchTerm || selectedOption?.label || ''}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full h-full px-4 text-left
    text-[#4B616D] text-base font-medium
    focus:outline-none
    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
  "
          style={{ outline: 'none', boxShadow: 'none' }}
          placeholder=""
          disabled={disabled}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls="country-dropdown"
          aria-haspopup="listbox"
          aria-describedby={error && isTouched ? `${label}-error` : undefined}
          onClick={(e) => e.stopPropagation()}
        />
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
          {value && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 pointer-events-auto"
              type="button"
              aria-label="Clear selection"
            >
              <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-[#F54538] transition-colors" />
            </button>
          )}
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
