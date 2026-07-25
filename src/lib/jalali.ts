/**
 * Jalali helpers with zero dependencies.
 *
 * `Intl.DateTimeFormat` with the `persian` calendar does the conversion, so
 * jalaali-js / date-fns-jalali are unnecessary. (factor-saz declares
 * date-fns-jalali and never imports it — do not cargo-cult that.)
 *
 * Periods in this app are labelled buckets, not date ranges, so the only
 * arithmetic needed is "what Jalali month is it now" plus next/prev.
 */

export const JALALI_MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
] as const;

export const JALALI_MONTHS_EN = [
  'Farvardin',
  'Ordibehesht',
  'Khordad',
  'Tir',
  'Mordad',
  'Shahrivar',
  'Mehr',
  'Aban',
  'Azar',
  'Dey',
  'Bahman',
  'Esfand',
] as const;

export interface JalaliMonth {
  jy: number;
  jm: number; // 1..12
}

export function currentJalaliMonth(d: Date = new Date()): JalaliMonth {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
      year: 'numeric',
      month: 'numeric',
      timeZone: 'Asia/Tehran',
    }).formatToParts(d);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const jy = get('year');
    const jm = get('month');
    if (Number.isFinite(jy) && Number.isFinite(jm)) return { jy, jm };
  } catch {
    /* fall through */
  }
  // Environments without the persian calendar: approximate, never crash.
  return { jy: d.getFullYear() - 621, jm: 1 };
}

export function jalaliMonthOf(isoDate: string): JalaliMonth {
  const d = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(d.getTime()) ? currentJalaliMonth() : currentJalaliMonth(d);
}

export function nextMonth({ jy, jm }: JalaliMonth): JalaliMonth {
  return jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
}

export function prevMonth({ jy, jm }: JalaliMonth): JalaliMonth {
  return jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 };
}

/** Sortable key, e.g. 1405-09. */
export function monthKey({ jy, jm }: JalaliMonth): string {
  return `${jy}-${String(jm).padStart(2, '0')}`;
}
