'use client';

import { ReactNode } from 'react';
import { useInView } from 'react-intersection-observer';

interface AnimatedSectionProps {
  children: ReactNode;
  delay: 1 | 2 | 3 | 4;
  direction?: 'up' | 'down' | 'left' | 'right';
}

export const AnimatedSection = ({
  children,
  delay,
  direction = 'up'
}: AnimatedSectionProps) => {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
    initialInView: false
  });

  const getTransformValue = () => {
    const distance = '30px';
    switch (direction) {
      case 'up': return `translateY(${distance})`;
      case 'down': return `translateY(-${distance})`;
      case 'left': return `translateX(${distance})`;
      case 'right': return `translateX(-${distance})`;
      default: return `translateY(${distance})`;
    }
  };

  return (
    <div
      ref={ref}
      className="will-change-transform"
      style={{
        transform: inView ? 'none' : getTransformValue(),
        opacity: inView ? 1 : 0,
        scale: inView ? '1' : '0.95',
        transition: `all 0.9s cubic-bezier(0.17, 0.55, 0.55, 1) ${(delay - 1) * 150}ms`
      }}
    >
      {children}
    </div>
  );
};