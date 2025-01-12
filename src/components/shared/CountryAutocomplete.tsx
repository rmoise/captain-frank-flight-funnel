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
  const lastValidValueRef = useRef<string | null>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const filteredOptions = searchTerm
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Update searchTerm when selectedOption changes
  useEffect(() => {
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
      lastValidValueRef.current = selectedOption.label;
    }
  }, [selectedOption]);

  // Update dropdown position when open
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
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

  // Handle browser autofill
  useEffect(() => {
    const checkAutofill = () => {
      if (inputRef.current?.value && !selectedOption) {
        const autofillValue = inputRef.current.value;

        // Try to match by label first (case insensitive)
        let matchingOption = options.find(
          (opt) => opt.label.toLowerCase() === autofillValue.toLowerCase()
        );

        // If no match found, try country codes
        if (!matchingOption) {
          const countryMappings: Record<string, string> = {
            germany: 'DEU',
            deutschland: 'DEU',
            austria: 'AUT',
            österreich: 'AUT',
          };

          const countryCode = countryMappings[autofillValue.toLowerCase()];
          if (countryCode) {
            matchingOption = options.find((opt) => opt.value === countryCode);
          }
        }

        if (matchingOption && onChange) {
          onChange(matchingOption.value);
        }
      }
    };

    // Check a few times to catch the autofill
    const timeoutIds = [
      setTimeout(checkAutofill, 100),
      setTimeout(checkAutofill, 500),
    ];

    return () => timeoutIds.forEach((id) => clearTimeout(id));
  }, [options, onChange, selectedOption]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      const isClickingInput = containerRef.current?.contains(target);
      const dropdownElement = document.getElementById('country-dropdown');
      const isClickingDropdown = dropdownElement?.contains(target);

      if (!isClickingDropdown && !isClickingInput) {
        setIsOpen(false);

        // If we have a value in the input, try to preserve it
        const currentValue = inputRef.current?.value;
        if (currentValue) {
          // Try to find a match for the current value
          const matchingOption = options.find(
            (opt) => opt.label.toLowerCase() === currentValue.toLowerCase()
          );

          if (matchingOption) {
            // If we found a match, use it
            setSearchTerm(matchingOption.label);
            lastValidValueRef.current = matchingOption.label;
            if (onChange) onChange(matchingOption.value);
          } else if (selectedOption) {
            // If no match but we have a selected option, restore it
            setSearchTerm(selectedOption.label);
            lastValidValueRef.current = selectedOption.label;
          } else if (lastValidValueRef.current) {
            // If we have a last valid value, restore it
            setSearchTerm(lastValidValueRef.current);
            const lastValidOption = options.find(
              (opt) => opt.label === lastValidValueRef.current
            );
            if (lastValidOption && onChange) {
              onChange(lastValidOption.value);
            }
          }
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, options, onChange, selectedOption]);

  const handleSelect = (optionValue: string) => {
    const selected = options.find((opt) => opt.value === optionValue);
    if (selected) {
      // Update the input value and state
      if (inputRef.current) {
        inputRef.current.value = selected.label;
      }
      setSearchTerm(selected.label);
      lastValidValueRef.current = selected.label;
      if (onChange) {
        onChange(selected.value);
      }
    }
    setIsOpen(false);
    setIsTouched(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    setIsTouched(true);

    // English to German name mappings for validation
    const countryMappings: Record<string, string> = {
      germany: 'deutschland',
      austria: 'österreich',
      switzerland: 'schweiz',
      france: 'frankreich',
      italy: 'italien',
      spain: 'spanien',
      netherlands: 'niederlande',
      belgium: 'belgien',
      denmark: 'dänemark',
      poland: 'polen',
      sweden: 'schweden',
      norway: 'norwegen',
      finland: 'finnland',
      greece: 'griechenland',
      portugal: 'portugal',
      ireland: 'irland',
      'united kingdom': 'großbritannien',
      'czech republic': 'tschechien',
      hungary: 'ungarn',
      croatia: 'kroatien',
      slovakia: 'slowakei',
      slovenia: 'slowenien',
      romania: 'rumänien',
      bulgaria: 'bulgarien',
      'united states': 'vereinigte staaten',
      canada: 'kanada',
      japan: 'japan',
      china: 'china',
      australia: 'australien',
      russia: 'russland',
      brazil: 'brasilien',
      india: 'indien',
      mexico: 'mexiko',
      'south africa': 'südafrika',
      egypt: 'ägypten',
    };

    const normalizedInput = newValue.toLowerCase().trim();
    const germanName = countryMappings[normalizedInput] || normalizedInput;

    // Try to find an exact match in either language
    const exactMatch = options.find(
      (opt) =>
        opt.label.toLowerCase() === normalizedInput ||
        opt.label.toLowerCase() === germanName
    );

    if (exactMatch && onChange) {
      onChange(exactMatch.value);
      lastValidValueRef.current = exactMatch.label;
    } else if (onChange && value) {
      // Only clear if we have a value and the input is empty
      if (!newValue.trim()) {
        onChange('');
        lastValidValueRef.current = null;
      }
    }
  };

  const handleClear = () => {
    if (onChange) {
      onChange('');
    }
    setSearchTerm('');
    lastValidValueRef.current = null;
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const containerClassName = `
    relative w-full
    bg-white rounded-xl
    transition-all duration-[250ms] ease-in-out
    ${
      isOpen
        ? 'border-2 border-blue-500'
        : error && isTouched
          ? 'border border-[#F54538]'
          : 'border border-[#e0e1e4] hover:border-blue-500'
    }
    focus-within:outline-none
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
              data-value={option.value}
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
    <div className="relative w-full" ref={containerRef}>
      <div
        className={containerClassName}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          className="w-full h-14 px-4 text-left
            text-[#4B616D] text-base font-medium
            focus:outline-none rounded-xl
            ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          "
          style={{
            outline: 'none',
            boxShadow: 'none',
            border: 'none',
            background: 'transparent',
          }}
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
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {value && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 pointer-events-auto hover:bg-gray-100 rounded-full transition-colors"
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
