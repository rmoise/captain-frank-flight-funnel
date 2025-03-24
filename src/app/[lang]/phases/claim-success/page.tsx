import ClaimSuccess from '@/app/phases/claim-success/page';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { getTranslation } from '@/translations';

export type PageProps = {
  params?: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params ?? { lang: 'de' };
  const lang = isValidLanguage(resolvedParams.lang) ? resolvedParams.lang : 'de';
  const t = getTranslation(lang);

  return {
    title: t.phases.claimSuccess.title,
    description: t.phases.claimSuccess.description,
  };
}

const ClaimSuccessPage = () => {
  return <ClaimSuccess />;
};

export default ClaimSuccessPage;
