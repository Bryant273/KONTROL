import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'XOF', locale: string = 'fr-CI') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: number | Date, locale: string = 'fr-CI') {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(date);
}
