import ClaimSuccess from "@/app/phases/claim-success/page";
import type { Metadata } from "next";
import { isValidLocale } from "@/config/language";
import { getTranslation } from "@/translations";
import { setRequestLocale } from "next-intl/server";

export type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  // Access lang asynchronously
  const { lang } = await params;

  const currentLang = isValidLocale(lang) ? lang : "de";

  // Use setRequestLocale with the resolved lang
  setRequestLocale(currentLang);

  const t = getTranslation(currentLang);

  return {
    title: t.phases.claimSuccess.title,
    description: t.phases.claimSuccess.description,
  };
}

// Make component async to properly handle params
const ClaimSuccessPage = async ({ params }: PageProps) => {
  // Access params asynchronously
  const { lang } = await params;

  // Set locale using the resolved lang
  setRequestLocale(lang);

  return <ClaimSuccess />;
};

export default ClaimSuccessPage;
