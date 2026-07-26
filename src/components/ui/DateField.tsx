'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
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
import { cn, todayIso } from '@/lib/utils';
import { Button } from './Button';
import { Sheet } from './Sheet';

/**
 * Date entry for expenses.
 *
 * Nearly every expense is logged the day it happens, so "today" is a single
 * tap and everything else sits behind a deliberate "pick a date" step rather
 * than three selects permanently occupying the form.
 *
 * The year is never asked for: it is carried over from the current value —
 * today's year for a new expense, the original year when editing an old one —
 * so an old expense cannot silently jump into the present year. The resolved
 * date is always spelled out, year included.
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const today = todayIso();
  const isToday = value === today;

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">{label}</span>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isToday}
          onClick={() => onChange(today)}
          className={cn(
            'min-h-11 rounded-lg border px-4 text-sm font-medium transition-colors',
            isToday
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-surface hover:bg-surface-2'
          )}
        >
          {t.common.today}
          <span className="ms-2 text-xs opacity-70">{formatDate(today, locale)}</span>
        </button>

        <Button
          type="button"
          variant={isToday ? 'outline' : 'primary'}
          disabled={disabled}
          icon={<CalendarDays className="size-4" aria-hidden="true" />}
          onClick={() => setPickerOpen(true)}
        >
          {t.common.pickDate}
        </Button>
      </div>

      {!isToday && <p className="text-xs text-muted">{formatDate(value, locale)}</p>}

      {pickerOpen && (
        <DatePickerSheet
          value={value}
          onClose={() => setPickerOpen(false)}
          onPick={(iso) => {
            onChange(iso);
            setPickerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function DatePickerSheet({
  value,
  onPick,
  onClose,
}: {
  value: string;
  onPick: (iso: string) => void;
  onClose: () => void;
}) {
  const { t, locale } = useT();

  const initial = isoToJalali(value);
  const [jm, setJm] = useState(initial.jm);
  const [jd, setJd] = useState(initial.jd);

  const jy = initial.jy;
  const months = locale === 'fa' ? JALALI_MONTHS_FA : JALALI_MONTHS_EN;
  const daysInMonth = jalaliMonthLength(jy, jm);
  const num = (n: number) => (locale === 'fa' ? toPersianDigits(n) : String(n));

  // Switching from a 31-day month to a shorter one must not leave an
  // impossible day selected.
  const safeDay = Math.min(jd, daysInMonth);
  const iso = jalaliToIso({ jy, jm, jd: safeDay });

  const selectClass =
    'min-h-11 w-full rounded-lg border border-border bg-surface px-2 text-base transition-colors focus:border-primary';

  return (
    <Sheet
      open
      onClose={onClose}
      title={t.common.pickDate}
      footer={
        <Button block size="lg" onClick={() => onPick(iso)}>
          {t.common.confirm}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1.5">
            <span className="block text-sm font-medium">{t.common.month}</span>
            <select
              value={jm}
              onChange={(e) => setJm(Number(e.target.value))}
              className={selectClass}
            >
              {months.map((name, i) => (
                <option key={name} value={i + 1}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="block text-sm font-medium">{t.common.day}</span>
            <select
              value={safeDay}
              onChange={(e) => setJd(Number(e.target.value))}
              className={selectClass}
            >
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {num(d)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="rounded-lg bg-surface-2 px-3 py-2 text-center text-sm font-medium">
          {formatDate(iso, locale)}
        </p>
      </div>
    </Sheet>
  );
}
