/**
 * Format a number as Indian Rupees: ₹1,25,000
 */
export function formatRupees(amount: number | string): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/**
 * Format a date string YYYY-MM-DD → DD/MM/YYYY
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  // Handle both YYYY-MM-DD and ISO timestamps
  const plain = dateStr.split('T')[0];
  const [y, m, d] = plain.split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Format an ISO timestamp to DD-MM-YYYY HH:MM AM/PM
 */
export function formatDateTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleString('en-IN', {
    day:    '2-digit',
    month:  '2-digit',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format just the time portion: HH:MM AM/PM
 */
export function formatTime(isoStr: string | null | undefined): string {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

/**
 * Convert YYYY-MM-DD to input[type=date] value (same format, already correct).
 */
export function toInputDate(dateStr: string): string {
  return dateStr || '';
}

/**
 * Time-based greeting: "Good morning/afternoon/evening, Name"
 */
export function getGreeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return `${g}, ${name}`;
}
