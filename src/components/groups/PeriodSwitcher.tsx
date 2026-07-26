'use client';

import { useState } from 'react';
import { ChartPie, ChevronLeft, ChevronRight, Lock, LockOpen, Plus } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { formatJalaliMonth } from '@/lib/format';
import { nextMonth } from '@/lib/jalali';
import { useDongStore } from '@/store/dongStore';
import type { Expense, Group, Period } from '@/types/dong';
import { ActionButton } from '@/components/ui/ActionButton';
import { IconButton } from '@/components/ui/IconButton';
import { MonthOverviewSheet } from './MonthOverviewSheet';

export function PeriodSwitcher({
  group,
  period,
  periods,
  expenses,
}: {
  group: Group;
  period: Period | null;
  periods: Period[];
  /** the current period's expenses, for the overview breakdown */
  expenses: Expense[];
}) {
  const { t, locale, isRtl } = useT();
  const setActivePeriod = useDongStore((s) => s.setActivePeriod);
  const closePeriod = useDongStore((s) => s.closePeriod);
  const addPeriod = useDongStore((s) => s.addPeriod);
  const [overviewOpen, setOverviewOpen] = useState(false);

  if (!period) return null;

  const index = periods.findIndex((p) => p.id === period.id);
  const older = periods[index - 1] ?? null;
  const newer = periods[index + 1] ?? null;

  // In RTL the "previous" arrow visually points right.
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-border bg-surface p-1">
        <div className="flex items-center gap-1">
          <IconButton
            label={`${t.group.period} — ${t.common.back}`}
            disabled={!older}
            onClick={() => older && setActivePeriod(group.id, older.id)}
          >
            <PrevIcon className="size-5" aria-hidden="true" />
          </IconButton>

          <span className="flex-1 text-center text-sm font-semibold">
            {formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)}
            {period.closed && (
              <Lock className="ms-1.5 inline size-3.5 text-muted" aria-hidden="true" />
            )}
          </span>

          <IconButton
            label={`${t.group.period} — ${t.common.more}`}
            disabled={!newer}
            onClick={() => newer && setActivePeriod(group.id, newer.id)}
          >
            <NextIcon className="size-5" aria-hidden="true" />
          </IconButton>
        </div>

        {/* The month arrows are self-explanatory next to the month name, but
            these two change state, so they carry text. */}
        {/* Wraps because the English labels are longer than the Persian ones
            and three buttons only just fit a 375px screen. */}
        <div className="flex flex-wrap items-center gap-1 border-t border-border pt-1">
          <ActionButton
            icon={
              period.closed ? (
                <LockOpen className="size-4" aria-hidden="true" />
              ) : (
                <Lock className="size-4" aria-hidden="true" />
              )
            }
            onClick={() => closePeriod(period.id, !period.closed)}
          >
            {period.closed ? t.group.reopenPeriod : t.group.closePeriod}
          </ActionButton>

          {!newer && (
            <ActionButton
              icon={<Plus className="size-4" aria-hidden="true" />}
              tone="primary"
              onClick={() => {
                const n = nextMonth({ jy: period.jYear, jm: period.jMonth });
                addPeriod(group.id, n.jy, n.jm);
              }}
            >
              {t.group.newPeriod}
            </ActionButton>
          )}

          {/* Pushed to the far end of the row, opposite the month controls. */}
          <ActionButton
            className="ms-auto"
            icon={<ChartPie className="size-4" aria-hidden="true" />}
            onClick={() => setOverviewOpen(true)}
          >
            {t.overview.open}
          </ActionButton>
        </div>
      </div>

      {overviewOpen && (
        <MonthOverviewSheet
          period={period}
          expenses={expenses}
          onClose={() => setOverviewOpen(false)}
        />
      )}

      {period.closed && (
        <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">
          {t.group.periodClosed}
        </p>
      )}
    </div>
  );
}
