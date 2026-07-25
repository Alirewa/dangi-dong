'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  children: ReactNode;
  tone?: 'default' | 'danger' | 'primary';
}

/**
 * Compact icon + visible text, for row-level actions.
 *
 * Replaces the icon-only buttons this app used to have. An unlabelled icon is a
 * guessing game — especially for the non-technical audience this app targets,
 * and especially for archive/duplicate, which have no universally understood
 * glyph. The text is never hidden at any breakpoint.
 */
export function ActionButton({
  icon,
  children,
  tone = 'default',
  className,
  ...rest
}: ActionButtonProps) {
  const tones = {
    default: 'text-muted hover:bg-surface-2 hover:text-foreground',
    primary: 'text-primary hover:bg-primary-soft',
    danger: 'text-negative hover:bg-negative-soft',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors disabled:opacity-40',
        tones[tone],
        className
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}
