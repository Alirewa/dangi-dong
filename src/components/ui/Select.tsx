'use client';

import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Native <select> with the app's field styling.
 *
 * Native rather than a custom listbox: it gets the platform's own wheel picker
 * on mobile, keyboard behaviour for free, and cannot drift out of the document
 * direction. The chevron is decorative and sits on the trailing edge.
 */
export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  hint,
  id,
  className,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  label?: string;
  hint?: ReactNode;
  id?: string;
  className?: string;
}) {
  const autoId = useId();
  const selectId = id ?? autoId;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium">
          {label}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className={cn(
            'w-full min-h-11 appearance-none rounded-lg border border-border bg-surface px-3 pe-10',
            'text-base transition-colors focus:border-primary',
            className
          )}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute inset-y-0 end-3 my-auto size-4 text-muted"
          aria-hidden="true"
        />
      </div>

      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
