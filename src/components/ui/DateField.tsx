'use client';

import { useId, useState } from 'react';
import { useT } from '@/hooks/useT';
import { formatDate } from '@/lib/format';
import { todayIso } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { inputClass } from './TextInput';

function yesterdayIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return todayIso(d);
}

/**
 * Date entry without a date-picker dependency.
 *
 * Two shortcut chips cover the overwhelming majority of real entries (people
 * log an expense the day of or the day after), and the native <input type=date>
 * handles the rest. This is why react-multi-date-picker is not installed — it
 * costs ~120 lines of .rmdp-* overrides in factor-saz for input we barely need.
 * The value stays ISO Gregorian; only the label is Jalali.
 */
export function DateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (iso: string) => void;
  label: string;
}) {
  const { t, locale } = useT();
  const id = useId();
  const [manual, setManual] = useState(false);

  const today = todayIso();
  const yesterday = yesterdayIso();

  const chips = [
    { iso: today, label: t.common.today },
    { iso: yesterday, label: t.common.yesterday },
  ];

  const isShortcut = value === today || value === yesterday;

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium" id={`${id}-label`}>
        {label}
      </span>

      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${id}-label`}>
        {chips.map((chip) => (
          <button
            key={chip.iso}
            type="button"
            aria-pressed={value === chip.iso && !manual}
            onClick={() => {
              onChange(chip.iso);
              setManual(false);
            }}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
              value === chip.iso && !manual
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-border bg-surface hover:bg-surface-2'
            )}
          >
            {chip.label}
          </button>
        ))}

        <button
          type="button"
          aria-pressed={manual || !isShortcut}
          onClick={() => setManual(true)}
          className={cn(
            'min-h-9 rounded-lg border px-3 text-sm font-medium transition-colors',
            manual || !isShortcut
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-surface hover:bg-surface-2'
          )}
        >
          {isShortcut && !manual ? t.common.changeDate : formatDate(value, locale)}
        </button>
      </div>

      {(manual || !isShortcut) && (
        <input
          id={id}
          type="date"
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value || today)}
          className={inputClass}
          aria-label={label}
        />
      )}
    </div>
  );
}
