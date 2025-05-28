"use client";

import React from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface NavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  isStepComplete: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  isStepComplete,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex justify-between mt-6">
      <div>
        <button
          onClick={onBack}
          disabled={currentStep === 1}
          className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("wizard.navigation.back")}
        </button>
      </div>
      <div>
        <button
          onClick={onNext}
          disabled={!isStepComplete}
          className="px-4 py-2 text-white bg-[#F54538] rounded-md hover:bg-[#E03F33] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === totalSteps
            ? t("wizard.navigation.next")
            : t("wizard.navigation.next")}
        </button>
      </div>
    </div>
  );
};
