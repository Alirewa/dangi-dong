import { describe, expect, it } from 'vitest';
import { backupFilename, buildBackup, parseBackup } from './backup';
import { defaultSettings } from '@/types/dong';
import type { PersistedShape } from '@/store/dongStore';

const empty: PersistedShape = {
  people: [],
  groups: [],
  periods: [],
  expenses: [],
  payments: [],
  settings: defaultSettings,
  activeGroupId: null,
};

describe('parseBackup', () => {
  it('round-trips a built backup', () => {
    const text = JSON.stringify(buildBackup(empty));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.people).toEqual([]);
  });

  it('rejects text that is not JSON', () => {
    expect(parseBackup('not json')).toEqual({ ok: false, error: 'NOT_JSON' });
  });

  it("rejects another app's export", () => {
    const text = JSON.stringify({ app: 'something-else', data: {} });
    expect(parseBackup(text)).toEqual({ ok: false, error: 'WRONG_APP' });
  });

  it('rejects a missing data block', () => {
    expect(parseBackup(JSON.stringify({ app: 'dong-system' }))).toEqual({
      ok: false,
      error: 'BAD_SHAPE',
    });
  });

  it('rejects arrays whose entries lack ids', () => {
    const text = JSON.stringify({
      app: 'dong-system',
      version: 1,
      data: { people: [{ name: 'x' }], groups: [], periods: [], expenses: [] },
    });
    expect(parseBackup(text)).toEqual({ ok: false, error: 'BAD_SHAPE' });
  });

  it('fills in settings defaults for an older file', () => {
    const text = JSON.stringify({
      app: 'dong-system',
      version: 1,
      data: {
        people: [],
        groups: [],
        periods: [],
        expenses: [],
        settings: { locale: 'en' },
      },
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.settings.locale).toBe('en');
      expect(result.data.settings.roundTo).toBe(defaultSettings.roundTo);
    }
  });

  it('never trusts an imported activeGroupId', () => {
    const text = JSON.stringify({
      app: 'dong-system',
      version: 1,
      data: {
        people: [],
        groups: [],
        periods: [],
        expenses: [],
        activeGroupId: 'nonexistent',
      },
    });
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.activeGroupId).toBeNull();
  });
});

describe('backupFilename', () => {
  it('is date-stamped and zero-padded', () => {
    expect(backupFilename(new Date(2026, 0, 5))).toBe('dong-backup-2026-01-05.json');
  });
});
