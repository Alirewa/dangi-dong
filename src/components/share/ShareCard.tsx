'use client';

import { GROUP_ICONS } from '@/components/groups/groupIcons';
import { formatCardNumber, formatIban } from '@/lib/bank';
import { currencyLabel, formatDate, formatJalaliMonth, formatNumber } from '@/lib/format';
import { SHARE_WIDTH } from '@/lib/exportImage';
import type { Dict } from '@/i18n';
import type { Group, Locale, Period, Person } from '@/types/dong';
import type { SettlementResult } from '@/types/settlement';
import { SHARE_COLORS as C } from './shareColors';

/**
 * The PNG capture target: who pays whom, plus the card to pay it to.
 *
 * Each row names a person and, with an arrow, the person they owe — so a
 * recipient can find their own line and know both the amount and the
 * destination without reading anything else. The creditor's own row is marked
 * as the receiver rather than pointing anywhere.
 *
 * Construction rules that differ from the rest of the app:
 *  - literal hex in inline styles, never Tailwind classes (see shareColors.ts)
 *  - fixed dark palette, independent of the app theme
 *  - no box-shadow + filter, no backdrop-filter, no background-image, no
 *    external <img> — each has been observed to break html-to-image
 *  - every amount carries bidi isolation so digits cannot reorder in RTL
 */

function Num({
  children,
  bold,
  color,
  size,
}: {
  children: string;
  bold?: boolean;
  color?: string;
  size?: number;
}) {
  return (
    <span
      style={{
        direction: 'ltr',
        unicodeBidi: 'isolate',
        fontVariantNumeric: 'tabular-nums',
        fontWeight: bold ? 700 : 500,
        color: color ?? C.text,
        fontSize: size,
      }}
    >
      {children}
    </span>
  );
}

function GroupGlyph({ icon }: { icon: keyof typeof GROUP_ICONS }) {
  const Icon = GROUP_ICONS[icon] ?? GROUP_ICONS.home;
  return <Icon width={26} height={26} strokeWidth={2.2} aria-hidden="true" />;
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
}: {
  id: string;
  group: Group;
  period: Period | null;
  people: Person[];
  settlement: SettlementResult;
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: Dict;
}) {
  const money = (v: number) => formatNumber(v, locale);
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  const treasurer = settlement.treasurerId
    ? (people.find((p) => p.id === settlement.treasurerId) ?? null)
    : null;
  const payout = treasurer?.payout ?? null;

  // personId → who they pay and how much. One entry per debtor.
  const owes = new Map<string, { to: string; amount: number }>();
  for (const tr of settlement.transfers) {
    const existing = owes.get(tr.fromPersonId);
    owes.set(tr.fromPersonId, {
      to: tr.toPersonId,
      amount: (existing?.amount ?? 0) + tr.amount,
    });
  }

  const subtitle =
    group.mode === 'monthly' && period
      ? formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)
      : group.eventDate
        ? formatDate(group.eventDate, locale)
        : '';

  const alignEnd = dir === 'rtl' ? ('left' as const) : ('right' as const);
  // Arrows must point along the reading direction, not against it.
  const arrow = dir === 'rtl' ? '◀' : '▶';

  // Debtors first: they are the people who have something to do.
  const rows = [...settlement.balances].sort((a, b) => {
    const ao = owes.has(a.personId) ? 0 : 1;
    const bo = owes.has(b.personId) ? 0 : 1;
    return ao - bo;
  });

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
        boxSizing: 'border-box',
      }}
    >
      {/* header */}
      <div
        style={{
          background: C.primaryDark,
          padding: '26px 30px',
          color: C.text,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GroupGlyph icon={group.icon} />
          <span style={{ fontSize: 27, fontWeight: 700 }}>{group.name}</span>
        </div>
        <div style={{ marginTop: 6, fontSize: 15, color: C.muted }}>
          {subtitle}
          {subtitle ? ' • ' : ''}
          {t.settle.total}:{' '}
          <Num bold color={C.primary}>
            {money(settlement.total)}
          </Num>{' '}
          {currencyLabel(locale)}
        </div>
      </div>

      {/* who pays whom */}
      <div style={{ padding: '22px 30px 0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'start',
                  padding: '0 12px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                {t.people.name}
              </th>
              <th
                style={{
                  textAlign: alignEnd,
                  padding: '0 12px 10px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: C.muted,
                  borderBottom: `2px solid ${C.border}`,
                }}
              >
                {t.settle.owed}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b, i) => {
              const debt = owes.get(b.personId);
              const isReceiver = b.personId === settlement.treasurerId && !debt;
              return (
                <tr
                  key={b.personId}
                  style={{
                    background: i % 2 === 1 ? C.surfaceAlt : 'transparent',
                  }}
                >
                  <td
                    style={{
                      padding: '13px 12px',
                      fontSize: 18,
                      fontWeight: 600,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        background: b.color,
                        marginInlineEnd: 10,
                      }}
                    />
                    {b.name}
                    {debt && (
                      <>
                        <span
                          style={{
                            margin: '0 8px',
                            color: C.primary,
                            fontSize: 15,
                          }}
                        >
                          {arrow}
                        </span>
                        <span style={{ color: C.primary }}>{nameOf(debt.to)}</span>
                      </>
                    )}
                    {isReceiver && (
                      <span
                        style={{
                          marginInlineStart: 10,
                          fontSize: 13,
                          color: C.positive,
                        }}
                      >
                        {t.settle.creditor}
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      padding: '13px 12px',
                      textAlign: alignEnd,
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <Num bold size={20} color={debt ? C.text : C.positive}>
                      {money(debt ? debt.amount : isReceiver ? b.net : b.owed)}
                    </Num>
                    <span
                      style={{
                        marginInlineStart: 5,
                        fontSize: 13,
                        color: C.muted,
                      }}
                    >
                      {currencyLabel(locale)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* the payment card */}
      {treasurer && (
        <div style={{ padding: '22px 30px 0' }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 18,
              padding: '20px 22px',
              color: C.text,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: 1, color: C.muted }}>
              {t.settle.treasurerTitle}
            </div>

            {payout?.cardNumber ? (
              <div
                style={{
                  margin: '14px 0 16px',
                  fontSize: 27,
                  letterSpacing: 2,
                }}
              >
                <Num bold color={C.primary}>
                  {formatCardNumber(payout.cardNumber)}
                </Num>
              </div>
            ) : (
              <div style={{ margin: '14px 0 16px', fontSize: 15, color: C.muted }}>
                {t.group.payoutMissing}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700 }}>
                  {payout?.holderName?.trim() || treasurer.name}
                </div>
                {payout?.iban && (
                  <div style={{ marginTop: 4, fontSize: 12, color: C.muted }}>
                    <Num color={C.muted}>{formatIban(payout.iban)}</Num>
                  </div>
                )}
              </div>
              {payout?.bankName && (
                <div style={{ fontSize: 14, color: C.muted, whiteSpace: 'nowrap' }}>
                  {payout.bankName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          padding: '18px 30px 22px',
          fontSize: 12,
          color: C.muted,
          textAlign: 'center',
        }}
      >
        {t.appName} — by @Alirewa
      </div>
    </div>
  );
}
