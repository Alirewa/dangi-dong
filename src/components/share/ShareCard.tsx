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
 *  - fixed dark palette, independent of the app theme. The capture must be
 *    given the same background (see buildShareBlob) or html-to-image fills the
 *    canvas white behind it.
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
  return <Icon width={26} height={26} strokeWidth={2.2} color={C.primary} aria-hidden="true" />;
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
  const hasCard = Boolean(payout?.cardNumber || payout?.iban);

  const alignEnd = dir === 'rtl' ? ('left' as const) : ('right' as const);
  const arrow = flowArrow(dir);

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
        padding: 28,
      }}
    >
      {/* header: group, the day the image was produced, and the pot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: C.primarySoft,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <GroupGlyph icon={group.icon} />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: 'block', fontSize: 25, fontWeight: 700 }}>{group.name}</span>
          <span style={{ display: 'block', fontSize: 13, color: C.muted }}>
            {formatDate(todayIso(), locale)}
          </span>
        </span>
        <span style={{ textAlign: alignEnd, flexShrink: 0 }}>
          <span style={{ display: 'block', fontSize: 11, color: C.muted }}>{t.settle.total}</span>
          <Num bold size={20} color={C.primary}>
            {money(settlement.total)}
          </Num>
        </span>
      </div>

      {/* the transfer table */}
      <div style={{ marginTop: 22 }}>
        {settlement.transfers.length === 0 ? (
          <div
            style={{
              background: C.positiveSoft,
              color: C.positive,
              borderRadius: 16,
              padding: '20px',
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
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            {settlement.transfers.map((transfer, i) => (
              <div
                key={`${transfer.fromPersonId}-${transfer.toPersonId}-${i}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '16px 20px',
                  borderTop: i === 0 ? 'none' : `1px solid ${C.border}`,
                }}
              >
                <span style={{ minWidth: 0, flex: 1, fontSize: 18, fontWeight: 600 }}>
                  <span>{nameOf(transfer.fromPersonId)}</span>
                  <span style={{ margin: '0 10px', color: C.primary, fontSize: 15 }}>{arrow}</span>
                  <span style={{ color: C.primary }}>{nameOf(transfer.toPersonId)}</span>
                </span>
                <span style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                  <Num bold size={19}>
                    {money(transfer.amount)}
                  </Num>
                  <span style={{ marginInlineStart: 5, fontSize: 12, color: C.muted }}>
                    {currencyLabel(locale)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* the card to pay into */}
      {treasurer && hasCard && (
        <div
          style={{
            marginTop: 16,
            background: C.primaryDark,
            border: `1px solid ${C.primarySoft}`,
            borderRadius: 16,
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
      )}

      <div style={{ marginTop: 18, fontSize: 11, color: C.muted, textAlign: 'center' }}>
        {t.appName} — by @Alirewa
      </div>
    </div>
  );
}
