import { describe, expect, it } from 'vitest';
import type {
  Expense,
  ExpenseShare,
  Group,
  Payment,
  Person,
  RoundTo,
  SplitKind,
} from '@/types/dong';
import { sum } from './money';
import { minimizeTransfers, settle, splitExpense } from './settlement';

// ── fixtures ─────────────────────────────────────────────────────────────────

function person(id: string, name = id): Person {
  return {
    id,
    name,
    scope: 'global',
    groupId: null,
    color: '#0f766e',
    payout: null,
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function group(memberIds: string[], treasurerId: string | null = null): Group {
  return {
    id: 'g1',
    mode: 'event',
    name: 'Test',
    icon: 'utensils',
    memberIds,
    treasurerId,
    activePeriodId: null,
    eventDate: '2026-01-01',
    note: '',
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

interface ExpenseSpec {
  id?: string;
  amount: number;
  splitKind?: SplitKind;
  payers?: { personId: string; amount: number }[];
  payer?: string;
  shares: (Partial<ExpenseShare> & { personId: string })[];
}

function expense(spec: ExpenseSpec): Expense {
  const amount = spec.amount;
  return {
    id: spec.id ?? 'e1',
    groupId: 'g1',
    periodId: null,
    title: 'x',
    category: 'other',
    amount,
    date: '2026-01-01',
    payers: spec.payers ?? [{ personId: spec.payer ?? spec.shares[0].personId, amount }],
    splitKind: spec.splitKind ?? 'equal',
    shares: spec.shares.map((s) => ({
      personId: s.personId,
      included: s.included ?? true,
      weight: s.weight ?? 1,
      exactAmount: s.exactAmount ?? null,
    })),
    note: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function payment(from: string, to: string, amount: number): Payment {
  return {
    id: `pay-${from}-${to}-${amount}`,
    groupId: 'g1',
    kind: 'transfer',
    periodId: null,
    fromPersonId: from,
    toPersonId: to,
    amount,
    date: '2026-01-02',
    note: '',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

// ── splitExpense ─────────────────────────────────────────────────────────────

describe('splitExpense', () => {
  it('splits equally and sums to the total', () => {
    const e = expense({
      amount: 100000,
      shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
    });
    const owed = splitExpense(e);
    expect(sum(Object.values(owed))).toBe(100000);
  });

  it('gives zero to excluded people but still lists them', () => {
    const e = expense({
      amount: 90000,
      shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c', included: false }],
    });
    const owed = splitExpense(e);
    expect(owed.c).toBe(0);
    expect(owed).toHaveProperty('c');
    expect(sum(Object.values(owed))).toBe(90000);
  });

  it('applies weights', () => {
    const e = expense({
      amount: 100000,
      splitKind: 'weight',
      shares: [
        { personId: 'a', weight: 2 },
        { personId: 'b', weight: 1 },
        { personId: 'c', weight: 1 },
      ],
    });
    expect(splitExpense(e)).toEqual({ a: 50000, b: 25000, c: 25000 });
  });

  it('gives zero to a zero-weight person and lets others absorb it', () => {
    const e = expense({
      amount: 90000,
      splitKind: 'weight',
      shares: [
        { personId: 'a', weight: 1 },
        { personId: 'b', weight: 0 },
        { personId: 'c', weight: 2 },
      ],
    });
    const owed = splitExpense(e);
    expect(owed.b).toBe(0);
    expect(sum(Object.values(owed))).toBe(90000);
  });

  it('falls back to an equal split when every weight is zero', () => {
    const e = expense({
      amount: 90000,
      splitKind: 'weight',
      shares: [
        { personId: 'a', weight: 0 },
        { personId: 'b', weight: 0 },
        { personId: 'c', weight: 0 },
      ],
    });
    expect(splitExpense(e)).toEqual({ a: 30000, b: 30000, c: 30000 });
  });

  // The mixed case the user asked for: Ali's dessert is exact, the rest split.
  it('exact mode: typed boxes are authoritative, blanks share the remainder', () => {
    const e = expense({
      amount: 200000,
      splitKind: 'exact',
      shares: [{ personId: 'ali', exactAmount: 45000 }, { personId: 'reza' }, { personId: 'sara' }],
    });
    const owed = splitExpense(e);
    expect(owed.ali).toBe(45000);
    expect(owed.reza).toBe(77500);
    expect(owed.sara).toBe(77500);
    expect(sum(Object.values(owed))).toBe(200000);
  });

  it('exact mode: all boxes filled and under the total spreads the difference', () => {
    const e = expense({
      amount: 100000,
      splitKind: 'exact',
      shares: [
        { personId: 'a', exactAmount: 40000 },
        { personId: 'b', exactAmount: 40000 },
      ],
    });
    const owed = splitExpense(e);
    expect(sum(Object.values(owed))).toBe(100000);
    expect(owed.a).toBe(50000);
  });

  it('exact mode: all boxes filled and over the total still sums to the total', () => {
    const e = expense({
      amount: 100000,
      splitKind: 'exact',
      shares: [
        { personId: 'a', exactAmount: 80000 },
        { personId: 'b', exactAmount: 80000 },
      ],
    });
    expect(sum(Object.values(splitExpense(e)))).toBe(100000);
  });

  it('exact mode: typed amounts exceeding the total leave blanks negative but exact', () => {
    const e = expense({
      amount: 100000,
      splitKind: 'exact',
      shares: [{ personId: 'a', exactAmount: 120000 }, { personId: 'b' }],
    });
    const owed = splitExpense(e);
    expect(owed.a).toBe(120000);
    expect(sum(Object.values(owed))).toBe(100000);
  });

  it('rounding preserves the total and rounds every non-residual share', () => {
    const e = expense({
      amount: 100000,
      shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
      payer: 'a',
    });
    const owed = splitExpense(e, { roundTo: 1000, residualPersonId: 'a' });
    expect(sum(Object.values(owed))).toBe(100000);
    expect(owed.b % 1000).toBe(0);
    expect(owed.c % 1000).toBe(0);
  });

  it('returns all zeros for a zero-amount expense', () => {
    const e = expense({
      amount: 0,
      shares: [{ personId: 'a' }, { personId: 'b' }],
    });
    expect(splitExpense(e)).toEqual({ a: 0, b: 0 });
  });

  it('returns all zeros when nobody is included', () => {
    const e = expense({
      amount: 50000,
      shares: [
        { personId: 'a', included: false },
        { personId: 'b', included: false },
      ],
    });
    expect(splitExpense(e)).toEqual({ a: 0, b: 0 });
  });
});

// ── minimizeTransfers ────────────────────────────────────────────────────────

describe('minimizeTransfers', () => {
  it('produces no transfers when everyone is square', () => {
    expect(
      minimizeTransfers([
        { personId: 'a', net: 0 },
        { personId: 'b', net: 0 },
      ])
    ).toEqual([]);
  });

  it('routes a single-payer case to that payer', () => {
    const transfers = minimizeTransfers([
      { personId: 'a', net: 60000 },
      { personId: 'b', net: -30000 },
      { personId: 'c', net: -30000 },
    ]);
    expect(transfers).toHaveLength(2);
    expect(transfers.every((t) => t.toPersonId === 'a')).toBe(true);
  });

  it('never emits a zero or negative transfer', () => {
    const transfers = minimizeTransfers([
      { personId: 'a', net: 10 },
      { personId: 'b', net: -10 },
      { personId: 'c', net: 0 },
    ]);
    expect(transfers.every((t) => t.amount > 0)).toBe(true);
  });

  it('serves the preferred creditor first', () => {
    const transfers = minimizeTransfers(
      [
        { personId: 'big', net: 90000 },
        { personId: 'small', net: 10000 },
        { personId: 'x', net: -100000 },
      ],
      { preferPersonId: 'small' }
    );
    expect(transfers[0].toPersonId).toBe('small');
  });
});

// ── settle ───────────────────────────────────────────────────────────────────

describe('settle', () => {
  const people = [person('a'), person('b'), person('c')];

  it('balances a simple one-payer group', () => {
    const result = settle({
      group: group(['a', 'b', 'c']),
      periodId: null,
      people,
      expenses: [
        expense({
          amount: 90000,
          payer: 'a',
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    });
    expect(result.total).toBe(90000);
    expect(result.treasurerId).toBe('a');
    expect(result.checks.netSumZero).toBe(true);
    expect(result.checks.sharesSumOk).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
  });

  it('handles multiple payers on one expense', () => {
    const result = settle({
      group: group(['a', 'b', 'c']),
      periodId: null,
      people,
      expenses: [
        expense({
          amount: 90000,
          payers: [
            { personId: 'a', amount: 60000 },
            { personId: 'b', amount: 30000 },
          ],
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    });
    expect(result.checks.netSumZero).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
  });

  it('accounts for a payer who is excluded from the split', () => {
    const result = settle({
      group: group(['a', 'b', 'c']),
      periodId: null,
      people,
      expenses: [
        expense({
          amount: 60000,
          payer: 'a',
          shares: [{ personId: 'a', included: false }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    });
    const a = result.balances.find((b) => b.personId === 'a')!;
    expect(a.net).toBe(60000);
    expect(a.owed).toBe(0);
    expect(result.transfers.every((t) => t.toPersonId === 'a')).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
  });

  it('keeps invariants under rounding', () => {
    const result = settle({
      group: group(['a', 'b', 'c']),
      periodId: null,
      people,
      roundTo: 1000,
      expenses: [
        expense({
          id: 'e1',
          amount: 100000,
          payer: 'a',
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
        expense({
          id: 'e2',
          amount: 37777,
          payer: 'b',
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    });
    expect(result.checks.sharesSumOk).toBe(true);
    expect(result.checks.netSumZero).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
  });

  it('honours a manual treasurer override', () => {
    const result = settle({
      group: group(['a', 'b', 'c'], 'c'),
      periodId: null,
      people,
      expenses: [
        expense({
          amount: 90000,
          payer: 'a',
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    });
    expect(result.treasurerId).toBe('c');
  });

  it('survives an empty group', () => {
    const result = settle({
      group: group([]),
      periodId: null,
      people: [],
      expenses: [],
    });
    expect(result.total).toBe(0);
    expect(result.transfers).toEqual([]);
    expect(result.checks.netSumZero).toBe(true);
  });

  it('survives a single-person group', () => {
    const result = settle({
      group: group(['a']),
      periodId: null,
      people,
      expenses: [expense({ amount: 50000, payer: 'a', shares: [{ personId: 'a' }] })],
    });
    expect(result.transfers).toEqual([]);
    expect(result.checks.netSumZero).toBe(true);
  });

  it('is deterministic', () => {
    const input = {
      group: group(['a', 'b', 'c']),
      periodId: null,
      people,
      roundTo: 1000 as RoundTo,
      expenses: [
        expense({
          id: 'e1',
          amount: 100000,
          payer: 'a',
          shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
        }),
      ],
    };
    expect(settle(input)).toEqual(settle(input));
  });
});

// ── property test ────────────────────────────────────────────────────────────

/** Deterministic PRNG so a failure is reproducible from the seed. */
function makeRandom(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('settle — randomized invariants', () => {
  it('holds Σ shares === amount, Σ net === 0 and transfer reconciliation over 500 groups', () => {
    const rand = makeRandom(20260725);
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
    const roundOptions: RoundTo[] = [1, 100, 500, 1000];
    const kinds: SplitKind[] = ['equal', 'weight', 'exact'];

    for (let caseIndex = 0; caseIndex < 500; caseIndex++) {
      const n = 2 + Math.floor(rand() * 7); // 2..8 people
      const people = Array.from({ length: n }, (_, i) => person(`p${i}`));
      const memberIds = people.map((p) => p.id);
      const g = group(memberIds, rand() < 0.3 ? pick(memberIds) : null);

      const expenseCount = 1 + Math.floor(rand() * 20);
      const expenses: Expense[] = [];

      for (let k = 0; k < expenseCount; k++) {
        const amount = 1 + Math.floor(rand() * 5_000_000);
        const kind = pick(kinds);

        const shares = memberIds.map((id) => ({
          personId: id,
          included: rand() < 0.8,
          weight: pick([0, 1, 1, 1, 2, 3]),
          exactAmount: kind === 'exact' && rand() < 0.5 ? Math.floor(rand() * amount) : null,
        }));
        // Guarantee at least one included person, matching the store invariant.
        if (!shares.some((s) => s.included)) shares[0].included = true;

        // Payers: 1..3 people whose amounts sum exactly to the total.
        const payerCount = 1 + Math.floor(rand() * Math.min(3, n));
        const payerIds = memberIds.slice(0, payerCount);
        let left = amount;
        const payers = payerIds.map((id, i) => {
          const share = i === payerIds.length - 1 ? left : Math.floor(rand() * (left + 1));
          left -= share;
          return { personId: id, amount: share };
        });

        expenses.push({
          id: `e${k}`,
          groupId: g.id,
          periodId: null,
          title: `x${k}`,
          category: 'other',
          amount,
          date: '2026-01-01',
          payers,
          splitKind: kind,
          shares,
          note: '',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        });
      }

      const result = settle({
        group: g,
        periodId: null,
        expenses,
        people,
        roundTo: pick(roundOptions),
        strategy: rand() < 0.5 ? 'treasurer-first' : 'greedy',
      });

      expect(result.checks.sharesSumOk, `case ${caseIndex}: shares must sum to the amount`).toBe(
        true
      );
      expect(result.checks.netSumZero, `case ${caseIndex}: net balances must sum to zero`).toBe(
        true
      );
      expect(
        result.checks.transfersReconcile,
        `case ${caseIndex}: transfers must reconcile with net balances`
      ).toBe(true);
      expect(result.transfers.every((t) => t.amount > 0)).toBe(true);
    }
  });
});

// ── repayments ───────────────────────────────────────────────────────────────

describe('repayments', () => {
  const people = [person('a'), person('b'), person('c')];
  const members = ['a', 'b', 'c'];

  /** a fronts 90,000 for three people: b and c each owe a 30,000. */
  const oneExpense = () => [
    expense({
      amount: 90000,
      payer: 'a',
      shares: [{ personId: 'a' }, { personId: 'b' }, { personId: 'c' }],
    }),
  ];

  it('cancels a debt exactly when repaid in full', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 30000)],
    });

    const b = result.balances.find((x) => x.personId === 'b')!;
    expect(b.repaid).toBe(30000);
    expect(b.net).toBe(0);
    // Only c still owes anything.
    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toMatchObject({
      fromPersonId: 'c',
      toPersonId: 'a',
      amount: 30000,
    });
  });

  it('reduces a debt partially', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 10000)],
    });

    const b = result.balances.find((x) => x.personId === 'b')!;
    expect(b.net).toBe(-20000);
    const bToA = result.transfers.find((t) => t.fromPersonId === 'b');
    expect(bToA?.amount).toBe(20000);
  });

  it('credits the receiver, so the creditor is owed less', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 30000)],
    });

    const a = result.balances.find((x) => x.personId === 'a')!;
    expect(a.received).toBe(30000);
    expect(a.net).toBe(30000); // was 60,000 before the repayment
  });

  it('keeps Σ net === 0 and the transfers reconciling', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 30000), payment('c', 'a', 12345)],
    });
    expect(result.checks.netSumZero).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
    expect(sum(result.balances.map((b) => b.net))).toBe(0);
  });

  it('settles everyone when every debt is repaid', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 30000), payment('c', 'a', 30000)],
    });
    expect(result.transfers).toEqual([]);
    expect(result.balances.every((b) => b.net === 0)).toBe(true);
  });

  it('handles an overpayment by flipping the direction', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 50000)],
    });
    const b = result.balances.find((x) => x.personId === 'b')!;
    expect(b.net).toBe(20000); // overpaid by 20,000, so now a creditor
    expect(result.checks.netSumZero).toBe(true);
    expect(result.checks.transfersReconcile).toBe(true);
  });

  it('ignores zero and negative repayments', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 0), payment('c', 'a', -5000)],
    });
    expect(result.balances.find((x) => x.personId === 'b')!.net).toBe(-30000);
    expect(result.checks.netSumZero).toBe(true);
  });

  it('reports the repaid total', () => {
    const result = settle({
      group: group(members),
      periodId: null,
      people,
      expenses: oneExpense(),
      payments: [payment('b', 'a', 30000), payment('c', 'a', 5000)],
    });
    expect(result.repaidTotal).toBe(35000);
    // The expense total is untouched by repayments.
    expect(result.total).toBe(90000);
  });
});
