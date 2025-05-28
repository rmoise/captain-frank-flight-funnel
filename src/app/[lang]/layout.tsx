import "../globals.css";
import "@/styles/autofill.css";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { locales, type Locale } from "@/config/language";
import { getTranslations as getAppTranslations } from "@/translations";
import MemoryProvider from "../memory-provider";
import { Providers } from "@/app/providers";
import { HydrationErrorBoundary } from "@/components/shared/HydrationErrorBoundary";
import { StoreHydration } from "@/components/shared/StoreHydration";
import { setRequestLocale } from "next-intl/server";
import React from "react";

// Define proper types for dynamic params
type Props = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

// Generate static params for all supported locales
export function generateStaticParams() {
  return locales.map((locale) => ({ lang: locale }));
}

// Generate metadata for the page
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  // Properly await params to get the lang parameter
  const { lang } = await params;

  // Use setRequestLocale to set the locale for this request
  setRequestLocale(lang);

  return {
    title: "Captain Frank - Flight Compensation",
    description: "Get compensation for your delayed or cancelled flight",
    alternates: {
      canonical: "/",
      languages: {
        de: "/de",
        en: "/en",
      },
    },
  };
}

// Layout component that handles the page structure
export default async function Layout({ children, params }: Props) {
  console.log("[InitialAssessmentLayout] Rendering layout");

  // Properly await params before accessing the lang property
  const { lang } = await params;

  // Set locale for this request
  setRequestLocale(lang);

  const currentLang = locales.includes(lang as Locale)
    ? (lang as Locale)
    : "de";

  // Validate that the incoming `lang` parameter is valid
  if (!locales.includes(currentLang)) {
    notFound();
  }

  // Get translations
  const messages = getAppTranslations(currentLang);

  return (
    <NextIntlClientProvider locale={currentLang} messages={messages}>
      <MemoryProvider>
        <Providers>
          <HydrationErrorBoundary>
            <StoreHydration>
              <div className="relative w-full overflow-x-hidden">
                {children}
              </div>
            </StoreHydration>
          </HydrationErrorBoundary>
        </Providers>
      </MemoryProvider>
    </NextIntlClientProvider>
  );
}
