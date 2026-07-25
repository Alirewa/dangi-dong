import type { Expense, Group, Person, RoundTo, TransferStrategy } from '@/types/dong';
import type {
  BreakdownLine,
  PersonBalance,
  SettlementResult,
  Transfer,
} from '@/types/settlement';
import { allocate, quantize, sum } from './money';

/**
 * The settlement engine. Pure: no React, no DOM, no store imports.
 * Everything is integer Toman.
 */

export interface SplitOptions {
  roundTo?: RoundTo;
  /** absorbs the quantization residual; should be an included person */
  residualPersonId?: string | null;
}

/**
 * Returns personId → owed (integer Toman) for EVERY share row on the expense.
 * Excluded people are present with 0 so the UI can render a dash rather than
 * having to distinguish "absent" from "owes nothing".
 *
 * GUARANTEE: Σ values === expense.amount, for all three split kinds and all
 * rounding units. The rest of the engine depends on this holding.
 */
export function splitExpense(expense: Expense, opts: SplitOptions = {}): Record<string, number> {
  const rows = expense.shares;
  const out: Record<string, number> = {};
  for (const s of rows) out[s.personId] = 0;

  const inc = rows.filter((s) => s.included);
  const amount = Math.round(expense.amount);
  if (inc.length === 0 || amount === 0) return out;

  let owed: number[];

  if (expense.splitKind === 'exact') {
    // Typed amounts are authoritative; blank boxes (exactAmount === null) share
    // whatever remains, equally. This is the "Ali's dessert was 45,000, split
    // the rest" case in a single expense row.
    const typedIdx: number[] = [];
    const blankIdx: number[] = [];
    inc.forEach((s, i) => (s.exactAmount === null ? blankIdx : typedIdx).push(i));

    owed = inc.map((s) => (s.exactAmount === null ? 0 : Math.round(s.exactAmount) || 0));
    const remainder = amount - sum(owed);

    if (blankIdx.length > 0) {
      const spread = allocate(
        remainder,
        blankIdx.map(() => 1)
      );
      blankIdx.forEach((idx, k) => {
        owed[idx] = spread[k];
      });
    } else if (remainder !== 0) {
      // Every box was filled but the amounts do not add up to the total. Spread
      // the difference equally rather than silently rescaling what the user
      // typed, and never drop it — dropping would break Σ net === 0 and make
      // the settlement unsolvable. The form shows a live "باقی‌مانده" so this
      // path is rare.
      const spread = allocate(
        remainder,
        inc.map(() => 1)
      );
      owed = owed.map((v, i) => v + spread[i]);
    }
  } else {
    const weights =
      expense.splitKind === 'weight'
        ? inc.map((s) => (Number.isFinite(s.weight) && s.weight > 0 ? s.weight : 0))
        : inc.map(() => 1);
    // All-zero weights would be 0/0; fall back to an equal split.
    const usable = sum(weights) > 0 ? weights : inc.map(() => 1);
    owed = allocate(amount, usable);
  }

  const unit = opts.roundTo ?? 1;
  if (unit > 1) {
    let ri = opts.residualPersonId
      ? inc.findIndex((s) => s.personId === opts.residualPersonId)
      : -1;
    if (ri < 0) {
      // Next best residual holder: a payer who is also included.
      const payerIds = new Set(expense.payers.map((p) => p.personId));
      ri = inc.findIndex((s) => payerIds.has(s.personId));
    }
    owed = quantize(owed, unit, ri);
  }

  inc.forEach((s, i) => {
    out[s.personId] = owed[i];
  });
  return out;
}

export function computeBalances(
  expenses: Expense[],
  people: Person[],
  memberIds: string[],
  opts: SplitOptions = {}
): { balances: PersonBalance[]; perExpense: Record<string, Record<string, number>> } {
  const personById = new Map(people.map((p) => [p.id, p]));

  // Include every member, plus anyone referenced by an expense who has since
  // been removed from the group — otherwise their money would vanish.
  const ids = new Set(memberIds);
  for (const e of expenses) {
    for (const p of e.payers) ids.add(p.personId);
    for (const s of e.shares) if (s.included) ids.add(s.personId);
  }

  const acc = new Map<string, { paid: number; owed: number; count: number; lines: BreakdownLine[] }>();
  for (const id of ids) acc.set(id, { paid: 0, owed: 0, count: 0, lines: [] });

  const perExpense: Record<string, Record<string, number>> = {};

  for (const e of expenses) {
    const owedMap = splitExpense(e, opts);
    perExpense[e.id] = owedMap;

    const paidMap = new Map<string, number>();
    for (const p of e.payers) {
      paidMap.set(p.personId, (paidMap.get(p.personId) ?? 0) + Math.round(p.amount));
    }

    for (const id of ids) {
      const entry = acc.get(id);
      if (!entry) continue;
      const owed = owedMap[id] ?? 0;
      const paid = paidMap.get(id) ?? 0;
      if (owed === 0 && paid === 0) continue;

      entry.paid += paid;
      entry.owed += owed;
      if (owed !== 0) entry.count += 1;

      const share = e.shares.find((s) => s.personId === id);
      entry.lines.push({
        expenseId: e.id,
        title: e.title,
        date: e.date,
        category: e.category,
        expenseTotal: e.amount,
        weight: share?.included ? (e.splitKind === 'weight' ? share.weight : 1) : 0,
        owed,
        paid,
      });
    }
  }

  const order = new Map(memberIds.map((id, i) => [id, i]));
  const balances: PersonBalance[] = [...ids].map((id) => {
    const entry = acc.get(id)!;
    const person = personById.get(id);
    return {
      personId: id,
      name: person?.name ?? '—',
      color: person?.color ?? '#64748b',
      paid: entry.paid,
      owed: entry.owed,
      net: entry.paid - entry.owed,
      expenseCount: entry.count,
      lines: entry.lines,
    };
  });

  // Creditors desc → zeros → debtors asc, with group order as the tiebreaker
  // so the list is stable across renders.
  balances.sort(
    (a, b) =>
      b.net - a.net ||
      (order.get(a.personId) ?? 999) - (order.get(b.personId) ?? 999) ||
      a.personId.localeCompare(b.personId)
  );

  return { balances, perExpense };
}

