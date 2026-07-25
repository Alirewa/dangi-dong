'use client';

import { useId, useState, type ReactNode, type RefObject } from 'react';
import { useT } from '@/hooks/useT';
import { currencyLabel, formatNumber } from '@/lib/format';
import { parseAmount, toPersianDigits } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { inputClass } from './TextInput';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  /** render the currency word inside the field */
  showCurrency?: boolean;
  className?: string;
  id?: string;
}

/**
 * Money entry. The UX contract is ported from persian-ui-kit's PriceInput:
 *
 *  - `dir="ltr"` + `inputMode="numeric"` — the numeric keypad on mobile, and
 *    the caret behaves sanely even inside an RTL page
 *  - raw digits while focused (so editing is not fighting separators), grouped
 *    while blurred (so the number is readable)
 *  - `onChange` emits a plain integer, never a formatted string
 *  - accepts Persian AND Arabic-Indic digits on input, because iOS Persian
 *    keyboards emit the Arabic codepoints
 */
export function AmountInput({
  value,
  onChange,
  inputRef,
  label,
  hint,
  error,
  placeholder,
  autoFocus,
  disabled,
  showCurrency = true,
  className,
  id,
}: AmountInputProps) {
  const { locale, t } = useT();
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  // Only read while focused, and re-seeded on every focus — so it never needs
  // syncing against `value`.
  const [draft, setDraft] = useState('');

  const display = focused
    ? draft
    : value === 0
      ? ''
      : formatNumber(value, locale);

  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          id={inputId}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          value={display}
          placeholder={placeholder ?? (locale === 'fa' ? toPersianDigits('0') : '0')}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onFocus={() => {
            setFocused(true);
            setDraft(value === 0 ? '' : String(value));
          }}
          onBlur={() => {
            setFocused(false);
            onChange(parseAmount(draft));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDraft(raw);
            onChange(parseAmount(raw));
          }}
          className={cn(
            inputClass,
            'text-start font-medium tabular-nums',
            showCurrency && 'pe-16',
            error && 'border-negative',
            className
          )}
        />
        {showCurrency && (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted">
            {currencyLabel(locale) || t.common.toman}
          </span>
        )}
      </div>
      {error ? (
        <p id={`${inputId}-err`} className="text-xs text-negative">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
