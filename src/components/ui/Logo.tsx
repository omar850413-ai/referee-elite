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
              className="text-blue-700 drop-shadow-[0_2px_0_rgba(255,255,255,1)]" 
              style={{ 
                WebkitTextStroke: '1px white'
              }}
            >
              Referee
            </span>
            <span className="bg-gradient-to-b from-emerald-400 to-emerald-600 bg-clip-text text-transparent drop-shadow-sm">
              Elite
            </span>
        </span>
    </div>
  );
};
