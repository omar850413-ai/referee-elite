'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center select-none", className)}>
        <span className="text-4xl md:text-5xl font-black italic tracking-tighter flex items-center gap-1">
            <span 
              className="text-[#1e40af] drop-shadow-[0_2px_0_rgba(255,255,255,1)]" 
              style={{ 
                WebkitTextStroke: '1.5px white',
                paintOrder: 'stroke fill'
              }}
            >
              Referee
            </span>
            <span className="bg-gradient-to-b from-[#f3cf7a] via-[#d4af37] to-[#b8860b] bg-clip-text text-transparent drop-shadow-sm">
              Elite
            </span>
        </span>
    </div>
  );
};
