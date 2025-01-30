import { getTranslation } from '@/translations';
import type { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import dynamic from 'next/dynamic';

export async function generateMetadata({
  params: { lang },
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const validLang = isValidLanguage(lang) ? lang : 'de';
  const t = await getTranslation(validLang);
  return {
    title: t.phases.flightDetails.title,
    description: t.phases.flightDetails.description,
  };
}

// This is a Server Component that renders the FlightDetails page
export default function FlightDetailsPage() {
  // Import the client component dynamically to avoid 'use client' directive issues
  const FlightDetails = dynamic(
    () => import('@/app/phases/flight-details/page'),
    {
      ssr: false, // This ensures the component only renders on the client side
    }
  );

  return <FlightDetails />;
}
