import Agreement from '@/app/phases/agreement/page';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { getTranslation } from '@/translations';

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = isValidLanguage(resolvedParams.lang) ? resolvedParams.lang : 'de';
  const t = getTranslation(lang);

  return {
    title: t.phases.agreement.title,
    description: t.phases.agreement.description,
  };
}

export default function AgreementPage() {
  return <Agreement />;
}
