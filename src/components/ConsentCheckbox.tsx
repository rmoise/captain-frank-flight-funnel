import React, { useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface ConsentCheckboxProps {
  text: string;
  linkText: string;
  link: string;
  onChange?: (checked: boolean) => void;
  required?: boolean;
  details?: string;
  error?: boolean;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  text,
  linkText,
  link,
  onChange,
  required = false,
  details,
  error = false,
}) => {
  const [isChecked, setIsChecked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !isChecked;
    setIsChecked(newValue);
    onChange?.(newValue);
  };

  const toggleAccordion = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className={`flex flex-col bg-white rounded-xl border transition-colors hover:bg-gray-50 ${error ? 'border-[#F54538]' : 'border-[#e0e1e4]'}`}>
      <div
        className={`flex items-start gap-4 p-4 ${
          !isExpanded ? 'max-h-[56px] overflow-hidden' : ''
        } ${details ? 'cursor-pointer' : ''}`}
        onClick={details ? toggleAccordion : undefined}
      >
        <div
          className={`
            mt-1 w-4 h-4 rounded border transition-colors cursor-pointer
            ${
              isChecked
                ? 'bg-[#F54538] border-[#F54538]'
                : error
                  ? 'border-[#F54538] hover:border-[#F54538]'
                  : 'border-zinc-300 hover:border-[#F54538]'
            }
          `}
          onClick={handleChange}
        >
          {isChecked && (
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-white">
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
          <div className="flex items-start justify-between">
            <div className={`flex-1 pr-4 ${!isExpanded ? 'line-clamp-1' : ''}`}>
              <span>{text} </span>
              <a
                href={link}
                className="text-[#F54538] hover:text-[#E03F33] transition-colors underline"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleLinkClick}
              >
                {linkText}
              </a>
              {required && <span className="text-[#F54538] ml-0.5">*</span>}
            </div>
            {details && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 flex-shrink-0"
              >
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              </motion.div>
            )}
          </div>
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? 'auto' : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {details && (
              <div className="mt-2 text-sm text-[#4b616d] font-['Heebo']">
                {details}
              </div>
            )}
          </motion.div>
          {error && (
            <div className="text-[#F54538] text-xs mt-1">
              This checkbox is required
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
