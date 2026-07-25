'use client';

import { dirOf, getDict, type Dict } from '@/i18n';
import { useDongStore } from '@/store/dongStore';
import type { Locale } from '@/types/dong';

export interface Translation {
  t: Dict;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  isRtl: boolean;
}

export function useT(): Translation {
  const locale = useDongStore((s) => s.settings.locale);
  return { t: getDict(locale), locale, dir: dirOf(locale), isRtl: locale === 'fa' };
}
