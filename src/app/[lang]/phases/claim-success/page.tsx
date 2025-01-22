import ClaimSuccess from '@/app/phases/claim-success/page';
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
    title: t.phases.claimSuccess.title,
    description: t.phases.claimSuccess.description,
  };
}

export default function ClaimSuccessPage() {
  return <ClaimSuccess />;
}
