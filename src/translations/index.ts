import { de } from "./de";
import { en } from "./en";
import type { Locale } from "@/config/language";
import type { Translations } from "./types";

export const translations: Record<Locale, Translations> = {
  de,
  en,
} as const;

export type TranslationType = typeof de;
export type TranslationKey = keyof TranslationType;

export const getTranslation = (lang: Locale): Translations =>
  translations[lang];

// Default to English translations if no language is provided
export const getTranslations = (lang?: Locale): Translations => {
  return translations[lang || "en"];
};
