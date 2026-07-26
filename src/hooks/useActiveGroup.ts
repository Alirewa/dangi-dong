'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDongStore, periodsOf } from '@/store/dongStore';
import type { Group, Period } from '@/types/dong';

/**
 * Resolves the active group, redirecting home only AFTER hydration.
 *
 * With `skipHydration: true` the first client frame always has `groups: []`,
 * so a naive `if (!group) router.replace('/')` bounces the user home on every
 * cold load. The `hydrated` guard is what makes deep navigation survive a
 * refresh.
 */
export function useActiveGroup(): { group: Group | null; hydrated: boolean } {
  const hydrated = useDongStore((s) => s.hydrated);
  const activeGroupId = useDongStore((s) => s.activeGroupId);
  const groups = useDongStore((s) => s.groups);
  const router = useRouter();

  const group = useMemo(
    () => groups.find((g) => g.id === activeGroupId) ?? null,
    [groups, activeGroupId]
  );

  useEffect(() => {
    if (hydrated && !group) router.replace('/');
  }, [hydrated, group, router]);

  return { group, hydrated };
}

export function useActivePeriod(group: Group | null): {
  period: Period | null;
  periods: Period[];
} {
  const allPeriods = useDongStore((s) => s.periods);

  const periods = useMemo(
    () => (group && group.mode === 'monthly' ? periodsOf(allPeriods, group.id) : []),
    [allPeriods, group]
  );

  const period = useMemo(
    () =>
      periods.find((p) => p.id === group?.activePeriodId) ?? periods[periods.length - 1] ?? null,
    [periods, group?.activePeriodId]
  );

  return { period, periods };
}
