import { Metadata } from 'next';
import ClaimSubmittedPage from '@/app/phases/claim-submitted/page';
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
    title: t.phases.claimSubmitted.title,
    description: t.phases.claimSubmitted.description,
  };
}

export async function generateStaticParams() {
  return [{ lang: 'de' }, { lang: 'en' }];
}

export default function Page() {
  return <ClaimSubmittedPage />;
}
