'use client';

import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useT } from '@/hooks/useT';
import { currencyLabel, formatNumber } from '@/lib/format';
import { parseAmount } from '@/lib/persian';
import { cn } from '@/lib/utils';
import { inputClass } from './TextInput';

interface AmountInputProps {
  value: number;
  onChange: (value: number) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  label?: string;
  hint?: ReactNode;
  error?: string | null;
  autoFocus?: boolean;
  disabled?: boolean;
  /** render the currency word inside the field */
  showCurrency?: boolean;
  className?: string;
  id?: string;
}

const DIGIT = /[0-9۰-۹٠-٩]/;

/** Digits before the caret — the only position that survives reformatting. */
function digitsBefore(text: string, caret: number): number {
  let n = 0;
  for (let i = 0; i < caret && i < text.length; i++) if (DIGIT.test(text[i])) n++;
  return n;
}

/** Inverse of digitsBefore: the caret offset just after the Nth digit. */
function caretAfterDigits(text: string, count: number): number {
  if (count === 0) return 0;
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (DIGIT.test(text[i])) {
      n++;
      if (n === count) return i + 1;
    }
  }
  return text.length;
}

/**
 * Money entry.
 *
 * Thousands separators are applied on every keystroke, not just on blur — a
 * raw 1250000 is unreadable, which is exactly when a typo slips through. The
 * caret is re-anchored to the same digit after reformatting, so inserting or
 * deleting mid-number does not throw the cursor to the end.
 *
 * `dir="ltr"` and `inputMode="numeric"` stay: they give the numeric keypad on
 * mobile and keep digit order and caret movement correct. Visual alignment
 * comes from the document direction (see globals.css), so the field still sits
 * right-aligned in a Persian form.
 *
 * Persian and Arabic-Indic digits are accepted on input, because iOS Persian
 * keyboards emit the Arabic codepoints.
 */
export function AmountInput({
  value,
  onChange,
  inputRef,
  label,
  hint,
  error,
  autoFocus,
  disabled,
  showCurrency = true,
  className,
  id,
}: AmountInputProps) {
  const { locale } = useT();
  const autoId = useId();
  const inputId = id ?? autoId;

  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState('');

  const elRef = useRef<HTMLInputElement | null>(null);
  const pendingCaret = useRef<number | null>(null);

  // Restore the caret after a reformat. Runs before paint, so it never flickers.
  useLayoutEffect(() => {
    const el = elRef.current;
    if (!el || pendingCaret.current === null) return;
    const target = pendingCaret.current;
    pendingCaret.current = null;
    const pos = caretAfterDigits(el.value, target);
    el.setSelectionRange(pos, pos);
  });

  const formatted = (n: number) => (n === 0 ? '' : formatNumber(n, locale));

  // While blurred the field mirrors `value`, so external resets are reflected.
  const display = focused ? draft : formatted(value);

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
          ref={(node) => {
            elRef.current = node;
            if (inputRef) inputRef.current = node;
          }}
          id={inputId}
          dir="ltr"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          value={display}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onFocus={() => {
            setFocused(true);
            setDraft(formatted(value));
          }}
          onBlur={() => {
            setFocused(false);
            onChange(parseAmount(draft));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            const caret = e.target.selectionStart ?? raw.length;
            const digitCount = digitsBefore(raw, caret);

            const next = parseAmount(raw);
            const nextText = formatted(next);

            pendingCaret.current = digitCount;
            setDraft(nextText);
            onChange(next);
          }}
          className={cn(
            inputClass,
            'font-medium tabular-nums',
            showCurrency && 'pe-16',
            error && 'border-negative',
            className
          )}
        />
        {showCurrency && (
          <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted">
            {currencyLabel(locale)}
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
