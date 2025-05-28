import InitialAssessment from "@/app/phases/initial-assessment/page";
import type { Metadata } from "next";
import { isValidLocale, type Locale } from "@/config/language";
import { getTranslation } from "@/translations";
import React from "react";
import { AccordionProvider } from "@/components/shared/accordion/AccordionContext";
import { setRequestLocale } from "next-intl/server";

type Props = {
  params: Promise<{ lang: string }>;
};

// Use an async approach for metadata generation
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  // Access lang properly from params object
  const { lang } = await params;

  // Set locale using setRequestLocale
  setRequestLocale(lang);

  const currentLang =
    lang && isValidLocale(lang as Locale) ? (lang as Locale) : "de";

  // Get translations
  const t = getTranslation(currentLang);

  return {
    title: t.phases.initialAssessment.title || "Initial Assessment",
    description:
      t.phases.initialAssessment.description ||
      "Let's assess your flight claim",
  };
}

// Make the component async to properly handle params
export default async function InitialAssessmentPageWrapper({ params }: Props) {
  console.log("[InitialAssessmentPageWrapper] Component rendering");

  // Access params asynchronously
  const { lang } = await params;

  // Set the locale based on the params
  setRequestLocale(lang);

  return (
    <AccordionProvider>
      <InitialAssessment />
    </AccordionProvider>
  );
}
