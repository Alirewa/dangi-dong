import type { Locale } from '@/types/dong';
import { JALALI_MONTHS_EN, JALALI_MONTHS_FA, type JalaliMonth } from './jalali';
import { toPersianDigits } from './persian';

/**
 * Locale-aware display formatting.
 *
 * fa → Persian-Indic digits with the Persian thousands separator (٬)
 * en → Latin digits with a comma
 *
 * Nothing here appends a currency word; <Money> does that, so callers cannot
 * accidentally bake "تومان" into an English string.
 */

/** U+066C ARABIC THOUSANDS SEPARATOR — the correct grouping mark in Persian. */
const FA_GROUP_SEPARATOR = '٬';

export function formatNumber(value: number, locale: Locale): string {
  const rounded = Math.round(value);
  const grouped = rounded.toLocaleString('en-US');
  if (locale === 'fa') {
    return toPersianDigits(grouped).replace(/,/g, FA_GROUP_SEPARATOR);
  }
  return grouped;
}

/** Signed, for balances: ‎+۱۲٬۰۰۰ / −۱۲٬۰۰۰ */
export function formatSigned(value: number, locale: Locale): string {
  const abs = formatNumber(Math.abs(value), locale);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return abs;
}

export function currencyLabel(locale: Locale): string {
  return locale === 'fa' ? 'تومان' : 'Toman';
}

/**
 * Arrow for "from → to", pointing along the reading direction.
 *
 * In RTL the payer is rendered to the right of the recipient, so the arrow has
 * to point left; a fixed ➜ pointed back at the payer and read as if the money
 * flowed the wrong way. Centralised so the image, the PDF and the text summary
 * cannot disagree.
 */
export function flowArrow(dir: 'rtl' | 'ltr'): string {
  return dir === 'rtl' ? '◀' : '▶';
}

/** Used only by exportText.ts, which has no React and so cannot use <Money>. */
export function formatMoneyText(value: number, locale: Locale): string {
  return `${formatNumber(value, locale)} ${currencyLabel(locale)}`;
}

export function formatJalaliMonth({ jy, jm }: JalaliMonth, locale: Locale): string {
  const name = locale === 'fa' ? JALALI_MONTHS_FA[jm - 1] : JALALI_MONTHS_EN[jm - 1];
  const year = locale === 'fa' ? toPersianDigits(jy) : String(jy);
  return `${name} ${year}`;
}

/** ISO Gregorian YYYY-MM-DD → Jalali display date. */
export function formatDate(iso: string, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-u-ca-persian', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

/** Short form for dense list rows: ۱۲ دی */
export function formatDateShort(iso: string, locale: Locale): string {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-u-ca-persian', {
      month: 'short',
      day: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}
