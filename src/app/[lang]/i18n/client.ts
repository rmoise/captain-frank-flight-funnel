import { useParams } from 'next/navigation';
import { getTranslations } from './translations';

export function useTranslation() {
  const params = useParams();
  const lang = (params?.lang as string) || 'de';
  const translations = getTranslations(lang);

  return {
    t: (key: string) => translations[key] || key,
    lang,
  };
}
