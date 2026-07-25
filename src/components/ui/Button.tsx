'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover active:opacity-90',
  secondary: 'bg-surface-2 text-foreground hover:bg-border active:opacity-90',
  ghost: 'text-foreground hover:bg-surface-2 active:opacity-90',
  outline: 'border border-border bg-surface text-foreground hover:bg-surface-2',
  danger: 'bg-negative text-white hover:opacity-90 active:opacity-80',
};

// min-h keeps every control at or above the 44px touch target.
const SIZES: Record<Size, string> = {
  sm: 'min-h-9 px-3 text-sm gap-1.5 rounded-md',
  md: 'min-h-11 px-4 text-sm gap-2 rounded-lg',
  lg: 'min-h-12 px-5 text-base gap-2 rounded-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, icon, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});
