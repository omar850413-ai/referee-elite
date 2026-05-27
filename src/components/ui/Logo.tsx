'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center select-none", className)}>
        <span className="text-4xl md:text-5xl font-black italic tracking-tighter flex items-center">
            <span className="text-blue-800">
              Referee
            </span>
            <span className="text-emerald-500 ml-1">
              Elite
            </span>
        </span>
    </div>
  );
};
