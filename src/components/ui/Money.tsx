'use client';

import { useT } from '@/hooks/useT';
import { currencyLabel, formatNumber, formatSigned } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MoneyProps {
  value: number;
  /** show the currency word after the number */
  currency?: boolean;
  /** render +/− for balances */
  signed?: boolean;
  className?: string;
}

/**
 * The ONLY way an amount should reach the screen.
 *
 * `direction: ltr` + `unicode-bidi: isolate` (the `.num` class) is not
 * cosmetic: a bare formatted number inside RTL text gets reordered by the
 * bidi algorithm into a different, plausible-looking number. The bug is
 * invisible in review and wrong in the shared image.
 */
export function Money({ value, currency = false, signed = false, className }: MoneyProps) {
  const { locale } = useT();
  const text = signed ? formatSigned(value, locale) : formatNumber(value, locale);

  return (
    <span className={cn('num', className)}>
      {text}
      {currency && <span className="ms-1 text-[0.85em] opacity-70">{currencyLabel(locale)}</span>}
    </span>
  );
}

/**
 * Non-currency numbers — item counts, member counts, step numbers.
 *
 * Same discipline as <Money>: interpolating a bare `{count}` into Persian text
 * renders Latin digits next to Persian ones, which looks like a bug and is
 * easy to miss in review.
 */
export function Count({ value, className }: { value: number; className?: string }) {
  const { locale } = useT();
  return <span className={cn('num', className)}>{formatNumber(value, locale)}</span>;
}
