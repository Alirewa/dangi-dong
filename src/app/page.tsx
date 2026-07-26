'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ArchiveRestore, Plus, Trash2, Wallet } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { InstallPrompt } from '@/components/layout/InstallPrompt';
import { GroupFormSheet } from '@/components/groups/GroupFormSheet';
import { GroupIcon } from '@/components/groups/groupIcons';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionButton } from '@/components/ui/ActionButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Count, Money } from '@/components/ui/Money';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useT } from '@/hooks/useT';
import { formatJalaliMonth } from '@/lib/format';
import { useDongStore } from '@/store/dongStore';
import type { Group } from '@/types/dong';

export default function HomePage() {
  const { t } = useT();

  return (
    <AppShell title={t.home.title} wide>
      <HydrationGate>
        <GroupsScreen />
      </HydrationGate>
    </AppShell>
  );
}

function GroupsScreen() {
  const { t, locale } = useT();
  const router = useRouter();

  const groups = useDongStore((s) => s.groups);
  const expenses = useDongStore((s) => s.expenses);
  const periods = useDongStore((s) => s.periods);
  const setActiveGroup = useDongStore((s) => s.setActiveGroup);
  const removeGroup = useDongStore((s) => s.removeGroup);
  const archiveGroup = useDongStore((s) => s.archiveGroup);
  const pushToast = useDongStore((s) => s.pushToast);

  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [pendingDelete, setPendingDelete] = useState<Group | null>(null);

  const archivedCount = useMemo(() => groups.filter((g) => g.archived).length, [groups]);

  // Unarchiving the last archived group hides the tabs, so fall back to Active
  // rather than leaving the user staring at an empty Archived list.
  const effectiveTab = archivedCount === 0 ? 'active' : tab;

  // Archived groups used to vanish with no way back; they now live behind a tab.
  const visible = useMemo(
    () => groups.filter((g) => (effectiveTab === 'archived' ? g.archived : !g.archived)),
    [groups, effectiveTab]
  );

  const statsOf = useMemo(() => {
    const map = new Map<string, { count: number; total: number; label: string }>();
    for (const g of groups) {
      const scoped = expenses.filter((e) => e.groupId === g.id);
      const period = periods.find((p) => p.id === g.activePeriodId);
      map.set(g.id, {
        count: scoped.length,
        total: scoped.reduce((a, e) => a + e.amount, 0),
        label:
          g.mode === 'monthly' && period
            ? formatJalaliMonth({ jy: period.jYear, jm: period.jMonth }, locale)
            : '',
      });
    }
    return map;
  }, [groups, expenses, periods, locale]);

  const open = (group: Group) => {
    setActiveGroup(group.id);
    router.push('/group/');
  };

  return (
    <div className="space-y-4 p-4">
      <InstallPrompt />

      {/* Only worth showing once something has actually been archived. */}
      {archivedCount > 0 && (
        <SegmentedControl
          value={effectiveTab}
          options={[
            { value: 'active' as const, label: t.home.tabActive },
            { value: 'archived' as const, label: t.home.tabArchived },
          ]}
          onChange={setTab}
          label={t.home.title}
        />
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Wallet className="size-12" />}
          title={t.home.emptyTitle}
          description={t.home.emptyDesc}
          action={
            <Button
              size="lg"
              icon={<Plus className="size-5" aria-hidden="true" />}
              onClick={() => setFormOpen(true)}
            >
              {t.home.firstGroup}
            </Button>
          }
        />
      ) : (
        <>
          {/* Same shape as the people list: one card per row on a phone, a
              grid once there is room. */}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((group, i) => {
              const stats = statsOf.get(group.id);
              return (
                <li
                  key={group.id}
                  className="anim-rise"
                  // Capped so a long list never leaves the last rows visibly late.
                  style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
                >
                  <div className="flex h-full flex-col rounded-lg border border-border bg-surface transition-colors hover:bg-surface-2">
                    <button
                      type="button"
                      onClick={() => open(group)}
                      className="flex w-full flex-1 items-center gap-3 p-4 text-start"
                    >
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                        <GroupIcon icon={group.icon} className="size-6" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{group.name}</span>
                          {group.archived && (
                            <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                              {t.home.archived}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {group.mode === 'monthly' ? t.home.monthly : t.home.event}
                          {stats?.label ? ` • ${stats.label}` : ''}
                          {' • '}
                          <Count value={group.memberIds.length} /> {t.home.membersCount}
                        </span>
                      </span>
                      <span className="shrink-0 text-end">
                        {stats && stats.count > 0 ? (
                          <>
                            <Money value={stats.total} className="block text-sm font-semibold" />
                            <span className="text-xs text-muted">
                              <Count value={stats.count} /> {t.home.expensesCount}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-muted">{t.home.noExpensesYet}</span>
                        )}
                      </span>
                    </button>

                    <div className="flex flex-wrap justify-end gap-1 border-t border-border px-2 py-1">
                      <ActionButton
                        icon={
                          group.archived ? (
                            <ArchiveRestore className="size-4" aria-hidden="true" />
                          ) : (
                            <Archive className="size-4" aria-hidden="true" />
                          )
                        }
                        onClick={() => archiveGroup(group.id, !group.archived)}
                      >
                        {group.archived ? t.home.unarchive : t.home.archive}
                      </ActionButton>
                      <ActionButton
                        icon={<Trash2 className="size-4" aria-hidden="true" />}
                        tone="danger"
                        onClick={() => setPendingDelete(group)}
                      >
                        {t.common.delete}
                      </ActionButton>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {effectiveTab === 'active' && (
            <Button
              fullWidth
              size="lg"
              icon={<Plus className="size-5" aria-hidden="true" />}
              onClick={() => setFormOpen(true)}
            >
              {t.home.newGroup}
            </Button>
          )}
        </>
      )}

      <GroupFormSheet open={formOpen} onClose={() => setFormOpen(false)} />

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.home.deleteGroupTitle}
        description={t.home.deleteGroupDesc}
        confirmLabel={t.common.delete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removeGroup(pendingDelete.id);
          setPendingDelete(null);
          pushToast('success', t.toast.deleted);
        }}
      />
    </div>
  );
}
