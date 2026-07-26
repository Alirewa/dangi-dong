import type { PersistedShape } from '@/store/dongStore';
import { defaultSettings } from '@/types/dong';

export interface BackupFile {
  app: 'dong-system';
  version: 1;
  exportedAt: string;
  data: PersistedShape;
}

export type ParseResult =
  { ok: true; data: PersistedShape } | { ok: false; error: 'NOT_JSON' | 'WRONG_APP' | 'BAD_SHAPE' };

/**
 * Hand-written type guards rather than zod.
 *
 * The shape is four arrays and a settings object, and this is a bundle-size-
 * sensitive offline app — zod's runtime is not justified by five checks.
 */
function isArrayOfObjects(value: unknown): value is Record<string, unknown>[] {
  return Array.isArray(value) && value.every((x) => typeof x === 'object' && x !== null);
}

function hasIds(value: Record<string, unknown>[]): boolean {
  return value.every((x) => typeof x.id === 'string' && x.id.length > 0);
}

export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'NOT_JSON' };
  }

  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'BAD_SHAPE' };
  const file = raw as Record<string, unknown>;

  if (file.app !== 'dong-system') return { ok: false, error: 'WRONG_APP' };

  const data = file.data as Record<string, unknown> | undefined;
  if (!data) return { ok: false, error: 'BAD_SHAPE' };

  const { people, groups, periods, expenses } = data;
  if (
    !isArrayOfObjects(people) ||
    !isArrayOfObjects(groups) ||
    !isArrayOfObjects(periods) ||
    !isArrayOfObjects(expenses)
  ) {
    return { ok: false, error: 'BAD_SHAPE' };
  }
  if (!hasIds(people) || !hasIds(groups) || !hasIds(periods) || !hasIds(expenses)) {
    return { ok: false, error: 'BAD_SHAPE' };
  }

  return {
    ok: true,
    data: {
      people: people as unknown as PersistedShape['people'],
      groups: groups as unknown as PersistedShape['groups'],
      periods: periods as unknown as PersistedShape['periods'],
      expenses: expenses as unknown as PersistedShape['expenses'],
      // Absent in backups written before repayments existed.
      payments: isArrayOfObjects(data.payments)
        ? (data.payments as unknown as PersistedShape['payments'])
        : [],
      settings: {
        ...defaultSettings,
        ...(data.settings as object | undefined),
      },
      activeGroupId: null,
    },
  };
}

export function buildBackup(data: PersistedShape): BackupFile {
  return {
    app: 'dong-system',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function backupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `dong-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}
