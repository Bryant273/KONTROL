import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  size?: number | 'sm' | 'md' | 'lg';
  showText?: boolean;
  companyLogo?: string;
}

export function Logo({ className, size = 32, companyLogo }: LogoProps) {
  const pixelSize = typeof size === 'number' ? size : 
                   size === 'sm' ? 24 :
                   size === 'md' ? 40 :
                   size === 'lg' ? 64 : 32;
  
  if (companyLogo) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <img 
          src={companyLogo} 
          alt="Company Logo" 
          className="rounded-xl object-contain bg-white border border-kontrol-border shadow-sm"
          style={{ width: pixelSize, height: pixelSize }}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative shrink-0" style={{ width: pixelSize, height: pixelSize }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Swirl Background */}
          <path 
            d="M50 10 C 72 10, 90 28, 90 50 C 90 72, 72 90, 50 90 C 35 90, 22 82, 15 70" 
            fill="none" 
            stroke="#F97316" 
            strokeWidth="12" 
            strokeLinecap="round"
          />
          <path 
            d="M50 90 C 28 90, 10 72, 10 50 C 10 28, 28 10, 50 10 C 65 10, 78 18, 85 30" 
            fill="none" 
            stroke="#7DD3FC" 
            strokeWidth="12" 
            strokeLinecap="round"
          />
          {/* Arrow */}
          <path 
            d="M50 20 L75 55 H60 V80 H40 V55 H25 L50 20 Z" 
            fill="#3B82F6"
          />
        </svg>
      </div>
    </div>
  );
}
