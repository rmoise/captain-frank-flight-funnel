import type { Store } from "@/store/types";
import { navigationUtils } from "@/utils/navigation";

/**
 * Gets the language-aware URL based on the current language in the store
 * @param url The base URL to make language-aware
 * @returns The language-aware URL
 */
export const getLanguageAwareUrl = (url: string): string => {
  // Remove any leading slashes
  const cleanUrl = url.replace(/^\/+/, "");

  // Get the current language from navigation utilities
  const currentLanguage = navigationUtils.getCurrentLanguage() || "de";

  // Construct the language-aware URL
  return `/${currentLanguage}/${cleanUrl}`;
};
