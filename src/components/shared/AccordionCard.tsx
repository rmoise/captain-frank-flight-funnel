import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from './Card';
import { ChevronUpIcon, CheckCircleIcon, XCircleIcon, CheckIcon } from '@heroicons/react/24/outline';

interface AccordionCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isActive: boolean;
  isCompleted: boolean;
  eyebrow?: string;
  summary?: string;
  className?: string;
  shouldStayOpen?: boolean;
  hasInteracted?: boolean;
}

export const AccordionCard: React.FC<AccordionCardProps> = ({
  title,
  subtitle,
  children,
  isActive,
  isCompleted,
  eyebrow,
  summary,
  className = '',
  shouldStayOpen = false,
  hasInteracted = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(shouldStayOpen || true);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isCompleted && !shouldStayOpen) {
      // Add a 2-second delay before closing
      timeoutId = setTimeout(() => {
        setIsExpanded(false);
      }, 2000);
    }
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isCompleted, shouldStayOpen]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const showIcon = isCompleted || (hasInteracted && !isExpanded);
  const showSummary = isCompleted || hasInteracted || shouldStayOpen;

  return (
    <Card className={className}>
      <div className="relative">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={handleToggle}
        >
          <div className="flex-1">
            {eyebrow && (
              <div className="text-sm text-gray-500 mb-1">{eyebrow}</div>
            )}
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-semibold text-gray-900">{title}</h3>
            </div>
            {subtitle && isExpanded && (
              <p className="text-sm text-gray-500 mt-4">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-4">
            {showSummary && summary && !isExpanded && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-gray-600"
              >
                {summary}
              </motion.div>
            )}
            <div className="flex items-center gap-2">
              {showIcon && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {isCompleted ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-6 h-6 text-[#F54538]" />
                  )}
                </motion.div>
              )}
              <motion.div
                animate={{ rotate: isExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronUpIcon className="w-6 h-6 text-gray-400" />
              </motion.div>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? 'auto' : '0',
              opacity: isExpanded ? 1 : 0.5
            }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{
              pointerEvents: isExpanded ? 'auto' : 'none'
            }}
          >
            <div className="pt-4 relative">{children}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
};