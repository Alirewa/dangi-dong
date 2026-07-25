'use client';

import { Minus, Plus } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';

/**
 * The ضریب (multiplier) control.
 *
 * Deliberately whole numbers with ± buttons and a "×2" readout — never a raw
 * fraction, a percentage, or a normalized weight. The user asked for
 * multipliers AND for the app to stay understandable; this is where those two
 * requirements meet, so nobody should have to reason about normalization.
 */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 20,
  disabled,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}) {
  const { locale } = useT();
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <button
        type="button"
        aria-label="−"
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="inline-flex size-9 items-center justify-center rounded-md bg-surface-2 disabled:opacity-40"
      >
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <span className="num min-w-11 text-center text-sm font-semibold" aria-live="polite">
        ×{formatNumber(value, locale)}
      </span>
      <button
        type="button"
        aria-label="+"
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="inline-flex size-9 items-center justify-center rounded-md bg-surface-2 disabled:opacity-40"
      >
        <Plus className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
