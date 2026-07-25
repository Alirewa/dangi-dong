'use client';

import { useId } from 'react';
import { useT } from '@/hooks/useT';
import { formatDate } from '@/lib/format';
import {
  JALALI_MONTHS_EN,
  JALALI_MONTHS_FA,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
} from '@/lib/jalali';
import { toPersianDigits } from '@/lib/persian';
import { todayIso } from '@/lib/utils';
import { cn } from '@/lib/utils';

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayIso(d);
}

/**
 * Jalali date entry, storing ISO Gregorian.
 *
 * Three native <select>s rather than a calendar widget: they get the platform's
 * own wheel picker on mobile, need no CSS overrides (react-multi-date-picker
 * costs ~120 lines of them in factor-saz), and cannot produce an invalid date
 * because the day list is derived from the chosen month's real length.
 *
 * A Gregorian <input type="date"> was the previous behaviour and was simply
 * wrong for this audience — nobody logging household expenses in Iran thinks
 * in Gregorian dates.
 */
export function DateField({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const { t, locale } = useT();
  const id = useId();

  const { jy, jm, jd } = isoToJalali(value);
  const months = locale === 'fa' ? JALALI_MONTHS_FA : JALALI_MONTHS_EN;
  const daysInMonth = jalaliMonthLength(jy, jm);

  const num = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  // A decade back and one year forward covers logging past expenses without
  // making the year list unusable.
  const thisYear = isoToJalali(todayIso()).jy;
  const years = Array.from({ length: 12 }, (_, i) => thisYear + 1 - i);

  const today = todayIso();
  const yesterday = yesterdayIso();

  const chips = [
    { iso: today, label: t.common.today },
    { iso: yesterday, label: t.common.yesterday },
  ];

  const set = (next: Partial<{ jy: number; jm: number; jd: number }>) => {
    onChange(jalaliToIso({ jy: next.jy ?? jy, jm: next.jm ?? jm, jd: next.jd ?? jd }));
  };

  const selectClass =
    'min-h-11 rounded-lg border border-border bg-surface px-2 text-sm transition-colors ' +
    'focus:border-primary disabled:opacity-60';

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium" id={`${id}-label`}>
        {label}
      </span>

      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
        {chips.map((chip) => (
          <button
            key={chip.iso}
            type="button"
            disabled={disabled}
            aria-pressed={value === chip.iso}
            onClick={() => onChange(chip.iso)}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
              value === chip.iso
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface hover:bg-surface-2'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label={t.common.day}
          disabled={disabled}
          value={jd}
          onChange={(e) => set({ jd: Number(e.target.value) })}
          className={selectClass}
        >
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {num(d)}
            </option>
          ))}
        </select>

        <select
          aria-label={t.common.month}
          disabled={disabled}
          value={jm}
          onChange={(e) => set({ jm: Number(e.target.value) })}
          className={selectClass}
        >
          {months.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>

        <select
          aria-label={t.common.year}
          disabled={disabled}
          value={jy}
          onChange={(e) => set({ jy: Number(e.target.value) })}
          className={selectClass}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {num(y)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-muted">{formatDate(value, locale)}</p>
    </div>
  );
}
