import { toEnglishDigits } from './persian';

/**
 * Iranian bank card / IBAN helpers.
 *
 * Never logged, never transmitted — there is no backend. Note that the JSON
 * backup file DOES contain these values, which the export UI states explicitly.
 */

/**
 * BIN → bank name. A convenience for auto-filling the label, NOT validation:
 * an unrecognised BIN is a soft warning, never a hard block, because this table
 * will go stale as banks merge and new prefixes are issued.
 */
export const CARD_BINS: Record<string, string> = {
  '603799': 'بانک ملی ایران',
  '589210': 'بانک سپه',
  '627648': 'بانک توسعه صادرات',
  '207177': 'بانک توسعه صادرات',
  '627353': 'بانک تجارت',
  '585983': 'بانک تجارت',
  '627961': 'بانک صنعت و معدن',
  '603770': 'بانک کشاورزی',
  '639217': 'بانک کشاورزی',
  '628023': 'بانک مسکن',
  '627760': 'پست بانک ایران',
  '502908': 'بانک توسعه تعاون',
  '627412': 'بانک اقتصاد نوین',
  '622106': 'بانک پارسیان',
  '639194': 'بانک پارسیان',
  '627884': 'بانک پارسیان',
  '502229': 'بانک پاسارگاد',
  '639347': 'بانک پاسارگاد',
  '627488': 'بانک کارآفرین',
  '502910': 'بانک کارآفرین',
  '621986': 'بانک سامان',
  '639346': 'بانک سینا',
  '639607': 'بانک سرمایه',
  '502806': 'بانک شهر',
  '504706': 'بانک شهر',
  '502938': 'بانک دی',
  '603769': 'بانک صادرات ایران',
  '610433': 'بانک ملت',
  '991975': 'بانک ملت',
  '505785': 'بانک ایران زمین',
  '636214': 'بانک آینده',
  '636949': 'بانک حکمت ایرانیان',
  '627381': 'بانک انصار',
  '505416': 'بانک گردشگری',
  '505801': 'مؤسسه کوثر',
  '606373': 'بانک قرض‌الحسنه مهر ایران',
};

export function normalizeDigits(value: string): string {
  return toEnglishDigits(value).replace(/\D/g, '');
}

/** 1234 5678 9012 3456 — display only; storage keeps bare digits. */
export function formatCardNumber(value: string): string {
  const digits = normalizeDigits(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

/** Luhn checksum. A 16-digit card failing this is definitely a typo. */
export function isValidCardNumber(value: string): boolean {
  const digits = normalizeDigits(value);
  if (digits.length !== 16) return false;

  let sum = 0;
  for (let i = 0; i < 16; i++) {
    let d = Number(digits[15 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

export function bankOfCard(value: string): string | null {
  const digits = normalizeDigits(value);
  if (digits.length < 6) return null;
  return CARD_BINS[digits.slice(0, 6)] ?? null;
}

export function normalizeIban(value: string): string {
  const raw = toEnglishDigits(value).replace(/\s/g, '').toUpperCase();
  return raw.startsWith('IR') ? raw : raw ? `IR${raw.replace(/^IR/, '')}` : '';
}

/** IR + 24 digits, validated by the ISO 13616 mod-97 checksum. */
export function isValidIban(value: string): boolean {
  const cleaned = normalizeIban(value);
  if (!/^IR\d{24}$/.test(cleaned)) return false;

  const rearranged = cleaned.slice(4) + cleaned.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

  // Chunked to stay inside Number's safe integer range.
  let remainder = 0;
  for (const chunk of numeric.match(/.{1,9}/g) ?? []) {
    remainder = Number(String(remainder) + chunk) % 97;
  }
  return remainder === 1;
}

/** IR12 3456 7890 1234 5678 9012 34 */
export function formatIban(value: string): string {
  const cleaned = normalizeIban(value);
  if (!cleaned) return '';
  return cleaned.replace(/(.{4})(?=.)/g, '$1 ').trim();
}
