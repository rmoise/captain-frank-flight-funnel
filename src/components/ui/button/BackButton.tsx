import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useUniversalNavigation } from "@/utils/navigation";
import { ValidationPhase } from "@/types/shared/validation";

interface BackButtonProps {
  onClick?: () => void;
  text?: string;
  disabled?: boolean;
  // Universal navigation props
  navigateToPhase?: ValidationPhase;
  navigateToUrl?: string;
  useUniversalNav?: boolean;
  useBackHistory?: boolean; // Use browser back instead of specific navigation
}

export function BackButton({
  onClick,
  text,
  disabled = false,
  navigateToPhase,
  navigateToUrl,
  useUniversalNav = false,
  useBackHistory = false,
}: BackButtonProps) {
  const { t } = useTranslation();
  const {
    navigateToPhase: navToPhase,
    navigateToUrl: navToUrl,
    goBack,
    navigateToPreviousPhase,
    getCurrentPhase,
  } = useUniversalNavigation();

  const handleClick = () => {
    console.log("=== Back Button Click ===");
    console.log("Button State:", {
      disabled,
      useUniversalNav,
      useBackHistory,
      navigateToPhase,
      navigateToUrl,
    });

    if (disabled) {
      console.log("Button click ignored due to disabled state");
      return;
    }

    try {
      // Execute custom onClick handler first if provided
      if (onClick) {
        console.log("Executing custom onClick handler");
        onClick();
        return; // Don't execute universal navigation if custom handler provided
      }

      // Handle universal navigation
      if (useUniversalNav) {
        console.log("Executing universal navigation");

        if (useBackHistory) {
          console.log("[UniversalNav] Using browser back/previous phase");
          goBack();
        } else if (navigateToPhase) {
          console.log(
            `[UniversalNav] Navigating to specific phase: ${navigateToPhase}`
          );
          navToPhase(navigateToPhase);
        } else if (navigateToUrl) {
          console.log(`[UniversalNav] Navigating to URL: ${navigateToUrl}`);
          navToUrl(navigateToUrl);
        } else {
          // Default behavior: navigate to previous phase
          const currentPhase = getCurrentPhase();
          if (currentPhase) {
            console.log(
              `[UniversalNav] Auto-navigating to previous phase from: ${currentPhase}`
            );
            navigateToPreviousPhase(currentPhase);
          } else {
            console.log("[UniversalNav] Fallback to browser back");
            goBack();
          }
        }
      } else {
        console.warn("BackButton clicked but no navigation configured");
      }
    } catch (error) {
      console.error("Error in BackButton handler:", error);
    }

    console.log("=== End Back Button Click ===");
  };

  return (
    <div className="mt-8 order-last sm:order-none flex justify-center sm:justify-start w-full sm:w-auto">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`px-10 h-16 rounded-xl transition-colors min-w-[200px] flex items-center justify-center ${
          disabled
            ? "text-gray-400 cursor-not-allowed"
            : "text-[#F54538] hover:bg-[#FEF2F2]"
        }`}
      >
        {text || t("common.back")}
      </button>
    </div>
  );
}
