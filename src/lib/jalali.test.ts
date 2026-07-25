import { describe, expect, it } from 'vitest';
import {
  currentJalaliMonth,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  monthKey,
  nextMonth,
  prevMonth,
} from './jalali';

describe('Jalali ⇄ ISO conversion', () => {
  it('converts a known date both ways', () => {
    expect(isoToJalali('2026-07-25')).toEqual({ jy: 1405, jm: 5, jd: 3 });
    expect(jalaliToIso({ jy: 1405, jm: 5, jd: 3 })).toBe('2026-07-25');
  });

  it('round-trips across a full year without drift', () => {
    const start = new Date(Date.UTC(2026, 0, 1));
    for (let i = 0; i < 366; i++) {
      const d = new Date(start.getTime() + i * 86_400_000);
      const iso = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
        d.getUTCDate()
      ).padStart(2, '0')}`;
      expect(jalaliToIso(isoToJalali(iso))).toBe(iso);
    }
  });

  it('handles the Nowruz boundary', () => {
    // 1 Farvardin 1405 falls on 21 March 2026.
    expect(jalaliToIso({ jy: 1405, jm: 1, jd: 1 })).toBe('2026-03-21');
    expect(isoToJalali('2026-03-20')).toEqual({ jy: 1404, jm: 12, jd: 29 });
  });

  it('pads single-digit months and days', () => {
    expect(jalaliToIso({ jy: 1404, jm: 10, jd: 12 })).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('clamps a day past the end of the month instead of rolling over', () => {
    // Esfand 1405 has 29 days; asking for the 31st must not spill into Farvardin.
    const iso = jalaliToIso({ jy: 1405, jm: 12, jd: 31 });
    expect(isoToJalali(iso)).toEqual({ jy: 1405, jm: 12, jd: 29 });
  });

  it('falls back to today for malformed input rather than throwing', () => {
    expect(() => isoToJalali('')).not.toThrow();
    expect(() => isoToJalali('nonsense')).not.toThrow();
    expect(isoToJalali('').jy).toBeGreaterThan(1300);
  });
});

describe('jalaliMonthLength', () => {
  it('gives 31 days to the first six months', () => {
    for (let m = 1; m <= 6; m++) expect(jalaliMonthLength(1405, m)).toBe(31);
  });

  it('gives 30 days to months seven through eleven', () => {
    for (let m = 7; m <= 11; m++) expect(jalaliMonthLength(1405, m)).toBe(30);
  });

  it('varies Esfand with the leap year', () => {
    expect(jalaliMonthLength(1403, 12)).toBe(30); // leap
    expect(jalaliMonthLength(1405, 12)).toBe(29);
  });
});

describe('month arithmetic', () => {
  it('wraps forward across the year boundary', () => {
    expect(nextMonth({ jy: 1405, jm: 12 })).toEqual({ jy: 1406, jm: 1 });
    expect(nextMonth({ jy: 1405, jm: 5 })).toEqual({ jy: 1405, jm: 6 });
  });

  it('wraps backward across the year boundary', () => {
    expect(prevMonth({ jy: 1405, jm: 1 })).toEqual({ jy: 1404, jm: 12 });
  });

  it('produces a zero-padded sortable key', () => {
    expect(monthKey({ jy: 1405, jm: 9 })).toBe('1405-09');
    expect(monthKey({ jy: 1405, jm: 11 }) > monthKey({ jy: 1405, jm: 9 })).toBe(true);
  });

  it('reports a plausible current month', () => {
    const { jy, jm } = currentJalaliMonth();
    expect(jy).toBeGreaterThan(1300);
    expect(jm).toBeGreaterThanOrEqual(1);
    expect(jm).toBeLessThanOrEqual(12);
  });
});
