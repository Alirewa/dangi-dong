'use client';

import { useRouter } from 'next/navigation';
import { Receipt } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { formatDateShort } from '@/lib/format';
import { useDongStore } from '@/store/dongStore';
import type { Expense, Person } from '@/types/dong';
import { Count, Money } from '@/components/ui/Money';
import { EmptyState } from '@/components/ui/EmptyState';
import { CATEGORY_ICONS } from './categoryMeta';

export function ExpenseList({
  expenses,
  people,
  readOnly,
}: {
  expenses: Expense[];
  people: Person[];
  readOnly: boolean;
}) {
  const { t, locale } = useT();
  const router = useRouter();
  const startEditExpense = useDongStore((s) => s.startEditExpense);

  if (expenses.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="size-12" />}
        title={t.group.noExpensesTitle}
        description={t.group.noExpensesDesc}
      />
    );
  }

  const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? '—';

  // Newest first; ties broken by creation order so the list never jitters.
  const sorted = [...expenses].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
  );

  return (
    <ul className="space-y-2">
      {sorted.map((expense) => {
        const Icon = CATEGORY_ICONS[expense.category];
        const includedCount = expense.shares.filter((s) => s.included).length;
        const payerNames = expense.payers.map((p) => nameOf(p.personId)).join('، ');

        return (
          <li key={expense.id}>
            <button
              type="button"
              onClick={() => {
                if (readOnly) return;
                startEditExpense(expense.id);
                router.push('/group/expense/');
              }}
              disabled={readOnly}
              className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-start transition-colors hover:bg-surface-2 disabled:opacity-70"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted">
                <Icon className="size-5" aria-hidden="true" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{expense.title}</span>
                <span className="mt-0.5 block truncate text-xs text-muted">
                  {formatDateShort(expense.date, locale)} • {payerNames} •{' '}
                  <Count value={includedCount} /> {t.common.person}
                </span>
              </span>

              <Money value={expense.amount} className="shrink-0 text-sm font-semibold" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
