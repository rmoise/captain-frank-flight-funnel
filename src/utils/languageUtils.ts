import useStore from "@/store";

/**
 * Prepends the language code to a URL path
 * @param url - The URL path to make language-aware
 * @param language - The language code (defaults to "de")
 * @returns The language-aware URL path
 */
export const getLanguageAwareUrl = (
  url: string,
  language: string = "de"
): string => {
  return `/${language}${url}`;
};

export type LanguageUtils = {
  getLanguageAwareUrl: typeof getLanguageAwareUrl;
};

export default {
  getLanguageAwareUrl,
} as LanguageUtils;
