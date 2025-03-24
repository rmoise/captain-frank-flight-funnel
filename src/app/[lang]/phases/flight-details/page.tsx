import { getTranslation } from '@/translations';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import dynamic from 'next/dynamic';

export type PageProps = {
  params?: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params ?? { lang: 'de' };
  const lang = isValidLanguage(resolvedParams.lang) ? resolvedParams.lang : 'de';
  const t = await getTranslation(lang);
  return {
    title: t.phases.flightDetails.title,
    description: t.phases.flightDetails.description,
  };
}

// Import the client component dynamically
const FlightDetails = dynamic(() => import('@/app/phases/flight-details/page'), {
  loading: () => <div>Loading...</div>
});

export default function FlightDetailsPage() {
  return <FlightDetails />;
}
