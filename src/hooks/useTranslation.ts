import { useParams } from "next/navigation";
import { getTranslation } from "@/translations";
import { defaultLocale, isValidLocale } from "@/config/language";
import { useCallback } from "react";

// Helper function to access nested properties using dot notation
// e.g., getNestedValue({ a: { b: 'Hello' } }, 'a.b') => 'Hello'
// Also handles numeric keys in objects
const getNestedValue = (obj: any, key: string): string | undefined => {
  if (!obj || !key) return undefined;

  return key.split(".").reduce((o, k) => {
    // Handle the case where o is undefined or null
    if (o === undefined || o === null) return undefined;

    // Handle both string and numeric keys
    return o[k];
  }, obj);
};

export const useTranslation = () => {
  // Call useParams at the top level
  const params = useParams();

  // Validate and get the language
  const langParam = params?.lang;
  const lang =
    typeof langParam === "string" && isValidLocale(langParam)
      ? langParam
      : defaultLocale;

  // Get translations object for the language
  const translationsObject = getTranslation(lang);

  // Create the translation function 't'
  const t = useCallback(
    (key: string, fallback?: string): string => {
      const value = getNestedValue(translationsObject, key);
      return value !== undefined
        ? String(value)
        : fallback !== undefined
        ? fallback
        : key;
    },
    [translationsObject] // Recreate t if the translations object changes
  );

  return {
    t, // Return the function
    lang,
    translationsObject, // Expose the full translations object for direct access
  };
};
