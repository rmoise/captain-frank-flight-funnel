import React, { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  PanInfo,
} from 'framer-motion';
import { createPortal } from 'react-dom';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  children,
  title,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetProgress = useMotionValue(0);
  const height = useTransform(sheetProgress, [0, 1], ['50vh', '100vh']);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Lock scroll
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${
        window.innerWidth - document.documentElement.clientWidth
      }px`;

      // Reset state
      setIsExpanded(false);
      sheetProgress.set(0);

      // Start expansion after a short delay
      const timeoutId = setTimeout(() => {
        setIsExpanded(true);
        animate(sheetProgress, 1, {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.2,
          onComplete: () => {
            if (contentRef.current) {
              contentRef.current.style.overflowY = 'auto';
            }
          },
        });
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      };
    } else {
      // Unlock scroll
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      setIsExpanded(false);
      sheetProgress.set(0);
    }
  }, [isOpen, sheetProgress]);

  const handleClose = () => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    setIsExpanded(false);
    onClose();
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const shouldClose =
      info.velocity.y > 500 || (info.offset.y > 100 && info.velocity.y > 0);

    if (shouldClose) {
      handleClose();
    } else {
      animate(sheetProgress, isExpanded ? 1 : 0, {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.2,
      });
    }
  };

  const sheetVariants = {
    hidden: {
      y: '100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.2,
      },
    },
    visible: {
      y: isExpanded ? '0%' : '50%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.2,
      },
    },
    exit: {
      y: '100%',
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.2,
      },
    },
  };

  if (!mounted) return null;

  const sheet = (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed inset-0 bg-black backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            style={{ height }}
            variants={sheetVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-x-0 bottom-0 rounded-t-[20px] bg-white shadow-2xl will-change-transform"
          >
            <div className="absolute right-4 top-4 z-10">
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="w-full flex justify-center pt-2 pb-4">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>
            {title && (
              <div className="px-4 mb-4">
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              </div>
            )}
            <div
              ref={contentRef}
              style={{
                height: 'calc(100% - 3rem)',
                overflowY: isExpanded ? 'auto' : 'hidden',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'env(safe-area-inset-bottom)',
                transform: 'translate3d(0,0,0)', // Force GPU acceleration
                willChange: 'transform', // Optimize for animations
              }}
              className="px-4 overflow-x-hidden"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(sheet, document.body);
};
