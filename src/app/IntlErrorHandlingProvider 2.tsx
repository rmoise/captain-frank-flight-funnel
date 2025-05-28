"use client";

import { NextIntlClientProvider, IntlErrorCode } from "next-intl";
import { Locale } from "@/config/language";

export default function IntlErrorHandlingProvider({
  children,
  locale,
  messages
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Record<string, any>;
}) {
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      onError={(error) => {
        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          // Missing translations are expected and should only log an error
          console.error(error);
        } else {
          // Other errors indicate a bug in the app and should be reported
          console.error("INTL ERROR:", error);
        }
      }}
      getMessageFallback={({ namespace, key, error }) => {
        const path = [namespace, key].filter((part) => part != null).join(".");

        if (error.code === IntlErrorCode.MISSING_MESSAGE) {
          return path + " is not yet translated";
        } else {
          return "Dear developer, please fix this message: " + path;
        }
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}
