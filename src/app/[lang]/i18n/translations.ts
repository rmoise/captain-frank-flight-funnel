type Translations = Record<string, string>;

const translations: Record<string, Translations> = {
  de: {
    'flightSelector.types.direct': 'Direktflug',
    'flightSelector.types.multi': 'Mehrere Flüge',
    // Add German translations here
  },
  en: {
    'flightSelector.types.direct': 'Direct Flight',
    'flightSelector.types.multi': 'Multiple Flights',
    // Add English translations here
  },
};

export function getTranslations(lang: string): Translations {
  return translations[lang] || translations.de;
}
