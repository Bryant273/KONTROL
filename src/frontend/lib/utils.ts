import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanText(str: string): string {
  if (!str) return '';
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents cleanly (é -> e, è -> e, etc.)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D«»]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/°/g, '.')
    .replace(/€/g, 'EUR')
    .replace(/[^\x00-\x7F]/g, ''); // strip remaining unknown non-ASCII cleanly
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

export function generateInvoiceReference(
  companyName: string, 
  existingTransactions: { date: number }[], 
  transactionDate: number,
  companyAbbreviation?: string
): string {
  let abbrev = 'KTR';

  if (companyAbbreviation && companyAbbreviation.trim().length > 0) {
    abbrev = companyAbbreviation.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  } else {
    // Normalize and clean company abbreviation automatically
    const cleanName = (companyName || 'KE').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const alphaOnly = cleanName.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
    const words = alphaOnly.split(/\s+/);
    
    if (words.length >= 2) {
      abbrev = words.map(w => w[0]).join('').slice(0, 4);
    } else if (alphaOnly) {
      abbrev = alphaOnly.slice(0, 4);
    }
  }
  
  if (!abbrev) abbrev = 'KTR';

  // Format date as YYMMDD
  const d = new Date(transactionDate);
  const yy = d.getFullYear().toString().slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  const dateStr = `${yy}${mm}${jj}`;

  // Count existing transactions today
  const todayTransactions = existingTransactions.filter(t => {
    if (!t.date) return false;
    const tD = new Date(t.date);
    const ty = tD.getFullYear().toString().slice(-2);
    const tm = String(tD.getMonth() + 1).padStart(2, '0');
    const tj = String(tD.getDate()).padStart(2, '0');
    return `${ty}${tm}${tj}` === dateStr;
  });

  const sequentialNum = todayTransactions.length + 1;
  return `FACT-${abbrev}-${dateStr}-${sequentialNum}`;
}
