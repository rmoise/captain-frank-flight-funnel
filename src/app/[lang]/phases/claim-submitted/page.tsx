import { Metadata } from "next";
import ClaimSubmitted from "@/app/phases/claim-submitted/page";
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
    title: t.phases.claimSubmitted.title,
    description: t.phases.claimSubmitted.description,
  };
}

export async function generateStaticParams() {
  return [{ lang: "de" }, { lang: "en" }];
}

const ClaimSubmittedPage = async () => {
  return <ClaimSubmitted />;
};

export default ClaimSubmittedPage;