/**
 * Greedy min-cash-flow. Yields at most (creditors + debtors − 1) transfers.
 *
 * Exact minimum-transaction partitioning is NP-hard; this is the standard
 * practical answer and is optimal whenever one party is on every edge — which
 * is the dominant real case here (one main payer fronted everything).
 *
 * With `preferPersonId` set, that creditor is served first so most transfers
 * point at the main payer. That is what people socially expect, occasionally at
 * the cost of one extra transfer versus pure greedy.
 */
export function minimizeTransfers(
  nets: { personId: string; net: number }[],
  opts: { preferPersonId?: string | null } = {}
): Transfer[] {
  const prefer = opts.preferPersonId ?? null;

  const creditors = nets
    .filter((n) => n.net > 0)
    .map((n) => ({ ...n }))
    .sort(
      (a, b) =>
        (b.personId === prefer ? 1 : 0) - (a.personId === prefer ? 1 : 0) ||
        b.net - a.net ||
        a.personId.localeCompare(b.personId)
    );

  const debtors = nets
    .filter((n) => n.net < 0)
    .map((n) => ({ personId: n.personId, net: -n.net }))
    .sort((a, b) => b.net - a.net || a.personId.localeCompare(b.personId));

  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].net, creditors[j].net);
    if (amount > 0) {
      out.push({
        fromPersonId: debtors[i].personId,
        toPersonId: creditors[j].personId,
        amount,
      });
    }
    debtors[i].net -= amount;
    creditors[j].net -= amount;
    if (debtors[i].net === 0) i++;
    if (creditors[j].net === 0) j++;
  }
  return out;
}

export function pickTreasurer(
  balances: PersonBalance[],
  override: string | null,
  memberIds: string[]
): string | null {
  if (override && memberIds.includes(override)) return override;
  const creditors = balances.filter((b) => b.net > 0);
  if (creditors.length === 0) return null;
  // balances is already sorted creditors-first, but be explicit and deterministic.
  return creditors.reduce((best, b) =>
    b.net > best.net || (b.net === best.net && b.personId < best.personId) ? b : best
  ).personId;
}

export interface SettleInput {
  group: Group;
  /** monthly: the period being settled; event: null */
  periodId: string | null;
  /** caller pre-filters by group AND period */
  expenses: Expense[];
  people: Person[];
  roundTo?: RoundTo;
  strategy?: TransferStrategy;
}

export function settle(input: SettleInput): SettlementResult {
  const { group, periodId, expenses, people } = input;
  const roundTo = input.roundTo ?? 1;
  const strategy = input.strategy ?? 'treasurer-first';

  // Two passes. The first finds the treasurer from unrounded balances; the
  // second re-splits with the treasurer as the residual holder, so rounding
  // lands on the person who actually fronted the money rather than on whoever
  // happened to sort first.
  const first = computeBalances(expenses, people, group.memberIds, { roundTo: 1 });
  const treasurerId = pickTreasurer(first.balances, group.treasurerId, group.memberIds);

  const { balances, perExpense } = computeBalances(expenses, people, group.memberIds, {
    roundTo,
    residualPersonId: treasurerId,
  });

  const transfers = minimizeTransfers(
    balances.map((b) => ({ personId: b.personId, net: b.net })),
    { preferPersonId: strategy === 'treasurer-first' ? treasurerId : null }
  );

  const total = sum(expenses.map((e) => Math.round(e.amount)));

  const sharesSumOk = expenses.every(
    (e) => sum(Object.values(perExpense[e.id] ?? {})) === Math.round(e.amount)
  );
  const netSumZero = sum(balances.map((b) => b.net)) === 0;
  const transfersReconcile = balances.every((b) => {
    const outgoing = sum(
      transfers.filter((t) => t.fromPersonId === b.personId).map((t) => t.amount)
    );
    const incoming = sum(transfers.filter((t) => t.toPersonId === b.personId).map((t) => t.amount));
    return incoming - outgoing === b.net;
  });

  return {
    groupId: group.id,
    periodId,
    total,
    expenseCount: expenses.length,
    balances,
    transfers,
    treasurerId,
    perExpense,
    checks: { sharesSumOk, netSumZero, transfersReconcile },
  };
}
