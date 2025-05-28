"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { useTranslation } from "@/hooks/useTranslation";
import { qaWizardConfig } from "@/config/qaWizard";
import { useStore } from "@/hooks/useStore";

interface SuccessProps {
  message: string;
  showConfetti?: boolean;
  onBack?: () => void;
}

export const Success: React.FC<SuccessProps> = ({
  message,
  showConfetti = false,
  onBack,
}) => {
  const { t } = useTranslation();
  const store = useStore();

  // Log the imported config to check if it's defined
  console.log("[Success Component Render] qaWizardConfig:", qaWizardConfig);

  // Add a guard to handle potential undefined config
  const iconConfig = qaWizardConfig?.success?.icon;

  const icon = iconConfig ? (
    showConfetti ? (
      <span className={iconConfig.emoji}>🎉</span>
    ) : (
      <CheckCircleIcon className={iconConfig.check} />
    )
  ) : (
    // Fallback icon or null if config is missing
    <CheckCircleIcon className="w-16 h-16 text-gray-400" /> // Example fallback
  );

  const handleBackToQuestions = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("[Success] Back to questions button clicked");

    // First reset the state in the store
    if (store?.actions?.wizard?.resetWizard) {
      console.log("[Success] Resetting wizard state in store");
      store.actions.wizard.resetWizard();
    }

    // Reset localStorage for extra reliability
    try {
      console.log("[Success] Resetting wizard state in localStorage");
      const storedState = localStorage.getItem("captain-frank-store");
      if (storedState) {
        const parsedState = JSON.parse(storedState);
        if (parsedState.state?.wizard) {
          // Reset the key fields
          parsedState.state.wizard.isComplete = false;
          parsedState.state.wizard.currentStep = 1;

          // Force-clear any answers that might be restored
          if (parsedState.state.wizard.answers) {
            parsedState.state.wizard.answers = [];
          }

          localStorage.setItem(
            "captain-frank-store",
            JSON.stringify(parsedState)
          );
          console.log("[Success] Successfully reset wizard in localStorage");
        }
      }
    } catch (err) {
      console.error("[Success] Error resetting localStorage:", err);
    }

    // Call the parent component's handler to handle UI changes
    if (onBack) {
      console.log("[Success] Calling parent onBack handler");
      onBack();
    }
  };

  return (
    <div className="min-h-[300px] flex flex-col justify-center">
      <motion.div
        key="success"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex flex-col items-center justify-center space-y-6">
          <div className="w-16 h-16 flex items-center justify-center text-[64px]">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ delay: 0.1, duration: 0.2 }}
            >
              {icon}
            </motion.div>
          </div>
          <div className="text-center space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900">{message}</h2>
              <p className="text-sm text-gray-500">
                {t("wizard.success.processing")}
              </p>
              {onBack && (
                <div className="mt-6">
                  <button
                    onClick={handleBackToQuestions}
                    className="px-6 py-2 text-[#F54538] border border-[#F54538] rounded-md hover:bg-red-50"
                  >
                    {t("wizard.success.backToQuestions")}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
