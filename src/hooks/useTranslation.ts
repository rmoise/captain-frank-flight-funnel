import { useParams } from 'next/navigation';
import { getTranslation } from '@/translations';
import { DEFAULT_LANGUAGE, isValidLanguage } from '@/config/language';

export const useTranslation = () => {
  // Call useParams at the top level
  const params = useParams();

  // Extract and validate language
  const langParam = params?.lang;
  const currentLang =
    typeof langParam === 'string' && isValidLanguage(langParam)
      ? langParam
      : DEFAULT_LANGUAGE;

  // Get translations for current language
  const translations = getTranslation(currentLang);

  return {
    t: translations,
    lang: currentLang,
  };
};
