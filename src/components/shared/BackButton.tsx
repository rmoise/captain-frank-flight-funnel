import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

interface BackButtonProps {
  onClick: () => void;
  text?: string;
  disabled?: boolean;
}

export function BackButton({
  onClick,
  text,
  disabled = false,
}: BackButtonProps) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 order-last sm:order-none flex justify-center sm:justify-start w-full sm:w-auto">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`px-10 h-16 rounded-xl transition-colors min-w-[200px] flex items-center justify-center ${
          disabled
            ? 'text-gray-400 cursor-not-allowed'
            : 'text-[#F54538] hover:bg-[#FEF2F2]'
        }`}
      >
        {text || t.common.back}
      </button>
    </div>
  );
}
