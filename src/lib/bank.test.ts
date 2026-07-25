import { describe, expect, it } from 'vitest';
import {
  bankOfCard,
  formatCardNumber,
  formatIban,
  isValidCardNumber,
  isValidIban,
  normalizeDigits,
  normalizeIban,
} from './bank';

describe('normalizeDigits', () => {
  it('converts Persian digits', () => {
    expect(normalizeDigits('۶۱۰۴۳۳۷۸')).toBe('61043378');
  });

  it('converts Arabic-Indic digits, which iOS keyboards emit', () => {
    expect(normalizeDigits('٦١٠٤')).toBe('6104');
  });

  it('strips separators and spaces', () => {
    expect(normalizeDigits('6104-3378 1234')).toBe('610433781234');
  });
});

describe('formatCardNumber', () => {
  it('groups in fours', () => {
    expect(formatCardNumber('6104337812345678')).toBe('6104 3378 1234 5678');
  });

  it('truncates past 16 digits', () => {
    expect(formatCardNumber('61043378123456789999')).toBe('6104 3378 1234 5678');
  });

  it('handles a partial number', () => {
    expect(formatCardNumber('610433')).toBe('6104 33');
  });
});

describe('isValidCardNumber', () => {
  it('accepts a Luhn-valid 16-digit number', () => {
    // Check digits computed against the Luhn algorithm, not invented.
    expect(isValidCardNumber('6104337812345674')).toBe(true);
    expect(isValidCardNumber('6037991234567893')).toBe(true);
  });

  it('rejects a single-digit typo', () => {
    expect(isValidCardNumber('6104337812345675')).toBe(false);
  });

  it('rejects the wrong length', () => {
    expect(isValidCardNumber('610433781234567')).toBe(false);
    expect(isValidCardNumber('')).toBe(false);
  });
});

describe('bankOfCard', () => {
  it('resolves a known BIN', () => {
    expect(bankOfCard('6104337812345674')).toBe('بانک ملت');
    expect(bankOfCard('603799')).toBe('بانک ملی ایران');
  });

  it('returns null for an unknown BIN rather than guessing', () => {
    expect(bankOfCard('9999997812345678')).toBeNull();
  });

  it('returns null before six digits are entered', () => {
    expect(bankOfCard('610')).toBeNull();
  });
});

describe('IBAN', () => {
  it('normalizes spacing and case', () => {
    expect(normalizeIban('ir66 0540 1027 8000 8975 2143 51')).toBe('IR660540102780008975214351');
  });

  it('accepts a checksum-valid IBAN', () => {
    expect(isValidIban('IR660540102780008975214351')).toBe(true);
  });

  it('rejects a broken checksum', () => {
    expect(isValidIban('IR670540102780008975214351')).toBe(false);
  });

  it('rejects the wrong length or country', () => {
    expect(isValidIban('IR66054010278000897521435')).toBe(false);
    expect(isValidIban('DE89370400440532013000')).toBe(false);
  });

  it('formats in groups of four', () => {
    expect(formatIban('IR660540102780008975214351')).toBe('IR66 0540 1027 8000 8975 2143 51');
  });
});
