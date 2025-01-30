import React, { useCallback, useState, useEffect } from 'react';

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
  text = 'Weiter',
  loadingText = 'Wird bearbeitet...',
  children,
}: ContinueButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const isLoading = externalIsLoading || internalIsLoading;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      console.log('=== Continue Button Click ===');
      console.log('Button State:', { disabled, isLoading });

      if (disabled || isLoading) {
        return;
      }

      setInternalIsLoading(true);

      try {
        if (onClick) {
          await onClick(e);
        }
      } finally {
        setInternalIsLoading(false);
      }

      console.log('onClick handler executed');
      console.log('=== End Continue Button Click ===');
    },
    [disabled, isLoading, onClick]
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
          <span>{children || text}</span>
        </div>
      </button>
    );
  }

  const isDisabled = disabled || isLoading;

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
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-[#F54538] hover:bg-[#E03F33] text-white shadow-sm hover:shadow-md active:shadow-sm'
          }
        `}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>{loadingText}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <span className="block sm:hidden">
              {text === 'Antrag einreichen' ? text : 'Weiter'}
            </span>
            <span className="hidden sm:block">{children || text}</span>
          </div>
        )}
      </button>
    </div>
  );
}
