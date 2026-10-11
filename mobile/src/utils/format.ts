/**
 * All formatting functions use manual arithmetic instead of toLocaleString
 * because Hermes engine (React Native) has inconsistent locale support.
 */

export function formatRupees(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n) || n === null || n === undefined) return '₹0';

  // Format as Indian number system: last 3 digits, then groups of 2
  const fixed = Math.abs(n).toFixed(2);
  const [intPart, decPart] = fixed.split('.');

  let result = '';
  const len = intPart.length;
  if (len <= 3) {
    result = intPart;
  } else {
    result = intPart.slice(-3);
    let remaining = intPart.slice(0, -3);
    while (remaining.length > 2) {
      result = remaining.slice(-2) + ',' + result;
      remaining = remaining.slice(0, -2);
    }
    result = remaining + ',' + result;
  }

  // Remove unnecessary decimal
  const prefix = n < 0 ? '-₹' : '₹';
  return decPart === '00'
    ? `${prefix}${result}`
    : `${prefix}${result}.${decPart}`;
}

export function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    const h    = d.getHours();
    const m    = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  } catch {
    return '—';
  }
}

export function formatDate(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  try {
    const plain = isoStr.split('T')[0];
    const parts = plain.split('-');
    if (parts.length !== 3) return isoStr;
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  } catch {
    return '—';
  }
}

export function getGreeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function computeCashTotal(
  entries: { denomination: number; quantity: string }[]
): number {
  return entries.reduce(
    (sum, e) => sum + (parseInt(e.quantity, 10) || 0) * e.denomination,
    0
  );
}

/**
 * Safely convert a value that may come as string from Postgres NUMERIC
 * to a JavaScript number.
 */
export function toNum(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === 'string' ? parseFloat(val) : Number(val);
  return isNaN(n) ? 0 : n;
}
