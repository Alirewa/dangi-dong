'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calculator, CreditCard, Pencil, Plus, UserMinus, UserPlus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { GroupFormSheet } from '@/components/groups/GroupFormSheet';
import { PeriodSwitcher } from '@/components/groups/PeriodSwitcher';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { Avatar } from '@/components/ui/Avatar';
import { ActionButton } from '@/components/ui/ActionButton';
import { Button } from '@/components/ui/Button';
import { Count, Money } from '@/components/ui/Money';
import { PersonName } from '@/components/ui/PersonName';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { inputClass } from '@/components/ui/TextInput';
import { useActiveGroup, useActivePeriod } from '@/hooks/useActiveGroup';
import { useSettlement } from '@/hooks/useSettlement';
import { useT } from '@/hooks/useT';
import { expensesOf, useDongStore } from '@/store/dongStore';
import { cn } from '@/lib/utils';

type Tab = 'expenses' | 'members' | 'summary';

export default function GroupPage() {
  return (
    <HydrationGate>
      <GroupScreen />
    </HydrationGate>
  );
}

function GroupScreen() {
  const { t } = useT();
  const router = useRouter();
  const { group } = useActiveGroup();
  const { period, periods } = useActivePeriod(group);

  const allExpenses = useDongStore((s) => s.expenses);
  const people = useDongStore((s) => s.people);
  const startEditExpense = useDongStore((s) => s.startEditExpense);

  const [tab, setTab] = useState<Tab>('expenses');
  const [editOpen, setEditOpen] = useState(false);

  const expenses = useMemo(
    () =>
      group
        ? expensesOf(allExpenses, group.id, group.mode === 'monthly' ? (period?.id ?? null) : null)
        : [],
    [allExpenses, group, period?.id]
  );

  const settlement = useSettlement(group, period?.id ?? null);

  if (!group) return null;

  const readOnly = group.mode === 'monthly' && Boolean(period?.closed);
  const total = expenses.reduce((a, e) => a + e.amount, 0);

  const tabs: { value: Tab; label: string }[] = [
    { value: 'expenses', label: t.group.tabExpenses },
    { value: 'members', label: t.group.tabMembers },
    { value: 'summary', label: t.group.tabSummary },
  ];

  return (
    <AppShell
      title={group.name}
      back
      actions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          icon={<Pencil className="size-4" aria-hidden="true" />}
        >
          {t.common.edit}
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        {group.mode === 'monthly' && (
          <PeriodSwitcher group={group} period={period} periods={periods} />
        )}

        <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
          <span className="text-sm text-muted">{t.group.total}</span>
          <Money value={total} currency className="text-lg font-bold" />
        </div>

        <SegmentedControl value={tab} options={tabs} onChange={setTab} />

        {tab === 'expenses' && (
          <>
            <ExpenseList expenses={expenses} people={people} readOnly={readOnly} />
            {!readOnly && (
              <Button
                fullWidth
                size="lg"
                icon={<Plus className="size-5" aria-hidden="true" />}
                onClick={() => {
                  startEditExpense(null);
                  router.push('/group/expense/');
                }}
              >
                {t.group.addExpense}
              </Button>
            )}
          </>
        )}

        {tab === 'members' && <MembersTab groupId={group.id} />}

        {tab === 'summary' && settlement && (
          <ul className="space-y-2">
            {settlement.balances.map((balance) => (
              <li
                key={balance.personId}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3"
              >
                <Avatar name={balance.name} color={balance.color} size="sm" />
                <span className="min-w-0 flex-1">
                  <PersonName
                    personId={balance.personId}
                    name={balance.name}
                    className="block text-sm font-medium"
                  />
                  <span className="block text-xs text-muted">
                    <Count value={balance.expenseCount} /> {t.settle.itemsIncluded}
                  </span>
                </span>
                <Money value={balance.owed} className="text-sm font-semibold" />
              </li>
            ))}
          </ul>
        )}

        {expenses.length > 0 && (
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            icon={<Calculator className="size-5" aria-hidden="true" />}
            onClick={() => router.push('/settle/')}
          >
            {t.group.settle}
          </Button>
        )}
      </div>

      <GroupFormSheet open={editOpen} onClose={() => setEditOpen(false)} editing={group} />
    </AppShell>
  );
}

