"use client";

import { useParams, usePathname, useRouter } from "next/navigation";
import React from "react";
import useStore from "@/store/index";
import { controlledLog } from "@/utils/loggerUtil";

export const LanguageSwitcherWithStatePreservation = () => {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();
  const currentLang = (params?.lang as string) || "de";

  // Extract store properties
  const navigation = store.navigation || {};
  const validation = store.validation || {};

  // Extract the path without language and handle direct routes
  const getPathWithoutLang = () => {
    // Check if the path already has a language prefix
    if (pathname?.match(/^\/(en|de)\//)) {
      return pathname?.replace(/^\/[^\/]+/, "") || "";
    }

    // Handle case where we're on a direct route like /phases/...
    if (pathname?.startsWith("/phases/")) {
      return pathname; // Keep the path as is
    }

    // Default case - remove any language prefix or use empty path
    return pathname?.replace(/^\/[^\/]+/, "") || "";
  };

  const pathWithoutLang = getPathWithoutLang();

  const handleLanguageSwitch = (newLang: string) => {
    // No need to switch if already using this language
    if (newLang === currentLang) return;

    // Log current state before language switch
    controlledLog("LanguageSwitcher - State before language switch", {
      currentPhase: navigation.currentPhase,
      completedPhases: navigation.completedPhases,
      validation: validation,
      timestamp: new Date().toISOString(),
    });

    // Store relevant state in sessionStorage before navigation
    sessionStorage.setItem(
      "languageSwitchData",
      JSON.stringify({
        timestamp: new Date().toISOString(),
        fromLang: currentLang,
        toLang: newLang,
        path: pathWithoutLang,
        stateSnapshot: {
          currentPhase: navigation.currentPhase,
          completedPhases: navigation.completedPhases,
          validation: validation,
        },
      })
    );

    // Special handling for direct routes
    let newPath;
    if (pathname?.startsWith("/phases/")) {
      // For direct routes, redirect to the localized version
      newPath = `/${newLang}/phases/${pathname.split("/phases/")[1]}`;
      console.log(`Language switch: navigating from ${pathname} to ${newPath}`);
      window.location.href = newPath;
    } else {
      // Normal case
      newPath = `/${newLang}${pathWithoutLang}`;
      console.log(`Language switch: navigating from ${pathname} to ${newPath}`);
      router.push(newPath);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleLanguageSwitch("de")}
        className={`${currentLang === "de" ? "font-bold" : ""}`}
      >
        DE
      </button>
      <span>|</span>
      <button
        onClick={() => handleLanguageSwitch("en")}
        className={`${currentLang === "en" ? "font-bold" : ""}`}
      >
        EN
      </button>
    </div>
  );
};
