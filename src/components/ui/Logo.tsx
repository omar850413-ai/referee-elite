'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// A classic, clean, SVG-based soccer ball icon.
const SoccerBallIcon = ({ className }: { className?: string }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      className={cn('w-8 h-8', className)}
    >
      <path
        d="M256 512c141.4 0 256-114.6 256-256S397.4 0 256 0 0 114.6 0 256s114.6 256 256 256z"
        fill="#fff"
        stroke="black"
        strokeWidth="10"
      />
      <path
        d="M256 208l-40-72h-72l-40 72 40 72h72l40-72zM256 32l88 56-32 96h-112l-32-96 88-56zm0 448l-88-56 32-96h112l32 96-88 56zM88 144l88-56-32 96-88 56-56-88 88-56zm336 224l-88 56 32-96 88-56 56 88-88 56zM88 368l56 88 88-56-56-88-88-56-56 88zm336-224l-56-88-88 56 56 88 88 56 56-88z"
        fill="black"
      />
    </svg>
);


interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  return (
    <div className={cn("flex items-center justify-center gap-1.5", className)}>
        <span className="text-3xl font-black italic tracking-tighter">
            <span className="text-blue-900">Asesor</span>
            <span className="text-emerald-500">Pro</span>
        </span>
        <SoccerBallIcon />
    </div>
  );
};
