import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "@/translations";
import { locales, isValidLocale, type Locale } from "@/config/language";

// This function is required by next-intl 3.22+
export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}) {
  const params = await props.params;

  return {
    title: "Captain Frank",
    description: "Your flight compensation expert",
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Add the required getRequestConfig function
export async function getRequestConfig({ locale }: { locale: string }) {
  return {
    messages: (await import(`@/messages/${locale}.json`)).default,
    timeZone: "Europe/Berlin",
    now: new Date(),
  };
}

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

async function LocaleLayout(props: Props) {
  const params = await props.params;

  const { locale } = params;

  const { children } = props;

  // Validate that the incoming `locale` parameter is valid
  if (!isValidLocale(locale)) notFound();

  // At this point, TypeScript knows locale is of type Locale
  const validLocale: Locale = locale;

  let messages;
  try {
    messages = getTranslations(validLocale);
  } catch (error) {
    notFound();
  }

  return (
    <NextIntlClientProvider locale={validLocale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}

export default LocaleLayout;

// This is important for next-intl to know what locales are available
export const dynamic = "force-static";
