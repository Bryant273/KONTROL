import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'XOF') {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }
  const parts = Math.round(amount).toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const formattedAmount = parts.join('.');
  
  if (currency === 'XOF') return `${formattedAmount} F CFA`;
  if (currency === 'USD') return `$${formattedAmount}`;
  if (currency === 'EUR') return `${formattedAmount} €`;
  return `${formattedAmount} ${currency}`;
}

export function formatDate(date: number | Date, locale: string = 'fr-CI') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(date);
}
