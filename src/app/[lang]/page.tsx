import { redirect } from "next/navigation";
import { isValidLanguage } from "@/config/language";

export type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ params, searchParams }: PageProps) {
  // Resolve the promises
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Handle the params on the server side
  const lang = isValidLanguage(resolvedParams.lang)
    ? resolvedParams.lang
    : "de";

  // Simply redirect to initial assessment page
  // The shared_flight logic will be handled in initial-assessment page
  redirect(
    `/${lang}/phases/initial-assessment${
      resolvedSearchParams.shared_flight
        ? `?shared_flight=${resolvedSearchParams.shared_flight}`
        : ""
    }`
  );
}
