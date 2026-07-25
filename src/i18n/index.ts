import type { Locale } from '@/types/dong';
import { fa, type Dict } from './fa';
import { en } from './en';

export type { Dict };

export const dictionaries: Record<Locale, Dict> = { fa, en };

export function getDict(locale: Locale): Dict {
  return dictionaries[locale] ?? fa;
}

export function dirOf(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'fa' ? 'rtl' : 'ltr';
}

/** Fills `{name}` placeholders: fmt(t.settle.roundNote, { unit: '۱٬۰۰۰' }) */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match
  );
}
