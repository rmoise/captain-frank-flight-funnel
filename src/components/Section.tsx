import React from 'react';
import type { EyebrowProps } from '@/types/components';

interface SectionProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  eyebrow,
  title,
  subtitle,
  children,
  className = '',
}) => {
  return (
    <section className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        {eyebrow && (
          <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-gray-600">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
};