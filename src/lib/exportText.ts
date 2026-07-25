import type { Dict } from '@/i18n';
import type { Group, Locale, Period, Person } from '@/types/dong';
import type { SettlementResult } from '@/types/settlement';
import { formatCardNumber } from './bank';
import { currencyLabel, formatDate, formatJalaliMonth, formatNumber } from './format';

/**
 * Plain-text summary for pasting into a Telegram/WhatsApp group.
 *
 * Pure and DOM-free — this is the only place besides <Money> allowed to format
 * an amount, because there is no React here to render a component.
 */
export function buildSummaryText({
  group,
  period,
  people,
  settlement,
  locale,
  t,
}: {
  group: Group;
  period: Period | null;
  people: Person[];
  settlement: SettlementResult;
  locale: Locale;
  t: Dict;
}): string {
  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '—';
  const money = (v: number) => `${formatNumber(v, locale)} ${currencyLabel(locale)}`;

  const subtitle =
    group.mode === 'monthly' && period
      ? formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)
      : group.eventDate
        ? formatDate(group.eventDate, locale)
        : '';

  const lines: string[] = [];

  // Plain text has no icons, so the emoji markers stay here: they are what make
  // the message scannable once pasted into a Telegram or WhatsApp thread.
  lines.push(`🧾 ${t.appName} — ${group.name}`);
  lines.push(
    `📅 ${subtitle ? `${subtitle} • ` : ''}${formatNumber(settlement.expenseCount, locale)} ${
      t.settle.expenses
    } • ${t.settle.total}: ${money(settlement.total)}`
  );
  lines.push('');

  for (const b of settlement.balances) {
    lines.push(
      `👤 ${b.name} — ${formatNumber(b.expenseCount, locale)} ${t.settle.itemsIncluded} — ${money(
        b.owed
      )}`
    );
  }

  const treasurer = settlement.treasurerId
    ? people.find((p) => p.id === settlement.treasurerId)
    : null;

  if (treasurer) {
    lines.push('');
    const payout = treasurer.payout;
    const holder = payout?.holderName?.trim() || treasurer.name;
    lines.push(
      `💳 ${t.settle.treasurerTitle}: ${holder}${payout?.bankName ? ` (${payout.bankName})` : ''}`
    );
    if (payout?.cardNumber) lines.push(`   ${formatCardNumber(payout.cardNumber)}`);
  }

  lines.push('');
  lines.push(`🔁 ${t.settle.transfersTitle}:`);
  if (settlement.transfers.length === 0) {
    lines.push(`   ${t.settle.noTransfers}`);
  } else {
    for (const transfer of settlement.transfers) {
      lines.push(
        `   ${nameOf(transfer.fromPersonId)} ➜ ${nameOf(transfer.toPersonId)}: ${money(
          transfer.amount
        )}`
      );
    }
  }

  return lines.join('\n');
}
