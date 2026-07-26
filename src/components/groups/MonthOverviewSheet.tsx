'use client';

import { useMemo } from 'react';
import { useT } from '@/hooks/useT';
import { formatJalaliMonth, formatNumber } from '@/lib/format';
import type { Expense, Period } from '@/types/dong';
import { CATEGORY_ICONS } from '@/components/expenses/categoryMeta';
import { Count, Money } from '@/components/ui/Money';
import { Sheet } from '@/components/ui/Sheet';

/**
 * Where the month's money went, by category.
 *
 * Percentages are of the month's own total, so they always add to 100 and the
 * bars are comparable within the sheet rather than across months.
 */
export function MonthOverviewSheet({
  period,
  expenses,
  onClose,
}: {
  period: Period;
  expenses: Expense[];
  onClose: () => void;
}) {
  const { t, locale } = useT();

  const { rows, total } = useMemo(() => {
    const byCategory = new Map<Expense['category'], { total: number; count: number }>();
    for (const e of expenses) {
      const entry = byCategory.get(e.category) ?? { total: 0, count: 0 };
      entry.total += Math.round(e.amount);
      entry.count += 1;
      byCategory.set(e.category, entry);
    }
    const sum = [...byCategory.values()].reduce((a, b) => a + b.total, 0);
    return {
      total: sum,
      rows: [...byCategory.entries()]
        .map(([category, v]) => ({ category, ...v }))
        .sort((a, b) => b.total - a.total),
    };
  }, [expenses]);

  return (
    <Sheet
      open
      onClose={onClose}
      title={`${t.overview.title} — ${formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)}`}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t.overview.empty}</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">{t.group.total}</span>
            <Money value={total} currency className="text-base font-bold" />
          </div>

          <ul className="space-y-3">
            {rows.map((row) => {
              const Icon = CATEGORY_ICONS[row.category];
              const percent = total > 0 ? Math.round((row.total / total) * 100) : 0;
              return (
                <li key={row.category} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {t.expense.categories[row.category]}
                      <span className="ms-1.5 text-xs font-normal text-muted">
                        <Count value={row.count} /> {t.home.expensesCount}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <Money value={row.total} className="block text-sm font-semibold" />
                      <span className="num text-xs text-muted">
                        {formatNumber(percent, locale)}٪
                      </span>
                    </span>
                  </div>

                  {/* A plain div rather than <progress>, which cannot be themed
                      consistently across browsers. */}
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-surface-2"
                    role="presentation"
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Sheet>
  );
}
