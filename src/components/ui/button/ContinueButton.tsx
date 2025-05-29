import React, { useCallback, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { useUniversalNavigation } from "@/utils/navigation";
import { ValidationPhase } from "@/types/shared/validation";

interface ContinueButtonProps {
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  loadingText?: string;
  children?: React.ReactNode;
  // Universal navigation props
  navigateToPhase?: ValidationPhase;
  navigateToUrl?: string;
  useUniversalNav?: boolean;
}

export function ContinueButton({
  onClick,
  disabled = false,
  isLoading = false,
  text,
  loadingText,
  children,
  navigateToPhase,
  navigateToUrl,
  useUniversalNav = false,
}: ContinueButtonProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { navigateToPhase: navToPhase, navigateToUrl: navToUrl } =
    useUniversalNavigation();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      console.log("=== Continue Button Click ===");
      console.log("Button State:", {
        disabled,
        isLoading,
        useUniversalNav,
        navigateToPhase,
        navigateToUrl,
      });

      if (disabled || isLoading || !mounted) {
        console.log("Button click ignored due to state conditions");
        return;
      }

      try {
        // Execute custom onClick handler first if provided
        if (onClick) {
          console.log("About to execute onClick handler");
          await onClick(e);
          console.log("onClick handler completed successfully");
        }

        // Then handle universal navigation if configured
        if (useUniversalNav) {
          console.log("Executing universal navigation");

          if (navigateToPhase) {
            console.log(
              `[UniversalNav] Navigating to phase: ${navigateToPhase}`
            );
            navToPhase(navigateToPhase);
          } else if (navigateToUrl) {
            console.log(`[UniversalNav] Navigating to URL: ${navigateToUrl}`);
            navToUrl(navigateToUrl);
          } else {
            console.warn(
              "Universal navigation enabled but no target specified"
            );
          }
        }
      } catch (error) {
        console.error("Error in onClick handler:", error);
      }

      console.log("=== End Continue Button Click ===");
    },
    [
      disabled,
      isLoading,
      mounted,
      onClick,
      useUniversalNav,
      navigateToPhase,
      navigateToUrl,
      navToPhase,
      navToUrl,
    ]
  );

  // Always use the same DOM structure - only disable until mounted
  const isDisabled = disabled || isLoading || !mounted;

  return (
    <div className="w-full sm:w-auto sm:order-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          px-8 py-4
          rounded-lg
          flex items-center justify-center
          w-full
          min-w-[200px]
          font-medium
          text-lg
          transition-all duration-200
          ${
            isDisabled
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#F54538] hover:bg-[#E03F33] text-white shadow-sm hover:shadow-md active:shadow-sm"
          }
        `}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{loadingText || t("common.loading")}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="block sm:hidden">
              {text === "Antrag einreichen" ? text : t("common.continue")}
            </span>
            <span className="hidden sm:block">
              {children || text || t("common.continue")}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
