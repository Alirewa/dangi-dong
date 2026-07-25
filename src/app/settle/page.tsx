'use client';

import { useMemo, useState } from 'react';
import {
  Calculator,
  CheckCircle2,
  Copy,
  FileText,
  Image as ImageIcon,
  Printer,
  Share2,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { ShareCard } from '@/components/share/ShareCard';
import { StatementCard } from '@/components/share/StatementCard';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { CopyButton } from '@/components/ui/CopyButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Count, Money } from '@/components/ui/Money';
import { useActiveGroup, useActivePeriod } from '@/hooks/useActiveGroup';
import { useSettlement } from '@/hooks/useSettlement';
import { useShareBlob } from '@/hooks/useShareBlob';
import { useT } from '@/hooks/useT';
import { formatCardNumber, formatIban } from '@/lib/bank';
import { copyText } from '@/lib/clipboard';
import { fmt } from '@/i18n';
import { formatNumber } from '@/lib/format';
import {
  SHARE_CARD_ID,
  STATEMENT_CARD_ID,
  downloadBlob,
  safeFilename,
  shareBlob,
} from '@/lib/exportImage';
import { exportStatementPdf } from '@/lib/exportPdf';
import { buildSummaryText } from '@/lib/exportText';
import { cn } from '@/lib/utils';
import { expensesOf, useDongStore } from '@/store/dongStore';

export default function SettlePage() {
  return (
    <HydrationGate>
      <SettleScreen />
    </HydrationGate>
  );
}

function SettleScreen() {
  const { t, locale, dir } = useT();
  const { group } = useActiveGroup();
  const { period } = useActivePeriod(group);

  const allExpenses = useDongStore((s) => s.expenses);
  const people = useDongStore((s) => s.people);
  const roundTo = useDongStore((s) => s.settings.roundTo);
  const pushToast = useDongStore((s) => s.pushToast);

  const [busy, setBusy] = useState<null | 'png' | 'share' | 'pdf'>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const expenses = useMemo(
    () =>
      group
        ? expensesOf(allExpenses, group.id, group.mode === 'monthly' ? (period?.id ?? null) : null)
        : [],
    [allExpenses, group, period?.id]
  );

  const settlement = useSettlement(group, period?.id ?? null);

  // Any change to these must invalidate the pre-warmed PNG.
  const signature = useMemo(
    () =>
      settlement
        ? `${settlement.groupId}:${settlement.periodId}:${settlement.total}:${settlement.expenseCount}:${settlement.treasurerId}:${roundTo}:${locale}`
        : '',
    [settlement, roundTo, locale]
  );

  const canExport = Boolean(settlement && settlement.balances.length > 0 && expenses.length > 0);
  const { blob: warmBlob, rebuild } = useShareBlob(signature, dir, canExport);

  if (!group || !settlement) return null;

  const baseName = `${t.appName}-${group.name}`;

  if (expenses.length === 0) {
    return (
      <AppShell title={t.settle.title} back>
        <EmptyState icon={<Calculator className="size-12" />} title={t.settle.nothingToSettle} />
      </AppShell>
    );
  }

  const treasurer = settlement.treasurerId
    ? people.find((p) => p.id === settlement.treasurerId)
    : null;
  const payout = treasurer?.payout ?? null;

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  const withBusy = async (kind: 'png' | 'share' | 'pdf', run: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await run();
    } catch {
      pushToast('error', t.settle.exportFailed);
    } finally {
      setBusy(null);
    }
  };

  const onDownloadPng = () =>
    withBusy('png', async () => {
      const blob = warmBlob ?? (await rebuild());
      downloadBlob(blob, safeFilename(baseName, 'png'));
      pushToast('success', t.toast.imageSaved);
    });

  const onShare = () =>
    withBusy('share', async () => {
      const blob = warmBlob ?? (await rebuild());
      const text = buildSummaryText({ group, period, people, settlement, locale, t });
      const shared = await shareBlob(blob, safeFilename(baseName, 'png'), group.name, text);
      if (!shared) {
        downloadBlob(blob, safeFilename(baseName, 'png'));
        pushToast('success', t.toast.imageSaved);
      }
    });

  const onCopyText = async () => {
    const text = buildSummaryText({ group, period, people, settlement, locale, t });
    const ok = await copyText(text);
    pushToast(ok ? 'success' : 'error', ok ? t.toast.copiedText : t.toast.copyFailed);
  };

  const onPdf = () =>
    withBusy('pdf', async () => {
      await exportStatementPdf(safeFilename(baseName, 'pdf'), dir);
    });

  return (
    <AppShell title={t.settle.title} back>
      <div className="space-y-4 p-4">
        {/* Dev-only invariant strip. If this ever appears in the wild, the
            settlement is not trustworthy and the numbers must not be shared. */}
        {process.env.NODE_ENV !== 'production' &&
          (!settlement.checks.sharesSumOk ||
            !settlement.checks.netSumZero ||
            !settlement.checks.transfersReconcile) && (
            <div className="rounded-lg bg-negative-soft px-3 py-2 text-xs font-semibold text-negative">
              INVARIANT FAILURE — shares:{String(settlement.checks.sharesSumOk)} net:
              {String(settlement.checks.netSumZero)} transfers:
              {String(settlement.checks.transfersReconcile)}
            </div>
          )}

        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">{t.settle.total}</span>
          <Money value={settlement.total} currency className="text-lg font-bold" />
        </div>

        {treasurer && (
          <div className="rounded-lg border-2 border-primary bg-primary-soft p-4">
            <p className="text-xs font-semibold text-primary">{t.settle.treasurerTitle}</p>
            <p className="mt-1 text-lg font-bold">
              {payout?.holderName?.trim() || treasurer.name}
              {payout?.bankName && (
                <span className="text-sm font-normal text-muted"> — {payout.bankName}</span>
              )}
            </p>

            {payout?.cardNumber ? (
              <div className="mt-2 flex items-center gap-2">
                <span className="num flex-1 text-lg font-semibold tracking-wide">
                  {formatCardNumber(payout.cardNumber)}
                </span>
                {/* Copies bare digits, not the spaced display form. */}
                <CopyButton value={payout.cardNumber} label={t.people.cardNumber} />
              </div>
            ) : (
              <p className="mt-1 text-xs text-muted">{t.group.payoutMissing}</p>
            )}

            {payout?.iban && (
              <div className="mt-1 flex items-center gap-2">
                <span className="num flex-1 text-xs text-muted">{formatIban(payout.iban)}</span>
                <CopyButton value={payout.iban} label={t.people.iban} />
              </div>
            )}

            <p className="mt-2 text-xs leading-relaxed text-muted">{t.settle.treasurerHint}</p>
          </div>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t.settle.transfersTitle}</h2>
          {settlement.transfers.length === 0 ? (
            <p className="flex items-center gap-2 rounded-lg bg-positive-soft px-4 py-3 text-sm font-semibold text-positive">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
              {t.settle.noTransfers}
            </p>
          ) : (
            <>
              <ul className="space-y-2">
                {settlement.transfers.map((transfer, i) => (
                  <li
                    key={`${transfer.fromPersonId}-${transfer.toPersonId}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3"
                  >
                    <span className="truncate text-sm font-medium">
                      {nameOf(transfer.fromPersonId)}
                    </span>
                    <span className="text-primary" aria-label={t.settle.payTo}>
                      ←
                    </span>
                    <span className="flex-1 truncate text-sm font-medium">
                      {nameOf(transfer.toPersonId)}
                    </span>
                    <Money
                      value={transfer.amount}
                      className="shrink-0 text-sm font-bold text-primary"
                    />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">{t.settle.transfersHint}</p>
            </>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">{t.settle.balances}</h2>
          <ul className="space-y-2">
            {settlement.balances.map((b) => {
              const open = expanded === b.personId;
              return (
                <li key={b.personId} className="rounded-lg border border-border bg-surface">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setExpanded(open ? null : b.personId)}
                    className="flex w-full items-center gap-3 p-3 text-start"
                  >
                    <Avatar name={b.name} color={b.color} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{b.name}</span>
                      <span className="block text-xs text-muted">
                        <Count value={b.expenseCount} /> {t.settle.itemsIncluded} •{' '}
                        {t.settle.paid}{' '}
                        <Money value={b.paid} />
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <Money value={b.owed} className="block text-sm font-semibold" />
                      {b.net !== 0 && (
                        <span
                          className={cn(
                            'mt-0.5 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold',
                            b.net > 0
                              ? 'bg-positive-soft text-positive'
                              : 'bg-negative-soft text-negative'
                          )}
                        >
                          {b.net > 0 ? t.settle.creditor : t.settle.debtor}{' '}
                          <Money value={Math.abs(b.net)} />
                        </span>
                      )}
                    </span>
                  </button>

                  {open && (
                    <ul className="border-t border-border px-3 py-2">
                      {b.lines.map((line) => (
                        <li
                          key={line.expenseId}
                          className="flex items-center justify-between gap-2 py-1 text-xs"
                        >
                          <span className="truncate text-muted">{line.title}</span>
                          <Money value={line.owed} className="shrink-0" />
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">
          {roundTo > 1
            ? fmt(t.settle.roundNote, { unit: formatNumber(roundTo, locale) })
            : t.settle.roundNoteExact}
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            loading={busy === 'share'}
            disabled={busy !== null}
            icon={<Share2 className="size-5" aria-hidden="true" />}
            onClick={onShare}
          >
            {t.common.share}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            loading={busy === 'png'}
            disabled={busy !== null}
            icon={<ImageIcon className="size-5" aria-hidden="true" />}
            onClick={onDownloadPng}
          >
            {t.settle.exportImage}
          </Button>
          <Button
            variant="outline"
            icon={<Copy className="size-4" aria-hidden="true" />}
            onClick={onCopyText}
          >
            {t.settle.exportText}
          </Button>
          <Button
            variant="outline"
            loading={busy === 'pdf'}
            disabled={busy !== null}
            icon={<FileText className="size-4" aria-hidden="true" />}
            onClick={onPdf}
          >
            {t.settle.exportPdf}
          </Button>
          <Button
            variant="ghost"
            className="col-span-2"
            icon={<Printer className="size-4" aria-hidden="true" />}
            onClick={() => window.print()}
          >
            {t.settle.print}
          </Button>
        </div>
      </div>

      {/*
        Capture targets. Mounted permanently but off-screen so their fonts and
        layout are already resolved before any export button is pressed —
        capturing a node that has never painted yields blank output.
      */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: -99999,
          left: 0,
          pointerEvents: 'none',
          opacity: 0,
        }}
      >
        <ShareCard
          id={SHARE_CARD_ID}
          group={group}
          period={period}
          people={people}
          settlement={settlement}
          locale={locale}
          dir={dir}
          t={t}
          roundTo={roundTo}
        />
        <StatementCard
          id={STATEMENT_CARD_ID}
          group={group}
          period={period}
          people={people}
          expenses={expenses}
          settlement={settlement}
          locale={locale}
          dir={dir}
          t={t}
        />
      </div>
    </AppShell>
  );
}
