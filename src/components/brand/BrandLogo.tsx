import React from 'react';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'compact';
}

/**
 * Official Carbon Car Care logo component.
 * Uses public/brand/carbon_logo.png with strict preservation of original colors,
 * aspect ratio (~5.8:1), and whitespace. Placed only on white/light neutral surfaces.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  className,
  size = 'md',
  variant = 'full',
}) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-9 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto',
  };

  return (
    <div className={cn('inline-flex items-center select-none', className)}>
      <img
        src="/brand/carbon_logo.png"
        alt="Carbon Car Care"
        className={cn('object-contain', sizeClasses[size])}
        loading="eager"
      />
      {variant === 'compact' && (
        <span className="sr-only">Carbon Car Care</span>
      )}
    </div>
  );
};
