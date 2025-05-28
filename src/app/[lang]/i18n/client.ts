"use client";

import { useTranslations as useNextIntlTranslations } from "next-intl";

// Enhanced useTranslations hook that provides type safety and namespacing
export function useTranslations(namespace?: string) {
  // Use the built-in next-intl useTranslations hook
  const t = useNextIntlTranslations(namespace);

  // Return a properly typed translation function
  return {
    t,
    // Helper to access deeply nested translations
    translate: (key: string, params?: Record<string, string | number>) => {
      try {
        return t(key, params);
      } catch (error) {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    },
  };
}
