import React from 'react';

interface BackButtonProps {
  onClick: () => void;
  text?: string;
  disabled?: boolean;
}

export function BackButton({
  onClick,
  text = 'Back',
  disabled = false,
}: BackButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 rounded-lg transition-colors ${
        disabled
          ? 'text-gray-400 cursor-not-allowed'
          : 'text-[#F54538] hover:bg-[#FEF2F2]'
      }`}
    >
      {text}
    </button>
  );
}
