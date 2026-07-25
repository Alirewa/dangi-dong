import {
  jalaaliMonthLength,
  toGregorian as toGregorianParts,
  toJalaali as toJalaaliParts,
} from 'jalaali-js';

/**
 * Jalali calendar helpers.
 *
 * `Intl` can render a Gregorian date in the Persian calendar, but it cannot go
 * the other way — and date *entry* needs Jalali → Gregorian, because state is
 * always stored as ISO Gregorian. jalaali-js provides that inverse; calendar
 * arithmetic is exactly the wrong thing to hand-roll.
 *
 * Periods remain labelled buckets rather than date ranges, so the only period
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

// ── date entry (Jalali ⇄ ISO Gregorian) ──────────────────────────────────────

export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** ISO Gregorian 'YYYY-MM-DD' → Jalali parts. Falls back to today if unparseable. */
export function isoToJalali(iso: string): JalaliDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '');
  if (!m) return isoToJalali(todayIsoLocal());
  const { jy, jm, jd } = toJalaaliParts(Number(m[1]), Number(m[2]), Number(m[3]));
  return { jy, jm, jd };
}

/** Jalali parts → ISO Gregorian 'YYYY-MM-DD'. */
export function jalaliToIso({ jy, jm, jd }: JalaliDate): string {
  const clampedDay = Math.min(Math.max(jd, 1), jalaliMonthLength(jy, jm));
  const { gy, gm, gd } = toGregorianParts(jy, jm, clampedDay);
  return `${gy}-${pad(gm)}-${pad(gd)}`;
}

/** Days in a Jalali month, leap years included. */
export function jalaliMonthLength(jy: number, jm: number): number {
  return jalaaliMonthLength(jy, jm);
}

function todayIsoLocal(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
