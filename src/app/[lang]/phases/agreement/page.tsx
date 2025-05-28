import AgreementPageWrapper from "@/app/phases/agreement/wrapper";
import type { Metadata } from "next";
import { isValidLocale } from "@/config/language";
import { getTranslation } from "@/translations";
import { setRequestLocale } from "next-intl/server";

interface PageProps {
  params: Promise<{ lang: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const lang = isValidLocale(resolvedParams.lang) ? resolvedParams.lang : "de";
  await setRequestLocale(lang);
  const t = getTranslation(lang);

  return {
    title: t.phases.agreement.title,
    description: t.phases.agreement.description,
  };
}

const AgreementPage = async () => {
  return <AgreementPageWrapper />;
};

export default AgreementPage;
