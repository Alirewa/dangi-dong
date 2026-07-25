'use client';

import { useRef, useState } from 'react';
import { Download, Info, RefreshCw, Trash2, Upload } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { useT } from '@/hooks/useT';
import { fmt } from '@/i18n';
import { backupFilename, buildBackup, parseBackup } from '@/lib/backup';
import { formatDate, formatNumber } from '@/lib/format';
import { clearCachesAndReload } from '@/lib/pwa';
import { useDongStore } from '@/store/dongStore';
import { ROUND_OPTIONS, type Locale, type RoundTo, type ThemeMode } from '@/types/dong';

export default function SettingsPage() {
  const { t } = useT();
  return (
    <AppShell title={t.settings.title}>
      <HydrationGate>
        <SettingsScreen />
      </HydrationGate>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function SettingsScreen() {
  const { t, locale } = useT();
  const store = useDongStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [pendingImport, setPendingImport] = useState<ReturnType<typeof parseBackup> | null>(null);

  const { settings } = store;

  const localeOptions: { value: Locale; label: string }[] = [
    { value: 'fa', label: 'فارسی' },
    { value: 'en', label: 'English' },
  ];

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
    { value: 'system', label: t.settings.themeSystem },
  ];

  const roundOptions = ROUND_OPTIONS.map((r) => ({
    value: String(r),
    label: r === 1 ? t.settings.roundExact : fmt(t.settings.roundUnit, { unit: formatNumber(r, locale) }),
  }));

  const onExport = () => {
    const file = buildBackup({
      people: store.people,
      groups: store.groups,
      periods: store.periods,
      expenses: store.expenses,
      settings: store.settings,
      activeGroupId: null,
    });
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);

    store.markBackedUp();
    store.pushToast('success', t.toast.backupSaved);
  };

  const onFile = async (file: File) => {
    const result = parseBackup(await file.text());
    if (!result.ok) {
      store.pushToast('error', t.settings.importInvalid);
      return;
    }
    setPendingImport(result);
  };

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!pendingImport?.ok) return;
    if (mode === 'replace') store.replaceAll(pendingImport.data);
    else store.mergeAll(pendingImport.data);
    setPendingImport(null);
    // Reload so every memoized selector re-derives from a clean slate.
    setTimeout(() => window.location.reload(), 300);
  };

  // Read the clock once on mount rather than during every render, which would
  // make the component non-idempotent.
  const [mountedAt] = useState(() => Date.now());
  const daysSinceBackup = settings.lastBackupAt
    ? Math.floor((mountedAt - new Date(settings.lastBackupAt).getTime()) / 86_400_000)
    : null;
  const needsBackup =
    store.expenses.length > 0 && (daysSinceBackup === null || daysSinceBackup > 30);

  return (
    <div className="space-y-6 p-4">
      <InstallPrompt />

      <Section title={t.settings.language}>
        <SegmentedControl
          value={settings.locale}
          options={localeOptions}
          onChange={store.setLocale}
          label={t.settings.language}
        />
      </Section>

      <Section title={t.settings.theme}>
        <SegmentedControl
          value={settings.theme}
          options={themeOptions}
          onChange={store.setTheme}
          label={t.settings.theme}
        />
      </Section>

      <Section title={t.settings.rounding}>
        <SegmentedControl
          value={String(settings.roundTo)}
          options={roundOptions}
          onChange={(v) => store.setRoundTo(Number(v) as RoundTo)}
          label={t.settings.rounding}
        />
        <p className="text-xs leading-relaxed text-muted">{t.settings.roundingHint}</p>
      </Section>

      <Section title={t.settings.strategy}>
        <SegmentedControl
          value={settings.transferStrategy}
          options={[
            { value: 'treasurer-first' as const, label: t.settings.strategyTreasurer },
            { value: 'greedy' as const, label: t.settings.strategyGreedy },
          ]}
          onChange={store.setTransferStrategy}
          label={t.settings.strategy}
        />
        <p className="text-xs leading-relaxed text-muted">{t.settings.strategyHint}</p>
      </Section>

      <Section title={t.settings.backup}>
        {needsBackup && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">
            {t.settings.backupReminder}
          </p>
        )}

        <p className="text-xs leading-relaxed text-muted">{t.settings.backupHint}</p>
        {/* The file genuinely contains card numbers — say so before they share it. */}
        <p className="text-xs leading-relaxed text-muted">{t.settings.backupWarnCard}</p>

        <p className="text-xs text-muted">
          {settings.lastBackupAt
            ? fmt(t.settings.lastBackup, {
                date: formatDate(settings.lastBackupAt.slice(0, 10), locale),
              })
            : t.settings.neverBackedUp}
        </p>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            fullWidth
            icon={<Download className="size-4" aria-hidden="true" />}
            onClick={onExport}
          >
            {t.settings.exportJson}
          </Button>
          <Button
            variant="outline"
            fullWidth
            icon={<Upload className="size-4" aria-hidden="true" />}
            onClick={() => fileRef.current?.click()}
          >
            {t.settings.importJson}
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onFile(file);
            e.target.value = '';
          }}
        />
      </Section>

      <Section title={t.settings.install}>
        <p className="text-xs leading-relaxed text-muted">{t.settings.installHint}</p>
        <Button
          variant="outline"
          fullWidth
          icon={<RefreshCw className="size-4" aria-hidden="true" />}
          onClick={() => void clearCachesAndReload()}
        >
          {t.settings.clearCache}
        </Button>
        <p className="text-xs leading-relaxed text-muted">{t.settings.clearCacheHint}</p>
      </Section>

      <Section title={t.settings.about}>
        <div className="flex gap-2 rounded-lg bg-surface-2 p-3">
          <Info className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
          <div className="space-y-1 text-xs leading-relaxed text-muted">
            <p>{t.settings.aboutText}</p>
            <p>{t.settings.privateWarning}</p>
          </div>
        </div>

        <Button
          variant="danger"
          fullWidth
          icon={<Trash2 className="size-4" aria-hidden="true" />}
          onClick={() => setPendingReset(true)}
        >
          {t.settings.reset}
        </Button>
      </Section>

      <ConfirmDialog
        open={pendingReset}
        title={t.settings.resetTitle}
        description={t.settings.resetDesc}
        confirmLabel={t.settings.reset}
        onCancel={() => setPendingReset(false)}
        onConfirm={() => {
          store.resetAll();
          setPendingReset(false);
          setTimeout(() => window.location.reload(), 300);
        }}
      />

      {/* Merge vs replace is a real choice, not a yes/no — so it gets a sheet
          with both outcomes spelled out rather than a confirm dialog. */}
      <Sheet
        open={pendingImport !== null}
        onClose={() => setPendingImport(null)}
        title={t.settings.importJson}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => applyImport('merge')}
            className="w-full rounded-lg border border-border bg-surface p-4 text-start hover:bg-surface-2"
          >
            <span className="block text-sm font-semibold">{t.settings.importMerge}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              {t.settings.importMergeDesc}
            </span>
          </button>

          <button
            type="button"
            onClick={() => applyImport('replace')}
            className="w-full rounded-lg border border-negative/40 bg-negative-soft p-4 text-start"
          >
            <span className="block text-sm font-semibold text-negative">
              {t.settings.importReplace}
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-negative/80">
              {t.settings.importReplaceDesc}
            </span>
          </button>
        </div>
      </Sheet>
    </div>
  );
}
