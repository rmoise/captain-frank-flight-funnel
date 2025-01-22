import ClaimRejected from '@/app/phases/claim-rejected/page';
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
    title: t.phases.claimRejected.title,
    description: t.phases.claimRejected.description,
  };
}

export default function ClaimRejectedPage() {
  return <ClaimRejected />;
}
