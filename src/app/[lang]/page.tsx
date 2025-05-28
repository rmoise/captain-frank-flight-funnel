import { redirect } from "next/navigation";
import { isValidLocale } from "@/config/language";
import { setRequestLocale } from "next-intl/server";

export type PageProps = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home({ params, searchParams }: PageProps) {
  // Access params asynchronously
  const { lang } = await params;

  // Set locale for this request
  setRequestLocale(lang);

  // Validate and use the lang parameter
  const validLang = isValidLocale(lang) ? lang : "de";

  // Get the shared_flight parameter (if any)
  const resolvedSearchParams = await searchParams;
  const sharedFlightParam =
    resolvedSearchParams.shared_flight &&
    typeof resolvedSearchParams.shared_flight === "string"
      ? resolvedSearchParams.shared_flight
      : "";

  // Construct the path and search params separately
  const path = "/phases/initial-assessment";
  const searchString = sharedFlightParam
    ? `?shared_flight=${sharedFlightParam}`
    : "";

  // Use Next.js built-in redirect function which works on both server and client
  redirect(`/${validLang}${path}${searchString}`);
}
