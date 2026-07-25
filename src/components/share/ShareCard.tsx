'use client';

import { formatCardNumber, formatIban } from '@/lib/bank';
import { currencyLabel, formatDate, formatJalaliMonth, formatNumber } from '@/lib/format';
import { SHARE_WIDTH } from '@/lib/exportImage';
import type { Dict } from '@/i18n';
import type { Group, Locale, Period, Person, RoundTo } from '@/types/dong';
import type { SettlementResult } from '@/types/settlement';
import { SHARE_COLORS as C } from './shareColors';

/**
 * The PNG capture target.
 *
 * Construction rules that differ deliberately from the rest of the app:
 *  - literal hex in inline styles, never Tailwind classes (see shareColors.ts)
 *  - always light, regardless of the app theme
 *  - no box-shadow + filter, no backdrop-filter, no background-image, no
 *    external <img> — each of these has been observed to break html-to-image
 *  - every amount is wrapped in <Num>, which carries the bidi isolation that
 *    stops numbers reordering inside RTL text
 */

function Num({ children, bold, color }: { children: string; bold?: boolean; color?: string }) {
  return (
    <span
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: bold ? 700 : 500,
        color: color ?? C.text,
      }}
    >
      {children}
    </span>
  );
}

export function ShareCard({
  id,
  group,
  period,
  people,
  settlement,
  locale,
  dir,
  t,
  roundTo,
}: {
  id: string;
  group: Group;
  period: Period | null;
  people: Person[];
  settlement: SettlementResult;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
  roundTo: RoundTo;
}) {
  const personById = (pid: string) => people.find((p) => p.id === pid) ?? null;
  const nameOf = (pid: string) => personById(pid)?.name ?? '—';
  const money = (v: number) => formatNumber(v, locale);

  const treasurer = settlement.treasurerId ? personById(settlement.treasurerId) : null;
  const payout = treasurer?.payout ?? null;
  const hasPayout = Boolean(payout?.cardNumber || payout?.iban);

  const subtitle =
    group.mode === 'monthly' && period
      ? formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)
      : group.eventDate
        ? formatDate(group.eventDate, locale)
        : '';

  return (
    <div
      id={id}
      dir={dir}
      style={{
        width: SHARE_WIDTH,
        background: C.background,
        color: C.text,
        fontFamily: "'Vazirmatn', system-ui, sans-serif",
        fontSize: 16,
        lineHeight: 1.6,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      {/* header */}
      <div style={{ background: C.primary, padding: '24px 28px', color: '#ffffff' }}>
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
          {group.emoji} {group.name}
        </div>
        <div style={{ fontSize: 15, opacity: 0.9 }}>
          {t.appName}
          {subtitle ? ` • ${subtitle}` : ''}
        </div>
      </div>

      {/* totals strip */}
      <div
        style={{
          display: 'flex',
          background: C.surface,
          borderBottom: `1px solid ${C.border}`,
          padding: '16px 28px',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: C.muted }}>{t.settle.total}</div>
          <div style={{ fontSize: 22 }}>
            <Num bold color={C.primary}>
              {money(settlement.total)}
            </Num>{' '}
            <span style={{ fontSize: 14, color: C.muted }}>{currencyLabel(locale)}</span>
          </div>
        </div>
        <div style={{ textAlign: dir === 'rtl' ? 'left' : 'right' }}>
          <div style={{ fontSize: 13, color: C.muted }}>
            {t.settle.expenses} • {t.settle.people}
          </div>
          <div style={{ fontSize: 18 }}>
            <Num bold>{money(settlement.expenseCount)}</Num>
            <span style={{ color: C.muted }}> • </span>
            <Num bold>{money(settlement.balances.length)}</Num>
          </div>
        </div>
      </div>

      {/* مادرخرج */}
      {treasurer && (
        <div
          style={{
            margin: '20px 28px 0',
            border: `2px solid ${C.primary}`,
            borderRadius: 14,
            background: C.primarySoft,
            padding: '16px 18px',
          }}
        >
          <div style={{ fontSize: 13, color: C.primaryDark, fontWeight: 600, marginBottom: 6 }}>
            {t.settle.treasurerTitle}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
            {payout?.holderName?.trim() || treasurer.name}
            {payout?.bankName ? (
              <span style={{ fontSize: 14, fontWeight: 500, color: C.muted }}>
                {' '}
                — {payout.bankName}
              </span>
            ) : null}
          </div>

          {hasPayout ? (
            <div style={{ marginTop: 10 }}>
              {payout?.cardNumber && (
                <div style={{ fontSize: 22, letterSpacing: 1 }}>
                  <Num bold>{formatCardNumber(payout.cardNumber)}</Num>
                </div>
              )}
              {payout?.iban && (
                <div style={{ fontSize: 14, marginTop: 4, color: C.muted }}>
                  <Num>{formatIban(payout.iban)}</Num>
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 6, fontSize: 13, color: C.muted }}>
              {t.group.payoutMissing}
            </div>
          )}
        </div>
      )}

      {/* per-person */}
      <div style={{ padding: '20px 28px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 10 }}>
          {t.settle.balances}
        </div>

        {settlement.balances.map((b) => (
          <div
            key={b.personId}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 0',
              borderBottom: `1px solid ${C.border}`,
            }}
          >
            <span
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                background: b.color,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 15,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {[...b.name.trim()][0] ?? '?'}
            </span>

            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: 16 }}>{b.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: C.muted }}>
                <Num color={C.muted}>{money(b.expenseCount)}</Num> {t.settle.itemsIncluded}
                {b.paid > 0 && (
                  <>
                    {' • '}
                    {t.settle.paid} <Num color={C.muted}>{money(b.paid)}</Num>
                  </>
                )}
              </span>
            </span>

            <span style={{ textAlign: dir === 'rtl' ? 'left' : 'right', flexShrink: 0 }}>
              <span style={{ display: 'block', fontSize: 18 }}>
                <Num bold>{money(b.owed)}</Num>
              </span>
              {b.net !== 0 && (
                <span
                  style={{
                    display: 'inline-block',
                    marginTop: 2,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    padding: '1px 6px',
                    background: b.net > 0 ? C.positiveSoft : C.negativeSoft,
                    color: b.net > 0 ? C.positive : C.negative,
                  }}
                >
                  {b.net > 0 ? t.settle.creditor : t.settle.debtor}{' '}
                  <Num color={b.net > 0 ? C.positive : C.negative}>{money(Math.abs(b.net))}</Num>
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      {/* transfers */}
      <div style={{ padding: '18px 28px 0' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.muted, marginBottom: 8 }}>
          {t.settle.transfersTitle}
        </div>

        {settlement.transfers.length === 0 ? (
          <div
            style={{
              background: C.positiveSoft,
              color: C.positive,
              borderRadius: 10,
              padding: '10px 14px',
              fontWeight: 600,
            }}
          >
            {t.settle.noTransfers}
          </div>
        ) : (
          settlement.transfers.map((transfer, i) => (
            <div
              key={`${transfer.fromPersonId}-${transfer.toPersonId}-${i}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: C.surface,
                borderRadius: 10,
                padding: '10px 14px',
                marginBottom: 6,
              }}
            >
              <span style={{ fontWeight: 600 }}>{nameOf(transfer.fromPersonId)}</span>
              <span style={{ color: C.primary, fontWeight: 700 }}>
                {dir === 'rtl' ? '◀' : '▶'}
              </span>
              <span style={{ fontWeight: 600, flex: 1 }}>{nameOf(transfer.toPersonId)}</span>
              <span style={{ fontSize: 17 }}>
                <Num bold color={C.primary}>
                  {money(transfer.amount)}
                </Num>
              </span>
            </div>
          ))
        )}
      </div>

      {/* rounding disclosure — without this, the residual on one person's row
          looks like an arithmetic bug */}
      <div style={{ padding: '14px 28px 0' }}>
        <div
          style={{
            background: C.warningSoft,
            color: C.warningText,
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
          }}
        >
          {roundTo > 1
            ? t.settle.roundNote.replace('{unit}', formatNumber(roundTo, locale))
            : t.settle.roundNoteExact}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: '12px 28px 20px',
          fontSize: 12,
          color: C.muted,
          textAlign: 'center',
        }}
      >
        {t.appName} — {t.appTagline}
      </div>
    </div>
  );
}
