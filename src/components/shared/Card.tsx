import React, { forwardRef } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(({ children, className = '' }, ref) => {
  return (
    <div
      ref={ref}
      className={`bg-white rounded-tr-2xl rounded-bl-2xl rounded-br-2xl [border-top-left-radius:0] will-change-transform ${className}`}
    >
      <div className="pt-6 px-6 pb-6">
        {children}
      </div>
    </div>
  );
});