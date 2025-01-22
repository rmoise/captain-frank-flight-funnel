import CompensationEstimate from '@/app/phases/compensation-estimate/page';
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
    title: t.phases.compensationEstimate.title,
    description: t.phases.compensationEstimate.description,
  };
}

export default function CompensationEstimatePage() {
  return <CompensationEstimate />;
}
