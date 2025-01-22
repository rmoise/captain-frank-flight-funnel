import InitialAssessment from '@/app/phases/initial-assessment/page';
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
    title: t.phases.initialAssessment.title,
    description: t.phases.initialAssessment.description,
  };
}

export default function InitialAssessmentPage() {
  return <InitialAssessment />;
}
