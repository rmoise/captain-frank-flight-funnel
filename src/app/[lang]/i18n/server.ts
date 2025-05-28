import { getRequestConfig } from "next-intl/server";
import { getTranslations } from "@/translations";
import { locales, defaultLocale, Locale } from "@/config/language";

export default getRequestConfig(async ({ requestLocale }) => {
  // First await the locale value from requestLocale in Next.js 15
  let locale = await requestLocale;

  // Validate and fallback to default locale if invalid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  // Log for debugging purposes
  if (process.env.NODE_ENV === "development") {
    console.log(
      `[i18n/server.ts] Using locale: ${locale} (received: ${await requestLocale})`
    );
  }

  return {
    // Need to return the locale explicitly with the new API
    locale,
    messages: getTranslations(locale as Locale),
    timeZone: "Europe/Berlin",
    now: new Date(),
    formats: {
      dateTime: {
        short: {
          day: "numeric",
          month: "short",
          year: "numeric",
        },
      },
      number: {
        precise: {
          maximumFractionDigits: 2,
        },
      },
    },
  };
});
