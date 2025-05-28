// Language configuration
export const locales = ["de", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "de";

export function isValidLocale(locale: string | undefined): locale is Locale {
  return !!locale && locales.includes(locale as Locale);
}

// Language display names (for UI)
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
};

// Language regions for locale-specific formatting
export const localeRegions: Record<Locale, string> = {
  en: "en-US",
  de: "de-DE",
};
