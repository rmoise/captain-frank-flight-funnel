import CompensationEstimate from '@/app/phases/compensation-estimate/page';
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
    title: t.phases.compensationEstimate.title,
    description: t.phases.compensationEstimate.description,
  };
}

const CompensationEstimatePage = async () => {
  return <CompensationEstimate />;
};

export default CompensationEstimatePage;
