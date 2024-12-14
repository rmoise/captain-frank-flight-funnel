import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white shadow-sm rounded-tr-2xl rounded-bl-2xl rounded-br-2xl [border-top-left-radius:0] ${className}`}>
      <div className="pt-6 px-6 pb-6">
        {children}
      </div>
    </div>
  );
};