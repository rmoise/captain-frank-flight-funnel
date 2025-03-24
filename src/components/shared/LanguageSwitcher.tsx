'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import React from 'react';

export const LanguageSwitcher = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentLang = (params?.lang as string) || 'de';

  // Remove the language prefix from pathname
  const pathWithoutLang = pathname?.replace(/^\/[^\/]+/, '') || '';

  const handleLanguageSwitch = (lang: string) => {
    // Store the current URL path without language
    try {
      sessionStorage.setItem('lastLanguageSwitchPath', pathWithoutLang);
      sessionStorage.setItem('languageSwitchTime', Date.now().toString());

      // Force a full page reload with the new language to ensure clean state
      window.location.href = `/${lang}${pathWithoutLang}`;
    } catch (e) {
      // If sessionStorage is not available, fall back to normal navigation
      router.push(`/${lang}${pathWithoutLang}`);
    }
  };

  // Check if we just switched languages and need to reload
  React.useEffect(() => {
    try {
      const lastSwitchTime = sessionStorage.getItem('languageSwitchTime');
      const lastSwitchPath = sessionStorage.getItem('lastLanguageSwitchPath');

      // If we've switched recently (within 2 seconds) and this page matches the path we saved
      if (lastSwitchTime && lastSwitchPath && pathWithoutLang === lastSwitchPath) {
        const switchTimeMs = parseInt(lastSwitchTime, 10);
        const now = Date.now();

        // If the switch was recent (within 2 seconds), clear the flag
        if (now - switchTimeMs < 2000) {
          sessionStorage.removeItem('languageSwitchTime');
          sessionStorage.removeItem('lastLanguageSwitchPath');

          // The page has been reloaded, and state should be fresh
          console.log('Language switch completed with page reload');
        }
      }
    } catch (e) {
      // Ignore errors from sessionStorage
    }
  }, [pathWithoutLang]);

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleLanguageSwitch('de')}
        className={`${currentLang === 'de' ? 'font-bold' : ''} hover:underline`}
      >
        DE
      </button>
      <span>|</span>
      <button
        onClick={() => handleLanguageSwitch('en')}
        className={`${currentLang === 'en' ? 'font-bold' : ''} hover:underline`}
      >
        EN
      </button>
    </div>
  );
};
