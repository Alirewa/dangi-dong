'use client';

import { useCallback, useEffect, useState } from 'react';
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

const VISIBLE_MS = 3200;
const EXIT_MS = 180;

/**
 * ~60 lines instead of react-hot-toast (~12 KB), and we control the aria-live
 * region rather than inheriting one.
 *
 * Exit animation is driven by a local "leaving" set: the toast has to stay
 * mounted while it animates out, so it is removed from the store only after
 * the animation has finished.
 */
export function ToastHost() {
  const toasts = useDongStore((s) => s.toasts);
  const dismiss = useDongStore((s) => s.dismissToast);
  const [leaving, setLeaving] = useState<string[]>([]);

  const beginExit = useCallback(
    (id: string) => {
      setLeaving((prev) => (prev.includes(id) ? prev : [...prev, id]));
      setTimeout(() => {
        dismiss(id);
        setLeaving((prev) => prev.filter((x) => x !== id));
      }, EXIT_MS);
    },
    [dismiss]
  );

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((t) => setTimeout(() => beginExit(t.id), VISIBLE_MS));
    return () => timers.forEach(clearTimeout);
  }, [toasts, beginExit]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex flex-col items-center gap-2 px-4 md:bottom-8"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.kind];
        const isLeaving = leaving.includes(toast.id);
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => beginExit(toast.id)}
            className={cn(
              'pointer-events-auto flex max-w-sm items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg',
              isLeaving ? 'anim-toast-out' : 'anim-toast-in',
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
