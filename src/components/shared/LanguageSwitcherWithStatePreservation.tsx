'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import React from 'react';
import useStore from '@/lib/state/store';
import { controlledLog } from '@/utils/loggerUtil';

export const LanguageSwitcherWithStatePreservation = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();
  const currentLang = (params?.lang as string) || 'de';

  // Remove the language prefix from pathname
  const pathWithoutLang = pathname?.replace(/^\/[^\/]+/, '') || '';

  const handleLanguageSwitch = (newLang: string) => {
    // No need to switch if already using this language
    if (newLang === currentLang) return;

    // Log current state before language switch
    controlledLog('LanguageSwitcher - State before language switch', {
      currentPhase: store.currentPhase,
      completedPhases: store.completedPhases,
      isClaimSuccess: store._isClaimSuccess,
      isClaimRejected: store._isClaimRejected,
      validationState: store.validationState,
      timestamp: new Date().toISOString()
    });

    // Store relevant state in sessionStorage before navigation
    sessionStorage.setItem('languageSwitchData', JSON.stringify({
      timestamp: new Date().toISOString(),
      fromLang: currentLang,
      toLang: newLang,
      path: pathWithoutLang,
      stateSnapshot: {
        currentPhase: store.currentPhase,
        phasesCompletedViaContinue: store.phasesCompletedViaContinue,
        completedPhases: store.completedPhases,
        isClaimSuccess: store._isClaimSuccess,
        isClaimRejected: store._isClaimRejected
      }
    }));

    // Navigate to new language path
    router.push(`/${newLang}${pathWithoutLang}`);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleLanguageSwitch('de')}
        className={`${currentLang === 'de' ? 'font-bold' : ''}`}
      >
        DE
      </button>
      <span>|</span>
      <button
        onClick={() => handleLanguageSwitch('en')}
        className={`${currentLang === 'en' ? 'font-bold' : ''}`}
      >
        EN
      </button>
    </div>
  );
};