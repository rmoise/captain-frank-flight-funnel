"use client";

import React, {
  useState,
  useRef,
  useLayoutEffect,
  useMemo,
  useCallback,
} from "react";
import { ChevronUpIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import useStore from "@/store";
import { useTranslation } from "@/hooks/useTranslation";
import { ValidationPhase } from "@/types/shared/validation";

interface ConsentCheckboxProps {
  id?: string;
  label: string;
  type: "terms" | "privacy" | "marketing";
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
  const { t, lang } = useTranslation();
  const store = useStore();
  const {
    user: { consents },
    navigation: { currentPhase },
    actions: { user: userActions },
  } = store;

  // No local state for tracking checked status - use Zustand directly
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const prevOverflowingRef = useRef<boolean | null>(null);

  // Determine checked state from either props or store
  const isChecked =
    typeof checked !== "undefined"
      ? checked // If explicitly provided via props, use that
      : type === "terms"
      ? consents.terms
      : type === "privacy"
      ? consents.privacy
      : consents.marketing;

  // Create a memoized click handler
  const handleClick = useCallback(() => {
    console.log(
      `ConsentCheckbox(${type}): Click detected, current value: ${isChecked}`
    );

    setIsTouched(true);

    // Call parent onChange if provided
    if (onChange) {
      console.log(
        `ConsentCheckbox(${type}): Calling parent onChange with value: ${!isChecked}`
      );
      onChange(!isChecked);
    } else {
      // Otherwise update store directly
      console.log(
        `ConsentCheckbox(${type}): Updating store directly with value: ${!isChecked}`
      );
      if (type === "terms") {
        userActions.updateConsents({ terms: !isChecked });
      } else if (type === "privacy") {
        userActions.updateConsents({ privacy: !isChecked });
      } else {
        userActions.updateConsents({ marketing: !isChecked });
      }
    }

    console.log(`ConsentCheckbox(${type}): State update completed`);
  }, [isChecked, onChange, type, userActions]);

  // Handle click on the link
  const handleLinkClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget instanceof HTMLAnchorElement) {
      window.open(e.currentTarget.href, "_blank");
    }
  }, []);

  // Format the label to include the link for privacy type
  const formattedLabel = useMemo(() => {
    const termsUrl =
      lang === "en"
        ? "https://www.captain-frank.com/en/terms"
        : "https://www.captain-frank.com/de/agb";
    const privacyUrl =
      lang === "en"
        ? "https://www.captain-frank.com/en/privacy"
        : "https://www.captain-frank.com/de/datenschutz";

    return type === "terms" ? (
      <span>
        {lang === "en" ? "I have read and accept the " : "Ich habe die "}
        <a
          href={termsUrl}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(termsUrl, "_blank");
          }}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {lang === "en"
            ? "Terms and Conditions"
            : "Allgemeinen Geschäftsbedingungen"}
        </a>
        {lang === "en" ? "." : " gelesen und akzeptiere sie."}
      </span>
    ) : type === "privacy" ? (
      <span>
        {lang === "en" ? "I have read and accept the " : "Ich habe die "}
        <a
          href={privacyUrl}
          onClick={handleLinkClick}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {lang === "en" ? "Privacy Policy" : "Datenschutzerklärung"}
        </a>
        {lang === "en" ? "." : " gelesen und akzeptiere sie."}
      </span>
    ) : type === "marketing" ? (
      <span>
        {lang === "en"
          ? "I agree that Captain Frank can send me advertisements about services, promotions, and satisfaction surveys via email. Captain Frank processes my personal data for this purpose (see "
          : "Ich stimme zu, dass Captain Frank mir Werbung zu Dienstleistungen, Aktionen und Zufriedenheitsumfragen per E-Mail sendet. Captain Frank verarbeitet meine persönlichen Daten zu diesem Zweck (siehe "}
        <a
          href={privacyUrl}
          onClick={handleLinkClick}
          className="text-[#F54538] hover:text-[#E03F33] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          {lang === "en" ? "Privacy Policy" : "Datenschutzbestimmungen"}
        </a>
        {lang === "en"
          ? "). I can revoke this consent at any time."
          : "). Ich kann diese Einwilligung jederzeit widerrufen."}
      </span>
    ) : (
      label
    );
  }, [type, label, handleLinkClick, lang]);

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
    window.addEventListener("resize", checkTruncation);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkTruncation);
    };
  }, [formattedLabel]);

  const toggleAccordion = (e: React.MouseEvent) => {
    // Only toggle if we have truncated text or details to show
    if (isTextTruncated || details) {
      // Check if the click is on or near the checkbox
      const target = e.target as HTMLElement;
      const isCheckboxClick = target.closest(
        `[data-testid="${type}-checkbox"]`
      );

      // Don't toggle if the click was on the checkbox
      if (!isCheckboxClick) {
        setIsExpanded(!isExpanded);
      }
    }
  };

  // Get validation state based on current phase
  const stepToValidate: ValidationPhase | null =
    currentPhase === ValidationPhase.INITIAL_ASSESSMENT
      ? ValidationPhase.INITIAL_ASSESSMENT
      : currentPhase === ValidationPhase.AGREEMENT
      ? ValidationPhase.AGREEMENT
      : null;
  const isValid = stepToValidate
    ? store.validation.stepValidation[stepToValidate] || false
    : true;
  const showError =
    required &&
    !isValid &&
    (type === "terms" || type === "privacy") &&
    isTouched;

  return (
    <div
      id={id}
      className={`flex flex-col bg-white rounded-xl border transition-colors hover:bg-gray-50 ${
        showError ? "border-[#F54538]" : "border-[#e0e1e4]"
      }`}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer"
        onClick={toggleAccordion}
      >
        <div
          className={`
            flex-shrink-0 mt-0.5 w-4 h-4 rounded border transition-colors cursor-pointer
            ${
              isChecked
                ? "bg-[#F54538] border-[#F54538]"
                : showError
                ? "border-[#F54538] hover:border-[#F54538]"
                : "border-zinc-300 hover:border-[#F54538]"
            }
          `}
          data-testid={`${type}-checkbox`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            // Completely stop event propagation
            e.preventDefault();
            e.stopPropagation();
            handleClick();
          }}
          role="checkbox"
          aria-checked={isChecked}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              handleClick();
            }
          }}
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
        <div className="flex-1 min-w-0 text-sm text-[#4b616d] font-heebo">
          <div className="flex items-start gap-2 w-full">
            <div
              ref={textRef}
              className={`flex-1 min-w-0 break-words ${
                !isExpanded ? "line-clamp-2" : ""
              }`}
            >
              <div className="inline-block max-w-full">
                {formattedLabel}
                {required && <span className="text-[#F54538] ml-0.5">*</span>}
              </div>
            </div>
            {(isTextTruncated || details) && (
              <div className="flex-shrink-0 mt-0.5">
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                </motion.div>
              </div>
            )}
          </div>
          {isExpanded && details && (
            <div className="mt-2 pl-7">
              <div className="text-sm text-gray-600 bg-gray-50 p-4 rounded-md">
                <motion.div
                  initial={false}
                  animate={{
                    height: isExpanded ? "auto" : 0,
                    opacity: isExpanded ? 1 : 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeInOut",
                    height: {
                      type: "spring",
                      damping: 15,
                      stiffness: 100,
                    },
                  }}
                >
                  <div
                    className="prose prose-sm max-w-none"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    {details}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
          {showError && (
            <div className="text-red-600 text-sm">
              {t("common.required", "This field is required")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
