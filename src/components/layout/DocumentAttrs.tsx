'use client';

import { useEffect } from 'react';
import { dirOf } from '@/i18n';
import { useDongStore } from '@/store/dongStore';

/**
 * Keeps <html> in sync with the store: the `dark` class, plus `lang`/`dir`.
 *
 * Not next-themes — the established convention across the sibling projects is
 * to keep the theme in the store and push it onto the document from an effect.
 * The blocking script in <head> already set these before first paint; this
 * takes over once the store is live and handles later changes.
 */
export function DocumentAttrs() {
  const theme = useDongStore((s) => s.settings.theme);
  const locale = useDongStore((s) => s.settings.locale);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (dark: boolean) => root.classList.toggle('dark', dark);

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches);
      const onChange = (e: MediaQueryListEvent) => apply(e.matches);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }

    apply(theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = dirOf(locale);
  }, [locale]);

  return null;
}
