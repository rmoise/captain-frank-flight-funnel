type Translations = Record<string, string>;

const translations: Record<string, Translations> = {
  de: {
    // Add German translations here
  },
  en: {
    // Add English translations here
  },
};

export function getTranslations(lang: string): Translations {
  return translations[lang] || translations.de;
}
