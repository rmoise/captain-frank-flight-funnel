"use client";

import React from "react";
import { locales, type Locale } from "@/config/language";
import { useUniversalNavigation } from "@/utils/navigation";

export const LanguageSwitcher = () => {
  const { getCurrentLanguage, changeLanguage } = useUniversalNavigation();
  const currentLang = getCurrentLanguage();

  const handleLanguageSwitch = (newLang: Locale) => {
    if (newLang === currentLang) return;

    console.log(`[LanguageSwitcher] Switching from ${currentLang} to ${newLang}`);
    changeLanguage(newLang);
  };

  return (
    <div className="flex gap-2 items-center">
      {locales.map((locale) => (
        <React.Fragment key={locale}>
          <button
            onClick={() => handleLanguageSwitch(locale)}
            className={`px-2 py-1 ${
              currentLang === locale
                ? "font-bold text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            aria-label={`Switch to ${locale} language`}
          >
            {locale.toUpperCase()}
          </button>
          {locale !== locales[locales.length - 1] && (
            <span className="text-gray-300">|</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
