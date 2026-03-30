import React from 'react';
import { cn } from '../../lib/utils';

interface LogoProps {
  className?: string;
  companyLogo?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, companyLogo, size = 'md' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  // Default KONTROL logo (High quality SVG based on user request)
  const DefaultLogo = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="48" stroke="url(#logoGradient)" strokeWidth="4" strokeOpacity="0.2" />
      <path d="M50 10L90 50L50 90L10 50L50 10Z" fill="#3B82F6" className="animate-pulse" />
      <path d="M50 10C72.09 10 90 27.91 90 50C90 72.09 72.09 90 50 90" stroke="#F97316" strokeWidth="10" strokeLinecap="round" />
      <path d="M50 10C27.91 10 10 27.91 10 50C10 72.09 27.91 90 50 90" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round" strokeDasharray="15 10" />
      <circle cx="50" cy="50" r="12" fill="white" shadow-sm="true" />
      <path d="M44 50L50 44L56 50L50 56L44 50Z" fill="#F97316" />
    </svg>
  );

  return (
    <div className={cn(
      "flex items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm border border-kontrol-border",
      sizeClasses[size],
      className
    )}>
      {companyLogo ? (
        <img 
          src={companyLogo} 
          alt="Company Logo" 
          className="w-full h-full object-contain p-1.5"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-full h-full p-2 text-kontrol-blue">
          {/* Default KONTROL logo - High quality SVG */}
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#F97316" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="48" stroke="url(#logoGradient)" strokeWidth="4" strokeOpacity="0.2" />
            <path d="M50 10L90 50L50 90L10 50L50 10Z" fill="#3B82F6" className="animate-pulse" />
            <path d="M50 10C72.09 10 90 27.91 90 50C90 72.09 72.09 90 50 90" stroke="#F97316" strokeWidth="10" strokeLinecap="round" />
            <path d="M50 10C27.91 10 10 27.91 10 50C10 72.09 27.91 90 50 90" stroke="#3B82F6" strokeWidth="10" strokeLinecap="round" strokeDasharray="15 10" />
            <circle cx="50" cy="50" r="12" fill="white" />
            <path d="M44 50L50 44L56 50L50 56L44 50Z" fill="#F97316" />
          </svg>
        </div>
      )}
    </div>
  );
}
