import { redirect } from 'next/navigation';
import { isValidLanguage } from '@/config/language';

type Props = {
  params: Promise<{ lang: string }>;
};

export default async function Home({ params }: Props) {
  const resolvedParams = await params;
  const lang = isValidLanguage(resolvedParams.lang)
    ? resolvedParams.lang
    : 'de';
  redirect(`/${lang}/phases/initial-assessment`);
}
