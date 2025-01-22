import Agreement from '@/app/phases/agreement/page';
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
    title: t.phases.agreement.title,
    description: t.phases.agreement.description,
  };
}

export default function AgreementPage() {
  return <Agreement />;
}
