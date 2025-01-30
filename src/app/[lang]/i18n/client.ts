import { useParams } from 'next/navigation';
import { getTranslations } from './translations';

export function useTranslation() {
  const params = useParams();
  const lang = (params?.lang as string) || 'de';
  const translations = getTranslations(lang);

  return {
    t: {
      flightSelector: {
        types: {
          direct: translations['flightSelector.types.direct'],
          multi: translations['flightSelector.types.multi'],
        },
      },
    },
    lang,
  };
}
