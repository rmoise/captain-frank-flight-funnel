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
import type { ConsentType } from "@/types/shared/forms";

interface CheckboxClientProps {
  id?: string;
  label: string;
  type: ConsentType;
  required?: boolean;
  details?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  termsUrl: {
    en: string;
    de: string;
  };
  privacyUrl: {
    en: string;
    de: string;
  };
}

export function CheckboxClient({
  id,
  label,
  type,
  required = false,
  details,
  checked = false,
  onChange,
  termsUrl,
  privacyUrl,
}: CheckboxClientProps) {
  const { t, lang } = useTranslation();
  const { user, navigation, validation, actions } = useStore();
  const { consents } = user;
  const { currentPhase } = navigation;
  const { updateConsents } = actions.user;

  // Get the current checked state based on type
  const isChecked =
    checked ||
    (type === "terms"
      ? consents.terms
      : type === "privacy"
      ? consents.privacy
      : consents.marketing);

  // Get the appropriate setter based on type
  const setChecked = (value: boolean) => {
    updateConsents({
      [type]: value,
    });
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const prevOverflowingRef = useRef<boolean | null>(null);

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
    const currentTermsUrl = termsUrl[lang as keyof typeof termsUrl];
    const currentPrivacyUrl = privacyUrl[lang as keyof typeof privacyUrl];

    return type === "terms" ? (
      <span>
        {lang === "en" ? "I have read and accept the " : "Ich habe die "}
        <a
          href={currentTermsUrl}
          onClick={handleLinkClick}
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
          href={currentPrivacyUrl}
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
          href={currentPrivacyUrl}
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
  }, [type, label, handleLinkClick, lang, termsUrl, privacyUrl]);

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
  const stepToValidate: ValidationPhase | null =
    currentPhase === ValidationPhase.INITIAL_ASSESSMENT
      ? ValidationPhase.INITIAL_ASSESSMENT
      : currentPhase === ValidationPhase.AGREEMENT
      ? ValidationPhase.AGREEMENT
      : null;
  const isValid = stepToValidate
    ? validation.stepValidation[stepToValidate] || false
    : true;
  const showError =
    required &&
    !isValid &&
    (type === "terms" || type === "privacy") &&
    isTouched;

  return (
    <div
      className={`relative rounded-lg border ${
        showError ? "border-red-500" : "border-gray-200"
      } p-4 cursor-pointer transition-colors duration-200 hover:bg-gray-50`}
      onClick={toggleAccordion}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-1 flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            handleChange(e);
          }}
        >
          <input
            type="checkbox"
            id={id}
            checked={isChecked}
            onChange={() => {}}
            className={`h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary ${
              showError ? "border-red-500" : ""
            }`}
          />
        </div>
        <div className="flex-grow">
          <div
            ref={textRef}
            className={`text-sm ${isExpanded ? "" : "line-clamp-2"} ${
              showError ? "text-red-500" : "text-gray-700"
            }`}
          >
            {formattedLabel}
          </div>
          {details && isExpanded && (
            <div className="mt-2 text-sm text-gray-500">{details}</div>
          )}
          {showError && (
            <p className="mt-1 text-sm text-red-500">This field is required</p>
          )}
        </div>
        {(isTextTruncated || details) && (
          <div className="flex-shrink-0">
            <ChevronUpIcon
              className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
                isExpanded ? "" : "rotate-180"
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
