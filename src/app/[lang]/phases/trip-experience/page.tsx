import TripExperience from '@/app/phases/trip-experience/page';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { getTranslation } from '@/translations';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = isValidLanguage(params.lang) ? params.lang : 'de';
  const t = getTranslation(lang);

  return {
    title: t.phases.tripExperience.title,
    description: t.phases.tripExperience.description,
  };
}

export default function TripExperiencePage() {
  return <TripExperience />;
}
