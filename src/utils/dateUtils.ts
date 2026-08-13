import { WarrantyStatusType } from '../types/receipt';

/**
 * Calculates the number of days between today and a target date string (YYYY-MM-DD)
 */
export function getDaysRemaining(targetDateStr?: string): number | null {
  if (!targetDateStr) return null;
  const target = new Date(targetDateStr);
  if (isNaN(target.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines warranty status
 */
export function getWarrantyStatus(expirationDateStr?: string): {
  status: WarrantyStatusType;
  daysRemaining: number | null;
  label: string;
} {
  if (!expirationDateStr) {
    return { status: 'none', daysRemaining: null, label: 'No Warranty' };
  }

  const days = getDaysRemaining(expirationDateStr);
  if (days === null) {
    return { status: 'none', daysRemaining: null, label: 'No Warranty' };
  }

  if (days < 0) {
    const pastDays = Math.abs(days);
    return {
      status: 'expired',
      daysRemaining: days,
      label: `Expired ${pastDays} ${pastDays === 1 ? 'day' : 'days'} ago`,
    };
  } else if (days <= 30) {
    return {
      status: 'expiring_soon',
      daysRemaining: days,
      label: `Expiring in ${days} ${days === 1 ? 'day' : 'days'}`,
    };
  } else {
    const months = Math.round(days / 30);
    return {
      status: 'active',
      daysRemaining: days,
      label: `Active (${days} days / ~${months} mo left)`,
    };
  }
}

/**
 * Formats YYYY-MM-DD to a clean readable date
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Formats currency amount
 */
export function formatCurrency(amount: number, currency = '$'): string {
  const symbol = currency === 'USD' ? '$' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Computes an expiration date given purchase date and duration months
 */
export function calculateExpirationDate(purchaseDateStr: string, months: number): string {
  try {
    const d = new Date(purchaseDateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}
