import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function parseTimeToMinutes(time: string): number {
  if (typeof time !== 'string') return 0;
  
  if (time.includes('+')) {
    const parts = time.split('+');
    const base = parseInt(parts[0], 10) || 0;
    const extra = parseInt(parts[1], 10) || 0;
    // For sorting, treat 45+1 as 46, but add a small fraction to keep order from original time
    return base + extra;
  }
  if (time.includes(':')) {
    const parts = time.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes + seconds / 100; // Use 100 to avoid conflicts with '+' times
  }
  // Handle cases like '45' from halftime
  const singleNumber = parseInt(time, 10);
  if (!isNaN(singleNumber)) {
    return singleNumber;
  }
  return 0; // fallback
}
