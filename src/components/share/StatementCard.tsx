'use client';

import { STATEMENT_WIDTH } from '@/lib/exportImage';
import { currencyLabel, formatDate, formatJalaliMonth, formatNumber } from '@/lib/format';
import type { Dict } from '@/i18n';
import type { Expense, Group, Locale, Period, Person } from '@/types/dong';
import type { SettlementResult } from '@/types/settlement';
import { GROUP_ICONS } from '@/components/groups/groupIcons';
import { SHARE_COLORS as C } from './shareColors';

function StatementIcon({ icon }: { icon: keyof typeof GROUP_ICONS }) {
  const Icon = GROUP_ICONS[icon] ?? GROUP_ICONS.home;
  return <Icon width={22} height={22} strokeWidth={2.2} color={C.primary} aria-hidden="true" />;
}

/**
 * The PDF capture target: a full itemized statement at A4 width.
 *
 * Same construction rules as ShareCard (literal hex, inline styles, always
 * light). Rows are kept short and uniform so the page-slicing loop in
 * exportPdf.ts rarely cuts through the middle of one.
 */
export function StatementCard({
  id,
  group,
  period,
  people,
  expenses,
  settlement,
  locale,
  dir,
  t,
}: {
  id: string;
  group: Group;
  period: Period | null;
  people: Person[];
  expenses: Expense[];
  settlement: SettlementResult;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
}) {
  const nameOf = (pid: string) => people.find((p) => p.id === pid)?.name ?? '—';
  const money = (v: number) => formatNumber(v, locale);
  const align = dir === 'rtl' ? ('left' as const) : ('right' as const);

  const subtitle =
    group.mode === 'monthly' && period
      ? formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)
      : group.eventDate
        ? formatDate(group.eventDate, locale)
        : '';

  const num = (v: string, bold?: boolean) => (
    <span
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: bold ? 700 : 400,
      }}
    >
      {v}
    </span>
  );

  const sorted = [...expenses].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
  );

  return (
    <div
      id={id}
      dir={dir}
      style={{
        width: STATEMENT_WIDTH,
        background: C.background,
        color: C.text,
        fontFamily: "'Vazirmatn', system-ui, sans-serif",
        fontSize: 13,
        lineHeight: 1.5,
        boxSizing: 'border-box',
        padding: '32px 36px',
      }}
    >
      <div style={{ borderBottom: `2px solid ${C.primary}`, paddingBottom: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatementIcon icon={group.icon} />
          <span>{group.name}</span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>
          {t.appName}
          {subtitle ? ` • ${subtitle}` : ''} • {t.settle.total}: {num(money(settlement.total), true)}{' '}
          {currencyLabel(locale)}
        </div>
      </div>

      {/* itemized expenses */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t.group.tabExpenses}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            <th style={{ textAlign: 'start', padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.expense.title}
            </th>
            <th style={{ textAlign: 'start', padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.expense.date}
            </th>
            <th style={{ textAlign: 'start', padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.expense.payer}
            </th>
            <th style={{ textAlign: align, padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.expense.amount}
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((expense) => (
            <tr key={expense.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 8px' }}>{expense.title}</td>
              <td style={{ padding: '6px 8px', color: C.muted }}>
                {formatDate(expense.date, locale)}
              </td>
              <td style={{ padding: '6px 8px', color: C.muted }}>
                {expense.payers.map((p) => nameOf(p.personId)).join(locale === 'fa' ? '، ' : ', ')}
              </td>
              <td style={{ padding: '6px 8px', textAlign: align }}>{num(money(expense.amount))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* per-person breakdown */}
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t.settle.balances}</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22 }}>
        <thead>
          <tr style={{ background: C.surface }}>
            <th style={{ textAlign: 'start', padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.people.name}
            </th>
            <th style={{ textAlign: align, padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.settle.paid}
            </th>
            <th style={{ textAlign: align, padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.settle.owed}
            </th>
            <th style={{ textAlign: align, padding: '6px 8px', fontSize: 12, color: C.muted }}>
              {t.settle.net}
            </th>
          </tr>
        </thead>
        <tbody>
          {settlement.balances.map((b) => (
            <tr key={b.personId} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '6px 8px', fontWeight: 600 }}>{b.name}</td>
              <td style={{ padding: '6px 8px', textAlign: align }}>{num(money(b.paid))}</td>
              <td style={{ padding: '6px 8px', textAlign: align }}>{num(money(b.owed))}</td>
              <td
                style={{
                  padding: '6px 8px',
                  textAlign: align,
                  color: b.net > 0 ? C.positive : b.net < 0 ? C.negative : C.muted,
                }}
              >
                {num(`${b.net > 0 ? '+' : b.net < 0 ? '−' : ''}${money(Math.abs(b.net))}`, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
        {t.settle.transfersTitle}
      </div>
      {settlement.transfers.length === 0 ? (
        <div style={{ color: C.positive, fontWeight: 600 }}>{t.settle.noTransfers}</div>
      ) : (
        settlement.transfers.map((transfer, i) => (
          <div
            key={`${transfer.fromPersonId}-${transfer.toPersonId}-${i}`}
            style={{ padding: '5px 0', borderBottom: `1px solid ${C.border}` }}
          >
            {nameOf(transfer.fromPersonId)} ➜ {nameOf(transfer.toPersonId)}:{' '}
            {num(money(transfer.amount), true)} {currencyLabel(locale)}
          </div>
        ))
      )}
    </div>
  );
}
