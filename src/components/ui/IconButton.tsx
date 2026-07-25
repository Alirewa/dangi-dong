'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** required — an icon-only control is invisible to screen readers without it */
  label: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, children, tone = 'default', className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors',
        'hover:bg-surface-2 active:opacity-80 disabled:opacity-40',
        tone === 'danger' ? 'text-negative' : 'text-foreground',
        className
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
