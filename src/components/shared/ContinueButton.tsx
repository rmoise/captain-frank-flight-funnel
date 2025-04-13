import React, { useCallback, useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface ContinueButtonProps {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>;
  disabled?: boolean;
  isLoading?: boolean;
  text?: string;
  loadingText?: string;
  children?: React.ReactNode;
}

export function ContinueButton({
  onClick,
  disabled = false,
  isLoading: externalIsLoading = false,
  text,
  loadingText,
  children,
}: ContinueButtonProps) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const isLoading = externalIsLoading || internalIsLoading;
  const [hasClicked, setHasClicked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      console.log("=== Continue Button Click ===");
      console.log("Button State:", {
        disabled,
        isLoading,
        hasClicked,
      });

      // Only proceed if the button is not disabled, not loading, and hasn't been clicked
      if (disabled || isLoading || hasClicked) {
        console.log("Button click ignored due to state conditions");
        return;
      }

      // Set loading state and clicked state
      setInternalIsLoading(true);
      setHasClicked(true);
      console.log("Internal loading state set to true, hasClicked set to true");

      try {
        console.log("About to execute onClick handler");
        // Execute the onClick handler provided by the parent component
        await onClick(e);
        console.log("onClick handler completed successfully");
      } catch (error) {
        console.error("Error in onClick handler:", error);
      }

      // Reset the loading state after a delay
      setTimeout(() => {
        setInternalIsLoading(false);
        console.log("Internal loading state reset after delay");
      }, 200);

      console.log("=== End Continue Button Click ===");
    },
    [disabled, isLoading, hasClicked, onClick]
  );

  // During SSR and initial client render, use a default disabled state
  if (!mounted) {
    return (
      <button
        type="button"
        disabled={true}
        className={`
          px-6 py-3
          rounded-lg
          flex items-center justify-center
          min-w-[180px]
          font-medium
          transition-all duration-200
          bg-gray-300 text-gray-500 cursor-not-allowed
        `}
      >
        <div className="flex items-center space-x-2">
          <span>{children || text || t.common.continue}</span>
        </div>
      </button>
    );
  }

  const isDisabled = disabled || isLoading || hasClicked;

  return (
    <div className="mt-8 flex order-first sm:order-none sm:flex justify-center sm:justify-end w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={isDisabled}
        className={`
          px-8 py-4
          rounded-lg
          flex items-center justify-center
          w-full sm:w-auto
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
        {isLoading || hasClicked ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{loadingText || t.common.loading}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="block sm:hidden">
              {text === "Antrag einreichen" ? text : t.common.continue}
            </span>
            <span className="hidden sm:block">
              {children || text || t.common.continue}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}
