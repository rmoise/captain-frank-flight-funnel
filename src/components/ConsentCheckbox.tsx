'use client';

import React, {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
} from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/state/store';

interface ConsentCheckboxProps {
  id?: string;
  label: string;
  type: 'terms' | 'privacy' | 'marketing';
  required?: boolean;
  details?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  id,
  label,
  type,
  required = false,
  details,
  checked = false,
  onChange,
}) => {
  const {
    termsAccepted,
    privacyAccepted,
    marketingAccepted,
    setTermsAccepted,
    setPrivacyAccepted,
    setMarketingAccepted,
    validationState,
    currentPhase,
  } = useStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const prevOverflowingRef = useRef<boolean | null>(null);

  // Get the current checked state based on type
  const isChecked =
    checked ||
    (type === 'terms'
      ? termsAccepted
      : type === 'privacy'
        ? privacyAccepted
        : marketingAccepted);

  // Get the appropriate setter based on type
  const setChecked =
    type === 'terms'
      ? setTermsAccepted
      : type === 'privacy'
        ? setPrivacyAccepted
        : setMarketingAccepted;

  // Handle click on the link
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLAnchorElement) {
      window.open(e.currentTarget.href, '_blank');
    }
  }, []);

  // Format the label to include the link for privacy type
  const formattedLabel = useMemo(() => {
    return type === 'terms' ? (
      <span>
        Ich habe die{' '}
        <a
          href="https://www.captain-frank.com/de/agb"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open('https://www.captain-frank.com/de/agb', '_blank');
          }}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Allgemeinen Geschäftsbedingungen
        </a>{' '}
        gelesen und akzeptiere sie.
      </span>
    ) : type === 'privacy' ? (
      <span>
        Ich habe die{' '}
        <a
          href="https://www.captain-frank.com/de/datenschutz?_gl=1*12wr7bl*_gcl_au*OTQ3NDQyOTgzLjE3MzI3MjIzMDY.*_ga*NTUyNzkxNDY3LjE3MzI3MjIzMDY.*_ga_XZVF0Y8PLW*MTczNjM0MDk0MS4xMTUuMS4xNzM2MzQwOTU0LjAuMC4w"
          onClick={handleLinkClick}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Datenschutzerklärung
        </a>{' '}
        gelesen und akzeptiere sie.
      </span>
    ) : type === 'marketing' ? (
      <span>
        Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen,
        Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank
        verarbeitet meine persönlichen Daten zu diesem Zweck (siehe{' '}
        <a
          href="https://www.captain-frank.com/de/datenschutz?_gl=1*1o1nam*_gcl_au*OTQ3NDQyOTgzLjE3MzI3MjIzMDY.*_ga*NTUyNzkxNDY3LjE3MzI3MjIzMDY.*_ga_XZVF0Y8PLW*MTczNjM0MDk0MS4xMTUuMS4xNzM2MzQxMTU1LjAuMC4w"
          onClick={handleLinkClick}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Datenschutzbestimmungen
        </a>
        ). Ich kann diese Einwilligung jederzeit widerrufen.
      </span>
    ) : (
      label
    );
  }, [type, label, handleLinkClick]);

  // Use useLayoutEffect to check truncation before paint
  useLayoutEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        const isOverflowing =
          textRef.current.scrollHeight > textRef.current.clientHeight;

        // Only update if the value has changed
        if (prevOverflowingRef.current !== isOverflowing) {
          prevOverflowingRef.current = isOverflowing;
          setIsTextTruncated(isOverflowing);
        }
      }
    };

    // Run the check after a short delay to ensure content is rendered
    const timeoutId = setTimeout(checkTruncation, 0);

    // Add resize listener
    window.addEventListener('resize', checkTruncation);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', checkTruncation);
    };
  }, [formattedLabel]);

  const handleChange = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = !isChecked;
    setChecked(newValue);
    setIsTouched(true);
    if (onChange) {
      onChange(newValue);
    }
  };

  const toggleAccordion = () => {
    if (isTextTruncated || details) {
      setIsExpanded(!isExpanded);
    }
  };

  // Get validation state based on current phase
  const stepToValidate = currentPhase === 1 ? 4 : currentPhase === 6 ? 2 : null;
  const isValid = stepToValidate
    ? validationState[stepToValidate] || false
    : true;
  const showError =
    required &&
    !isValid &&
    (type === 'terms' || type === 'privacy') &&
    isTouched;

  return (
    <div
      id={id}
      className={`flex flex-col bg-white rounded-xl border transition-colors hover:bg-gray-50 ${
        showError ? 'border-[#F54538]' : 'border-[#e0e1e4]'
      }`}
    >
      <div
        className="flex items-start gap-4 p-4 cursor-pointer"
        onClick={toggleAccordion}
      >
        <div
          className={`
            mt-1 w-4 h-4 rounded border transition-colors cursor-pointer
            ${
              isChecked
                ? 'bg-[#F54538] border-[#F54538]'
                : showError
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
        <div className="flex-1 text-sm text-[#4b616d] font-heebo">
          <div className="flex items-start justify-between">
            <div
              ref={textRef}
              className={`flex-1 pr-4 ${!isExpanded ? 'line-clamp-2' : ''}`}
            >
              {formattedLabel}
              {required && <span className="text-[#F54538] ml-0.5">*</span>}
            </div>
            {(isTextTruncated || details) && (
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="ml-2 flex-shrink-0"
              >
                <ChevronUpIcon className="w-5 h-5 text-gray-400" />
              </motion.div>
            )}
          </div>
          {details && (
            <motion.div
              initial={false}
              animate={{
                height: isExpanded ? 'auto' : 0,
                opacity: isExpanded ? 1 : 0,
              }}
              transition={{
                duration: 0.3,
                ease: 'easeInOut',
                height: {
                  type: 'spring',
                  damping: 15,
                  stiffness: 200,
                },
              }}
              className="overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mt-2 text-sm text-[#4b616d] font-heebo">
                {details}
              </div>
            </motion.div>
          )}
          {showError && (
            <div className="text-[#F54538] text-xs mt-1">
              This checkbox is required
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
