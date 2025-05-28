import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  subtitle,
  className = '',
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {eyebrow && (
        <p className="text-sm font-medium text-red-500 uppercase tracking-wide">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="text-gray-600">{subtitle}</p>}
    </div>
  );
};
