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

  return (
    <Sheet.Root
      open={isOpen}
      onOpenChange={(isOpen: boolean) => !isOpen && onClose()}
      snapPoints={[0.5, 0.95]}
      activeSnapPoint={0.95}
      modal={true}
      shouldScaleBackground={false}
    >
      <Sheet.Portal>
        <Sheet.Overlay className="fixed inset-0 bg-black/50 z-[9998]" />
        <Sheet.Content
          className="fixed bottom-0 left-0 right-0 z-[9999] flex flex-col rounded-t-[20px] bg-white"
          style={{
            height: '98vh',
            minHeight: '50vh',
            maxHeight: '98vh',
            overscrollBehavior: 'contain',
          }}
        >
          <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mt-2 mb-4" />
          <div className="absolute right-4 top-4 z-10">
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          {title && (
            <div className="px-4 mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pb-16">{children}</div>
          </div>
        </Sheet.Content>
      </Sheet.Portal>
    </Sheet.Root>
  );
};
