import React from 'react';
import { Eyebrow } from './Eyebrow';

interface SectionProps {
  step?: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Section: React.FC<SectionProps> = ({
  step,
  title,
  children,
  className = '',
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {step && <Eyebrow text={`Step ${step}`} />}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  );
};