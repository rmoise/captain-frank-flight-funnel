import ClaimRejected from "@/app/phases/claim-rejected/page";
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
  const { lang } = await params;

  const currentLang = isValidLocale(lang) ? lang : "de";

  setRequestLocale(currentLang);

  const t = getTranslation(currentLang);

  return {
    title: t.phases.claimRejected.title,
    description: t.phases.claimRejected.description,
  };
}

const ClaimRejectedPage = async ({ params }: PageProps) => {
  const { lang } = await params;

  setRequestLocale(lang);

  return <ClaimRejected />;
};

export default ClaimRejectedPage;