function MembersTab({ groupId }: { groupId: string }) {
  const { t } = useT();
  const router = useRouter();

  const groups = useDongStore((s) => s.groups);
  const people = useDongStore((s) => s.people);
  const addMember = useDongStore((s) => s.addMember);
  const addAdHocMember = useDongStore((s) => s.addAdHocMember);
  const removeMember = useDongStore((s) => s.removeMember);
  const setTreasurer = useDongStore((s) => s.setTreasurer);
  const promotePerson = useDongStore((s) => s.promotePerson);
  const pushToast = useDongStore((s) => s.pushToast);

  const [addOpen, setAddOpen] = useState(false);
  const [adHocName, setAdHocName] = useState('');

  const group = groups.find((g) => g.id === groupId);
  if (!group) return null;

  const members = group.memberIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const candidates = people.filter(
    (p) => p.scope === 'global' && !group.memberIds.includes(p.id)
  );

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {members.map((person) => {
          const isTreasurer = group.treasurerId === person.id;
          const hasCard = Boolean(person.payout?.cardNumber || person.payout?.iban);
          return (
            <li
              key={person.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3"
            >
              <Avatar name={person.name} color={person.color} size="md" />

              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <PersonName
                    personId={person.id}
                    name={person.name}
                    className="text-sm font-medium"
                  />
                  {person.scope === 'group' && (
                    <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                      {t.people.adHocBadge}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {hasCard ? t.people.payoutTitle : t.group.payoutMissing}
                </span>
              </span>

              <button
                type="button"
                aria-pressed={isTreasurer}
                onClick={() => setTreasurer(groupId, isTreasurer ? null : person.id)}
                className={cn(
                  'min-h-9 shrink-0 rounded-md px-2 text-xs font-medium transition-colors',
                  isTreasurer
                    ? 'bg-primary text-primary-fg'
                    : 'bg-surface-2 text-muted hover:text-foreground'
                )}
              >
                {t.group.treasurer}
              </button>

              <div className="flex w-full flex-wrap justify-end gap-1 sm:w-auto">
                {person.scope === 'group' && (
                  <ActionButton
                    icon={<UserPlus className="size-4" aria-hidden="true" />}
                    onClick={() => {
                      promotePerson(person.id);
                      pushToast('success', t.people.promoted);
                    }}
                  >
                    {t.people.promote}
                  </ActionButton>
                )}

                <ActionButton
                  icon={<CreditCard className="size-4" aria-hidden="true" />}
                  onClick={() => router.push('/people/')}
                >
                  {t.group.editPayout}
                </ActionButton>

                <ActionButton
                  icon={<UserMinus className="size-4" aria-hidden="true" />}
                  tone="danger"
                  onClick={() => {
                    if (!removeMember(groupId, person.id)) pushToast('error', t.group.memberInUse);
                  }}
                >
                  {t.group.removeMember}
                </ActionButton>
              </div>
            </li>
          );
        })}
      </ul>

      <Button
        variant="outline"
        fullWidth
        icon={<UserPlus className="size-4" aria-hidden="true" />}
        onClick={() => setAddOpen(true)}
      >
        {t.group.addMember}
      </Button>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title={t.group.addMember}>
        <div className="space-y-4">
          {candidates.length > 0 && (
            <ul className="space-y-1">
              {candidates.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => {
                      addMember(groupId, person.id);
                      setAddOpen(false);
                    }}
                    className="flex w-full min-h-11 items-center gap-3 rounded-lg px-2 text-start hover:bg-surface-2"
                  >
                    <Avatar name={person.name} color={person.color} size="sm" />
                    <span className="flex-1 truncate text-sm">{person.name}</span>
                    <Plus className="size-4 text-muted" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2">
            <span className="block text-sm font-medium">{t.groupForm.addAdHoc}</span>
            <div className="flex gap-2">
              <input
                value={adHocName}
                onChange={(e) => setAdHocName(e.target.value)}
                placeholder={t.groupForm.adHocName}
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && adHocName.trim()) {
                    addAdHocMember(groupId, adHocName.trim());
                    setAdHocName('');
                    setAddOpen(false);
                  }
                }}
              />
              <Button
                onClick={() => {
                  if (!adHocName.trim()) return;
                  addAdHocMember(groupId, adHocName.trim());
                  setAdHocName('');
                  setAddOpen(false);
                }}
              >
                {t.common.add}
              </Button>
            </div>
            <p className="text-xs text-muted">{t.groupForm.adHocHint}</p>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
