import { de } from './de';
import { en } from './en';
import type { SupportedLanguage } from '@/config/language';
import type { Translations } from './types';

export const translations: Record<SupportedLanguage, Translations> = {
  de,
  en,
} as const;

export type TranslationType = typeof de;
export type TranslationKey = keyof TranslationType;

export const getTranslation = (lang: SupportedLanguage): Translations =>
  translations[lang];
