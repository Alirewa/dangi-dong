'use client';

import { useMemo } from 'react';
import { expensesOf, paymentsOf, useDongStore } from '@/store/dongStore';
import { settle } from '@/lib/settlement';
import type { SettlementResult } from '@/types/settlement';
import type { Group } from '@/types/dong';

/**
 * Memoized settlement for one group + period.
 *
 * Selectors return the raw arrays and the filtering happens in useMemo —
 * returning `s.expenses.filter(...)` from an inline selector would allocate a
 * new array on every store write and re-render on unrelated changes.
 */
export function useSettlement(
  group: Group | null,
  periodId: string | null
): SettlementResult | null {
  const expenses = useDongStore((s) => s.expenses);
  const payments = useDongStore((s) => s.payments);
  const people = useDongStore((s) => s.people);
  const roundTo = useDongStore((s) => s.settings.roundTo);
  const strategy = useDongStore((s) => s.settings.transferStrategy);

  return useMemo(() => {
    if (!group) return null;
    const scope = group.mode === 'monthly' ? periodId : null;
    return settle({
      group,
      periodId,
      expenses: expensesOf(expenses, group.id, scope),
      payments: paymentsOf(payments, group.id, scope),
      people,
      roundTo,
      strategy,
    });
  }, [group, periodId, expenses, payments, people, roundTo, strategy]);
}
