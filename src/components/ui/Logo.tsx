'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center", className)}>
        <span className="text-3xl font-black italic tracking-tighter">
            <span className="text-blue-900">Refere</span>
            <span className="text-emerald-500">Elite</span>
        </span>
    </div>
  );
};
