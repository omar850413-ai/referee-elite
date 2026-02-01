'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// A modern, clean, SVG-based soccer ball icon.
const SoccerBallIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={cn("w-7 h-7", className)}
    >
        <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1.218 4.004h2.436l.983 2.996-2.19.001-2.21-.001.981-2.995zm5.55 1.56l-1.954.94.49 1.494h2.438a8.019 8.019 0 0 0-1.024-2.434zM5.668 7.564a8.014 8.014 0 0 0-1.023 2.434h2.438l.49-1.494-1.905-.94zm5.114 3.001h2.436l.981 2.995H12l-1.218-2.995zM9.363 8.51l1.905.94-1.44 4.38-2.437.001-.982-2.996 2.954-2.325zm5.274 0l2.954 2.325-.982 2.996-2.437-.001-1.44-4.38 1.905-.94zm-7.605 5.54h2.437l1.44-4.38-2.954-2.324a8.006 8.006 0 0 0-1.44 3.708l.517 2.996zm9.944 0l.517-2.996a8.006 8.006 0 0 0-1.44-3.708l-2.954 2.324 1.44 4.38h2.437zM8.332 16.44a8.016 8.016 0 0 0 1.023 2.434l1.905-.94-.49-1.494H8.332zm7.336 0h-2.438l-.49 1.494 1.905.94a8.011 8.011 0 0 0 1.023-2.434z"/>
    </svg>
);


interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
        <span className="text-3xl font-black italic tracking-tighter">
            <span className="text-slate-700">Asesor</span>
            <span className="text-emerald-500">Pro</span>
        </span>
        <SoccerBallIcon className="text-slate-800" />
    </div>
  );
};
