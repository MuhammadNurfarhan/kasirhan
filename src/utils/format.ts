import { ProductUnit } from '../types';

export function formatRupiah(amount: number | null | undefined): string {
  const value = Math.round(amount ?? 0);
  return 'Rp ' + value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Format quantity display for UI and receipt.
 * If isWeighted is true (unit kg/liter), internal quantity is in grams/ml.
 * E.g., 500 grams displayed as 0,5 kg
 */
export function formatQuantity(
  qty: number,
  isWeighted: boolean,
  unit: ProductUnit = 'pcs'
): string {
  if (isWeighted) {
    if (unit === 'kg') {
      const kg = qty / 1000;
      return `${kg.toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg`;
    }
    if (unit === 'liter') {
      const l = qty / 1000;
      return `${l.toLocaleString('id-ID', { maximumFractionDigits: 3 })} liter`;
    }
  }
  return `${qty} ${unit}`;
}

/**
 * Parse input string to internal integer quantity.
 * If isWeighted, user types e.g. "0.5" -> 500 grams.
 */
export function parseQuantityInput(input: string, isWeighted: boolean): number {
  const clean = input.replace(',', '.').trim();
  const num = parseFloat(clean);
  if (isNaN(num) || num <= 0) return 0;
  if (isWeighted) {
    return Math.round(num * 1000);
  }
  return Math.max(1, Math.floor(num));
}

/**
 * Calculate line item subtotal.
 * If isWeighted: price is per kg (1000 grams).
 * Formula: Math.round((sellPrice * quantityInGrams) / 1000) - discount
 */
export function calculateLineSubtotal(
  sellPrice: number,
  quantity: number,
  isWeighted: boolean,
  discountAmount: number = 0
): number {
  let base: number;
  if (isWeighted) {
    base = Math.round((sellPrice * quantity) / 1000);
  } else {
    base = Math.round(sellPrice * quantity);
  }
  return Math.max(0, base - discountAmount);
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomStr}`;
}

export function generateInvoiceNumber(sequence: number = 1): string {
  const d = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const datePart = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  const seqPart = sequence.toString().padStart(4, '0');
  return `KSH-${datePart}-${seqPart}`;
}
