'use client';

import { useEffect } from 'react';
import { CheckCircle2, Info, XCircle } from 'lucide-react';
import { useDongStore } from '@/store/dongStore';
import { cn } from '@/lib/utils';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const TONES = {
  success: 'bg-positive-soft text-positive border-positive/30',
  error: 'bg-negative-soft text-negative border-negative/30',
  info: 'bg-surface-2 text-foreground border-border',
};

/**
 * ~40 lines instead of react-hot-toast (~12 KB), and we control the aria-live
 * region rather than inheriting one.
 */
export function ToastHost() {
  const toasts = useDongStore((s) => s.toasts);
  const dismiss = useDongStore((s) => s.dismissToast);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismiss(toast.id)}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg',
              TONES[toast.kind]
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {toast.message}
          </button>
        );
      })}
    </div>
  );
}
