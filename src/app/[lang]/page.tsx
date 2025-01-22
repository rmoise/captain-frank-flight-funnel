import { redirect } from 'next/navigation';
import { isValidLanguage } from '@/config/language';

export default function Home({ params }: { params: { lang: string } }) {
  const lang = isValidLanguage(params.lang) ? params.lang : 'de';
  redirect(`/${lang}/phases/initial-assessment`);
}
