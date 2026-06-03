import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  const getPosClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-[10px]';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-[10px]';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-[10px]';
    }
  };

  return (
    <div 
      className="relative inline-block w-full"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute z-[9999] pointer-events-none bg-slate-900 border border-slate-800 text-white text-[10.5px] font-extrabold px-3 py-1.5 rounded-lg shadow-xl whitespace-normal break-words max-w-[200px] text-center leading-normal font-sans ${getPosClasses()} ${className}`}
          >
            {content}
            {/* Draw a subtle arrow */}
            <div className={`absolute w-1.5 h-1.5 bg-slate-900 rotate-45 border-slate-800 ${
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 translate-y-1/2 border-t border-l' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-t border-r' :
              position === 'right' ? 'right-full top-1/2 -translate-y-1/2 translate-x-1/2 border-b border-l' :
              'top-full left-1/2 -translate-x-1/2 -translate-y-1/2 border-b border-r'
            }`} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
