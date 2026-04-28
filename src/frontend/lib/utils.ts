import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  // Manual formatting to ensure a simple space as thousands separator
  // This avoids non-renderable characters in PDF exports
  const amountStr = Math.round(amount).toString();
  const formattedNumber = amountStr.replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  const currencyLabel = (currency === 'XOF' || currency === 'FCFA' || currency === 'CFA') ? 'FCFA' : currency;
  
  return `${formattedNumber} ${currencyLabel}`;
}

export function formatDate(date: number | string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(date));
}
