import TripExperience from "@/app/phases/trip-experience/page";
import type { Metadata } from "next";
import { isValidLocale } from "@/config/language";
import { getTranslation } from "@/translations";
import { setRequestLocale } from "next-intl/server";

export type PageProps = {
  params?: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = (await params) ?? { lang: "de" };
  const lang = isValidLocale(resolvedParams.lang) ? resolvedParams.lang : "de";
  await setRequestLocale(lang);
  const t = getTranslation(lang);

  return {
    title: t.phases.tripExperience.title,
    description: t.phases.tripExperience.description,
  };
}

const TripExperiencePage = async () => {
  return <TripExperience />;
};

export default TripExperiencePage;
