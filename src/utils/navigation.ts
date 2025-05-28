/**
 * Universal Navigation System for Next.js 15 App Router with i18n
 * Ensures consistent language-aware navigation across all phases
 */

import { useRouter, useParams, usePathname } from "next/navigation";
import { ValidationPhase } from "@/types/shared/validation";
import { locales, defaultLocale, type Locale } from "@/config/language";

// Phase to URL mapping - only for main navigation phases
const PHASE_ROUTES: Partial<Record<ValidationPhase, string>> = {
  [ValidationPhase.INITIAL_ASSESSMENT]: "/phases/initial-assessment",
  [ValidationPhase.COMPENSATION_ESTIMATE]: "/phases/compensation-estimate",
  [ValidationPhase.FLIGHT_DETAILS]: "/phases/flight-details",
  [ValidationPhase.TRIP_EXPERIENCE]: "/phases/trip-experience",
  [ValidationPhase.CLAIM_SUCCESS]: "/phases/claim-success",
  [ValidationPhase.CLAIM_REJECTED]: "/phases/claim-rejected",
  [ValidationPhase.AGREEMENT]: "/phases/agreement",
  [ValidationPhase.CLAIM_SUBMITTED]: "/phases/claim-submitted",
};

// Phase number to enum mapping - only for main navigation phases
const PHASE_NUMBER_TO_ENUM: Record<number, ValidationPhase> = {
  1: ValidationPhase.INITIAL_ASSESSMENT,
  2: ValidationPhase.COMPENSATION_ESTIMATE,
  3: ValidationPhase.FLIGHT_DETAILS,
  4: ValidationPhase.TRIP_EXPERIENCE,
  5: ValidationPhase.CLAIM_SUCCESS,
  6: ValidationPhase.AGREEMENT,
  7: ValidationPhase.CLAIM_SUBMITTED,
};

// Enum to phase number mapping - only for main navigation phases
const PHASE_ENUM_TO_NUMBER: Partial<Record<ValidationPhase, number>> = {
  [ValidationPhase.INITIAL_ASSESSMENT]: 1,
  [ValidationPhase.COMPENSATION_ESTIMATE]: 2,
  [ValidationPhase.FLIGHT_DETAILS]: 3,
  [ValidationPhase.TRIP_EXPERIENCE]: 4,
  [ValidationPhase.CLAIM_SUCCESS]: 5,
  [ValidationPhase.AGREEMENT]: 6,
  [ValidationPhase.CLAIM_SUBMITTED]: 7,
  [ValidationPhase.CLAIM_REJECTED]: 5, // Maps to same as success for navigation
};

/**
 * Universal Navigation Utilities
 */
export const navigationUtils = {
  /**
   * Extract language from pathname
   */
  getLanguageFromPath: (pathname: string): Locale => {
    const segments = pathname.split("/").filter(Boolean);
    const firstSegment = segments[0] as Locale;
    return locales.includes(firstSegment) ? firstSegment : defaultLocale;
  },

  /**
   * Remove language prefix from path
   */
  removeLanguagePrefix: (pathname: string): string => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && locales.includes(segments[0] as Locale)) {
      return "/" + segments.slice(1).join("/");
    }
    return pathname;
  },

  /**
   * Build language-aware URL
   */
  buildLanguageAwareUrl: (path: string, lang: Locale = defaultLocale): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    return `/${lang}/${cleanPath}`;
  },

  /**
   * Get current language from router params or pathname
   */
  getCurrentLanguage: (params?: any, pathname?: string): Locale => {
    // Try to get from params first
    if (params?.lang && locales.includes(params.lang as Locale)) {
      return params.lang as Locale;
    }

    // Fallback to pathname extraction
    if (pathname) {
      return navigationUtils.getLanguageFromPath(pathname);
    }

    return defaultLocale;
  },

  /**
   * Get phase from pathname
   */
  getPhaseFromPathname: (pathname: string): ValidationPhase | null => {
    const pathWithoutLang = navigationUtils.removeLanguagePrefix(pathname);

    // Find matching phase route
    for (const [phase, route] of Object.entries(PHASE_ROUTES)) {
      if (route && (pathWithoutLang === route || pathWithoutLang.startsWith(route + "/"))) {
        return phase as ValidationPhase;
      }
    }

    return null;
  },

  /**
   * Convert phase number to enum
   */
  phaseNumberToEnum: (phaseNumber: number): ValidationPhase | null => {
    return PHASE_NUMBER_TO_ENUM[phaseNumber] || null;
  },

  /**
   * Convert phase enum to number
   */
  phaseEnumToNumber: (phase: ValidationPhase): number | null => {
    return PHASE_ENUM_TO_NUMBER[phase] || null;
  },

  /**
   * Get route for phase
   */
  getPhaseRoute: (phase: ValidationPhase): string | null => {
    return PHASE_ROUTES[phase] || null;
  },

  /**
   * Get next phase in sequence
   */
  getNextPhase: (currentPhase: ValidationPhase): ValidationPhase | null => {
    const currentNumber = PHASE_ENUM_TO_NUMBER[currentPhase];
    if (!currentNumber) return null;

    const nextNumber = currentNumber + 1;
    return PHASE_NUMBER_TO_ENUM[nextNumber] || null;
  },

  /**
   * Get previous phase in sequence
   */
  getPreviousPhase: (currentPhase: ValidationPhase): ValidationPhase | null => {
    const currentNumber = PHASE_ENUM_TO_NUMBER[currentPhase];
    if (!currentNumber) return null;

    const previousNumber = currentNumber - 1;
    return PHASE_NUMBER_TO_ENUM[previousNumber] || null;
  },
};

