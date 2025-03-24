import { Metadata } from 'next';
import ClaimSubmittedPage from '@/app/phases/claim-submitted/page';
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
    title: t.phases.claimSubmitted.title,
    description: t.phases.claimSubmitted.description,
  };
}

export async function generateStaticParams() {
  return [{ lang: 'de' }, { lang: 'en' }];
}

const Page = () => {
  return <ClaimSubmittedPage />;
};

export default Page;
