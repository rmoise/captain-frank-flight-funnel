import { Metadata } from 'next';
import { isValidLanguage } from '@/config/language';
import { getTranslation } from '@/translations';
import FlightDetails from '@/app/phases/flight-details/page';

export async function generateMetadata({
  params,
}: {
  params: { lang: string };
}): Promise<Metadata> {
  const lang = isValidLanguage(params.lang) ? params.lang : 'de';
  const t = getTranslation(lang);

  return {
    title: t.phases.flightDetails.title,
    description: t.phases.flightDetails.description,
  };
}

export default function FlightDetailsPage() {
  return <FlightDetails />;
}
