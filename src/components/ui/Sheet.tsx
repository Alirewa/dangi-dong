'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { Button } from './Button';

/**
 * Bottom sheet — the primary modal on mobile, a centred dialog on desktop.
 *
 * Uses <dialog> for the focus trap, Esc handling and inertness of the page
 * behind it, all of which the platform does better than hand-rolled state.
 *
 * Exactly ONE element scrolls: the body region. The dialog itself is
 * overflow-hidden and the page behind is locked, otherwise the user sees two
 * or three stacked scrollbars.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t, dir } = useT();
  const ref = useRef<HTMLDialogElement>(null);

  /**
   * `close()` is instant, so closing straight away would skip the exit
   * animation entirely. Instead we flag the element, let the CSS animation
   * run, and only then close — covering every path (button, backdrop, Esc, or
   * the parent flipping `open` after a save).
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      delete el.dataset.closing;
      if (!el.open) el.showModal();
      return;
    }

    if (!el.open) return;

    el.dataset.closing = 'true';
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      delete el.dataset.closing;
      if (el.open) el.close();
    };

    el.addEventListener('animationend', finish, { once: true });
    // Safety net: if the animation is suppressed (reduced motion, a hidden
    // tab), animationend may never arrive and the dialog would stay stuck open.
    const timer = setTimeout(finish, 400);

    return () => {
      clearTimeout(timer);
      el.removeEventListener('animationend', finish);
      finish();
    };
  }, [open]);

  // Lock the page behind the modal. Reference-counted via a data attribute so
  // nested sheets do not unlock early.
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const depth = Number(body.dataset.sheetDepth ?? '0') + 1;
    body.dataset.sheetDepth = String(depth);
    body.classList.add('sheet-open');
    return () => {
      const next = Number(body.dataset.sheetDepth ?? '1') - 1;
      body.dataset.sheetDepth = String(next);
      if (next <= 0) {
        body.classList.remove('sheet-open');
        delete body.dataset.sheetDepth;
      }
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      dir={dir}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // The dialog element itself is the backdrop area.
        if (e.target === ref.current) onClose();
      }}
      className="m-0 max-h-[90dvh] w-full max-w-lg self-end justify-self-center overflow-hidden rounded-t-2xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/50 sm:mb-8 sm:self-center sm:rounded-2xl"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate text-base font-semibold">{title}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            icon={<X className="size-4" aria-hidden="true" />}
          >
            {t.common.close}
          </Button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>

        {footer && <footer className="safe-bottom border-t border-border p-4">{footer}</footer>}
      </div>
    </dialog>
  );
}
