import InitialAssessment from '@/app/phases/initial-assessment/page';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { getTranslation } from '@/translations';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = isValidLanguage(resolvedParams.lang)
    ? resolvedParams.lang
    : 'de';
  const t = getTranslation(lang);

  return {
    title: t.phases.initialAssessment.title,
    description: t.phases.initialAssessment.description,
  };
}

export default function InitialAssessmentPage() {
  return <InitialAssessment />;
}
