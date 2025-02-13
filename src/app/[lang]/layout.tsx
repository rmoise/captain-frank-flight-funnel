import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { Providers } from '../providers';

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = isValidLanguage(resolvedParams.lang) ? resolvedParams.lang : 'de';

  return {
    title: {
      template: '%s | Captain Frank',
      default: 'Captain Frank - Flight Compensation',
    },
    description: 'Get compensation for your delayed or cancelled flight',
    openGraph: {
      title: 'Captain Frank - Flight Compensation',
      description: 'Get compensation for your delayed or cancelled flight',
      locale: lang,
    },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <Providers>{children}</Providers>;
}