/**
 * Navigation interface for type-safe navigation operations
 */
export interface NavigationOptions {
  replace?: boolean;
  force?: boolean;
  preserveQuery?: boolean;
  lang?: Locale;
}

/**
 * Universal Navigation Hook
 * Provides language-aware navigation methods
 */
export function useUniversalNavigation() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();

  // Get current language
  const currentLang = navigationUtils.getCurrentLanguage(params, pathname);

  /**
   * Navigate to a specific phase with language awareness
   */
  const navigateToPhase = (
    phase: ValidationPhase,
    options: NavigationOptions = {}
  ) => {
    const {
      replace = false,
      force = false,
      preserveQuery = false,
      lang = currentLang
    } = options;

    const phaseRoute = navigationUtils.getPhaseRoute(phase);
    if (!phaseRoute) {
      console.warn(`No route defined for phase: ${phase}`);
      return;
    }

    const fullUrl = navigationUtils.buildLanguageAwareUrl(phaseRoute, lang);

    // Preserve current query parameters if requested
    const finalUrl = preserveQuery && typeof window !== 'undefined'
      ? `${fullUrl}${window.location.search}`
      : fullUrl;

    console.log(`[UniversalNavigation] Navigating to phase ${phase} (${fullUrl})`);

    if (replace) {
      router.replace(finalUrl);
    } else {
      router.push(finalUrl);
    }
  };

  /**
   * Navigate to next phase in sequence
   */
  const navigateToNextPhase = (
    currentPhase: ValidationPhase,
    options: NavigationOptions = {}
  ) => {
    const nextPhase = navigationUtils.getNextPhase(currentPhase);
    if (nextPhase) {
      navigateToPhase(nextPhase, options);
    } else {
      console.warn(`No next phase available after ${currentPhase}`);
    }
  };

  /**
   * Navigate to previous phase in sequence
   */
  const navigateToPreviousPhase = (
    currentPhase: ValidationPhase,
    options: NavigationOptions = {}
  ) => {
    const previousPhase = navigationUtils.getPreviousPhase(currentPhase);
    if (previousPhase) {
      navigateToPhase(previousPhase, options);
    } else {
      console.warn(`No previous phase available before ${currentPhase}`);
    }
  };

  /**
   * Navigate to a custom URL with language awareness
   */
  const navigateToUrl = (
    url: string,
    options: NavigationOptions = {}
  ) => {
    const {
      replace = false,
      lang = currentLang,
      preserveQuery = false
    } = options;

    // If URL already includes language, use as-is
    const urlSegments = url.split("/").filter(Boolean);
    const hasLanguagePrefix = urlSegments.length > 0 &&
      locales.includes(urlSegments[0] as Locale);

    const finalUrl = hasLanguagePrefix
      ? url
      : navigationUtils.buildLanguageAwareUrl(url, lang);

    // Preserve current query parameters if requested
    const urlWithQuery = preserveQuery && typeof window !== 'undefined'
      ? `${finalUrl}${window.location.search}`
      : finalUrl;

    console.log(`[UniversalNavigation] Navigating to URL: ${urlWithQuery}`);

    if (replace) {
      router.replace(urlWithQuery);
    } else {
      router.push(urlWithQuery);
    }
  };

  /**
   * Change language while preserving current path
   */
  const changeLanguage = (newLang: Locale) => {
    if (!locales.includes(newLang)) {
      console.warn(`Invalid locale: ${newLang}`);
      return;
    }

    const pathWithoutLang = navigationUtils.removeLanguagePrefix(pathname);
    const newUrl = navigationUtils.buildLanguageAwareUrl(pathWithoutLang, newLang);

    console.log(`[UniversalNavigation] Changing language from ${currentLang} to ${newLang}`);

    // Set cookie for next-intl
    if (typeof document !== 'undefined') {
      const days = 30;
      const date = new Date();
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      const expires = date.toUTCString();
      document.cookie = `NEXT_LOCALE=${newLang};expires=${expires};path=/`;
    }

    router.push(newUrl);
  };

  /**
   * Go back with language awareness
   */
  const goBack = () => {
    // Use browser back if available, otherwise navigate to previous phase
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      const currentPhase = navigationUtils.getPhaseFromPathname(pathname);
      if (currentPhase) {
        navigateToPreviousPhase(currentPhase);
      } else {
        // Fallback to home page
        navigateToUrl("/", { replace: true });
      }
    }
  };

  return {
    // Navigation methods
    navigateToPhase,
    navigateToNextPhase,
    navigateToPreviousPhase,
    navigateToUrl,
    changeLanguage,
    goBack,

    // Utility methods
    getCurrentLanguage: () => currentLang,
    getCurrentPhase: () => navigationUtils.getPhaseFromPathname(pathname),

    // Router instance for advanced usage
    router,
  };
}

/**
 * Legacy compatibility - maintained for existing code
 * @deprecated Use useUniversalNavigation instead
 */
export const getLanguageAwareUrl = (path: string, lang: string = defaultLocale): string => {
  return navigationUtils.buildLanguageAwareUrl(path, lang as Locale);
};
