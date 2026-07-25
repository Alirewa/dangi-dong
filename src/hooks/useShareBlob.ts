'use client';

import { useEffect, useState } from 'react';
import { buildShareBlob } from '@/lib/exportImage';

interface Warmed {
  signature: string;
  blob: Blob;
}

/**
 * Pre-builds the share PNG so the share button's click handler does not have
 * to await a capture.
 *
 * This exists for one specific bug: `navigator.share()` requires transient
 * user activation, and awaiting the capture inside the click handler consumes
 * it — on iOS Safari that throws NotAllowedError. Building the blob ahead of
 * time keeps the handler synchronous up to the share call.
 *
 * The warmed blob is stored *with* the signature it was built from, and
 * staleness is derived at read time rather than cleared from an effect. That
 * keeps the effect free of synchronous setState and makes it impossible to
 * hand out a blob that does not match the current settlement.
 */
export function useShareBlob(
  signature: string,
  dir: 'rtl' | 'ltr',
  enabled: boolean
): { blob: Blob | null; rebuild: () => Promise<Blob> } {
  const [warmed, setWarmed] = useState<Warmed | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    // Debounced: the settlement recomputes as the user edits upstream, and
    // capturing on every change would peg the main thread.
    const timer = setTimeout(() => {
      buildShareBlob(dir)
        .then((blob) => {
          if (!cancelled) setWarmed({ signature, blob });
        })
        .catch(() => {
          // Pre-warming is best-effort; the button falls back to building on demand.
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [signature, dir, enabled]);

  const blob = enabled && warmed?.signature === signature ? warmed.blob : null;

  return { blob, rebuild: () => buildShareBlob(dir) };
}
