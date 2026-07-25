'use client';

import { useEffect } from 'react';
import { useDongStore } from '@/store/dongStore';

/**
 * Rehydrates the persisted store on the client only.
 *
 * Pairs with `skipHydration: true`. Renders nothing — it exists purely so the
 * rehydrate call happens inside an effect, after the server-matched first
 * paint, which is what keeps React from reporting a hydration mismatch on the
 * `crypto.randomUUID()` / `Date.now()` defaults.
 */
export function StoreHydrator() {
  useEffect(() => {
    let cancelled = false;

    const finish = () => {
      if (cancelled) return;
      useDongStore.getState().setHydrated(true);
    };

    // rehydrate() resolves to a Promise for async storage and to undefined for
    // synchronous storage like localStorage. Handle both rather than assuming.
    const result: unknown = useDongStore.persist.rehydrate();
    if (result instanceof Promise) {
      void result.then(finish).catch(finish);
    } else {
      finish();
    }

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
