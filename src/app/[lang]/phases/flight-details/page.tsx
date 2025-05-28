import { getTranslation } from "@/translations";
import type { Metadata } from "next";
import { isValidLocale } from "@/config/language";
import { setRequestLocale } from "next-intl/server";
import React from "react";
import FlightDetails from "@/app/phases/flight-details/page";

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

  setRequestLocale(lang);
  const currentLang = isValidLocale(lang) ? lang : "de";
  const t = getTranslation(currentLang);
  return {
    title: t.phases.flightDetails.title,
    description: t.phases.flightDetails.description,
  };
}

// Make this async to properly handle params
export default async function FlightDetailsPageWrapper({ params }: PageProps) {
  // Access params asynchronously
  const { lang } = await params;

  // Set locale directly
  setRequestLocale(lang);

  return <FlightDetails />;
}
