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
    return base + extra;
  }
  if (time.includes(':')) {
    const parts = time.split(':');
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes + seconds / 100;
  }
  const singleNumber = parseInt(time, 10);
  if (!isNaN(singleNumber)) {
    return singleNumber;
  }
  return 0;
}

export function numberToSpanishWords(n: number): string {
  const words = [
    "CERO", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ",
    "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE"
  ];
  
  if (n <= 20) return words[n];
  
  const tens = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  if (n < 100) {
    const ten = Math.floor(n / 10);
    const unit = n % 10;
    if (unit === 0) return tens[ten];
    if (ten === 2) return `VEINTI${words[unit]}`;
    return `${tens[ten]} Y ${words[unit]}`;
  }
  
  return n.toString(); // Fallback para números muy altos
}
