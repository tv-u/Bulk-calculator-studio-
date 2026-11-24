export type NumberLocaleMode = 'en-IN' | 'en-US';

export function formatNumber(
  value: number,
  options?: { locale?: NumberLocaleMode; decimals?: number }
): string {
  if (!Number.isFinite(value)) return '—';
  const locale = options?.locale ?? 'en-IN';
  const decimals = options?.decimals ?? 2;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatCurrency(
  value: number,
  currency = 'INR',
  locale?: NumberLocaleMode
): string {
  if (!Number.isFinite(value)) return '—';
  const resolvedLocale = locale ?? (currency === 'INR' ? 'en-IN' : 'en-US');
  return new Intl.NumberFormat(resolvedLocale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatIndianCompact(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e7) {
    return `${sign}${(abs / 1e7).toFixed(2)} Cr`;
  }
  if (abs >= 1e5) {
    return `${sign}${(abs / 1e5).toFixed(2)} Lakh`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(2)} K`;
  }
  return formatNumber(value, { locale: 'en-IN', decimals: 2 });
}

export function formatDateIndia(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
