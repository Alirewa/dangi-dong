'use client';

import { GROUP_ICONS } from '@/components/groups/groupIcons';
import { formatCardNumber, formatIban } from '@/lib/bank';
import { currencyLabel, flowArrow, formatDate, formatNumber } from '@/lib/format';
import { SHARE_WIDTH } from '@/lib/exportImage';
import { todayIso } from '@/lib/utils';
import type { Dict } from '@/i18n';
import type { Group, Locale, Period, Person } from '@/types/dong';
import type { SettlementResult } from '@/types/settlement';
import { SHARE_COLORS as C } from './shareColors';

/**
 * The PNG capture target: who pays whom, and the card to pay it to.
 *
 * One row per transfer — payer, arrow, recipient, amount — so a recipient finds
 * their own line and needs nothing else. People with nothing to pay are absent
 * rather than listed with a share that reads like an outstanding debt.
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
  return <Icon width={24} height={24} strokeWidth={2.2} color={C.primary} aria-hidden="true" />;
}

export function ShareCard({
  id,
  group,
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

  const alignEnd = dir === 'rtl' ? ('left' as const) : ('right' as const);
  const arrow = flowArrow(dir);

  const PAD = 30;

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
        paddingBottom: 4,
      }}
    >
      {/* header: group and the day the image was produced */}
      <div
        style={{
          padding: `${PAD}px ${PAD}px 22px`,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GroupGlyph icon={group.icon} />
          <span style={{ fontSize: 26, fontWeight: 700 }}>{group.name}</span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 14, color: C.muted }}>{formatDate(todayIso(), locale)}</span>
          <span style={{ fontSize: 14, color: C.muted }}>
            {t.settle.total}:{' '}
            <Num bold color={C.primary}>
              {money(settlement.total)}
            </Num>{' '}
            {currencyLabel(locale)}
          </span>
        </div>
      </div>

      {/* the transfer table */}
      <div style={{ padding: `22px ${PAD}px 0` }}>
        {settlement.transfers.length === 0 ? (
          <div
            style={{
              background: C.positiveSoft,
              color: C.positive,
              borderRadius: 14,
              padding: '18px 20px',
              fontSize: 18,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {t.settle.noTransfers}
          </div>
        ) : (
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surfaceAlt }}>
                  <th
                    style={{
                      textAlign: 'start',
                      padding: '11px 18px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.muted,
                      letterSpacing: 0.5,
                    }}
                  >
                    {t.settle.transfersTitle}
                  </th>
                  <th
                    style={{
                      textAlign: alignEnd,
                      padding: '11px 18px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.muted,
                      letterSpacing: 0.5,
                    }}
                  >
                    {t.payment.amount}
                  </th>
                </tr>
              </thead>
              <tbody>
                {settlement.transfers.map((transfer, i) => (
                  <tr
                    key={`${transfer.fromPersonId}-${transfer.toPersonId}-${i}`}
                    style={{
                      borderTop: `1px solid ${C.border}`,
                    }}
                  >
                    <td style={{ padding: '15px 18px', fontSize: 18, fontWeight: 600 }}>
                      <span>{nameOf(transfer.fromPersonId)}</span>
                      <span style={{ margin: '0 10px', color: C.primary, fontSize: 16 }}>
                        {arrow}
                      </span>
                      <span style={{ color: C.primary }}>{nameOf(transfer.toPersonId)}</span>
                    </td>
                    <td style={{ padding: '15px 18px', textAlign: alignEnd, whiteSpace: 'nowrap' }}>
                      <Num bold size={19}>
                        {money(transfer.amount)}
                      </Num>
                      <span style={{ marginInlineStart: 5, fontSize: 12, color: C.muted }}>
                        {currencyLabel(locale)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* the card to pay into */}
      {treasurer && (payout?.cardNumber || payout?.iban) && (
        <div style={{ padding: `18px ${PAD}px 0` }}>
          <div
            style={{
              background: C.primaryDark,
              border: `1px solid ${C.primarySoft}`,
              borderRadius: 14,
              padding: '18px 20px',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1, color: C.primary }}>
              {t.settle.treasurerTitle}
            </div>

            {payout?.cardNumber && (
              <div style={{ margin: '10px 0 12px', fontSize: 26, letterSpacing: 2 }}>
                <Num bold>{formatCardNumber(payout.cardNumber)}</Num>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {payout?.holderName?.trim() || treasurer.name}
                </div>
                {payout?.iban && (
                  <div style={{ marginTop: 3, fontSize: 11, color: C.muted }}>
                    <Num color={C.muted}>{formatIban(payout.iban)}</Num>
                  </div>
                )}
              </div>
              {payout?.bankName && (
                <div style={{ fontSize: 13, color: C.muted, whiteSpace: 'nowrap' }}>
                  {payout.bankName}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          padding: `18px ${PAD}px 22px`,
          fontSize: 11,
          color: C.muted,
          textAlign: 'center',
        }}
      >
        {t.appName} — by @Alirewa
      </div>
    </div>
  );
}
