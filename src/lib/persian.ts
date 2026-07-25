/**
 * Ported from persian-ui-kit/src/utils/persian.ts and validators.ts.
 * Copied rather than depended on: that package is CSS-Modules based and is not
 * published to npm.
 */

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** تبدیل ارقام لاتین به فارسی */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/**
 * تبدیل ارقام فارسی/عربی به لاتین.
 * Handling the Arabic-Indic set (٠-٩) as well as the Persian set matters: iOS
 * Persian keyboards emit the Arabic codepoints, not the Persian ones.
 */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** حذف جداکننده‌های هزار و تبدیل به عدد. NaN → 0. */
export function parseAmount(value: string): number {
  const cleaned = toEnglishDigits(value).replace(/[,،٬\s]/g, '');
  if (cleaned === '' || cleaned === '-') return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/** نرمال‌سازی شماره موبایل به فرمت 09xxxxxxxxx */
export function normalizeIranPhone(phone: string): string {
  const cleaned = toEnglishDigits(phone).replace(/\D/g, '');
  if (cleaned.startsWith('98') && cleaned.length === 12) return '0' + cleaned.slice(2);
  if (cleaned.startsWith('9') && cleaned.length === 10) return '0' + cleaned;
  return cleaned;
}

export function isValidIranPhone(phone: string): boolean {
  return /^09[0-9]{9}$/.test(normalizeIranPhone(phone));
}
