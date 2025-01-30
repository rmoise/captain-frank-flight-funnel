'use client';

import React, { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import * as Sheet from 'vaul';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sheetId = React.useId();
  const titleId = `${sheetId}-title`;
  const descriptionId = `${sheetId}-description`;

  return (
    <Sheet.Root
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      snapPoints={[0.5, 0.95]}
      activeSnapPoint={0.95}
      modal={true}
      shouldScaleBackground={false}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
        <Sheet.Content
          className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col rounded-t-[20px] bg-white focus:outline-none"
          style={{
            height: '98vh',
            minHeight: '50vh',
            maxHeight: '98vh',
            overscrollBehavior: 'contain',
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          tabIndex={-1}
        >
          <div role="document" className="flex flex-col h-full">
          <h2 id={titleId} className="sr-only">
            {title || 'Dialog Content'}
          </h2>
          <p id={descriptionId} className="sr-only">
              A bottom sheet dialog that slides up from the bottom of the
              screen. Drag the handle at the top to resize or swipe down to
              close.
          </p>
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-2 mb-4" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          {title && (
            <h3 className="px-4 mb-4 text-lg font-semibold text-gray-900">
              {title}
            </h3>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pb-16">{children}</div>
            </div>
          </div>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  );
};
