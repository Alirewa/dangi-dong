'use client';

import { useState } from 'react';
import { Archive, ArchiveRestore, CreditCard, Pencil, Trash2, UserPlus, Users } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { PayoutForm } from '@/components/people/PayoutForm';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionButton } from '@/components/ui/ActionButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Sheet } from '@/components/ui/Sheet';
import { TextInput } from '@/components/ui/TextInput';
import { useT } from '@/hooks/useT';
import { formatCardNumber } from '@/lib/bank';
import { useDongStore } from '@/store/dongStore';
import { defaultPayoutInfo, type PayoutInfo, type Person } from '@/types/dong';

export default function PeoplePage() {
  const { t } = useT();
  return (
    <AppShell title={t.people.title}>
      <HydrationGate>
        <PeopleScreen />
      </HydrationGate>
    </AppShell>
  );
}

function PeopleScreen() {
  const { t } = useT();
  const people = useDongStore((s) => s.people);
  const removePerson = useDongStore((s) => s.removePerson);
  const archivePerson = useDongStore((s) => s.archivePerson);
  const pushToast = useDongStore((s) => s.pushToast);

  const [editing, setEditing] = useState<Person | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Person | null>(null);

  const globals = people.filter((p) => p.scope === 'global');

  return (
    <div className="space-y-4 p-4">
      {globals.length === 0 ? (
        <EmptyState
          icon={<Users className="size-12" />}
          title={t.people.emptyTitle}
          description={t.people.emptyDesc}
          action={
            <Button
              size="lg"
              icon={<UserPlus className="size-5" aria-hidden="true" />}
              onClick={() => setCreating(true)}
            >
              {t.people.addPerson}
            </Button>
          }
        />
      ) : (
        <>
          <ul className="space-y-2">
            {globals.map((person) => {
              const card = person.payout?.cardNumber;
              return (
                <li
                  key={person.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface p-3"
                >
                  <Avatar name={person.name} color={person.color} size="md" />

                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{person.name}</span>
                      {person.archived && (
                        <span className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 text-[11px] text-muted">
                          {t.home.archived}
                        </span>
                      )}
                    </span>
                    <span className="num mt-0.5 block truncate text-xs text-muted">
                      {card ? formatCardNumber(card) : t.group.payoutMissing}
                    </span>
                  </span>

                  <div className="flex shrink-0 flex-wrap justify-end gap-1">
                    <ActionButton
                      icon={<Pencil className="size-4" aria-hidden="true" />}
                      onClick={() => setEditing(person)}
                    >
                      {t.common.edit}
                    </ActionButton>
                    <ActionButton
                      icon={
                        person.archived ? (
                          <ArchiveRestore className="size-4" aria-hidden="true" />
                        ) : (
                          <Archive className="size-4" aria-hidden="true" />
                        )
                      }
                      onClick={() => archivePerson(person.id, !person.archived)}
                    >
                      {person.archived ? t.people.unarchive : t.people.archive}
                    </ActionButton>
                    <ActionButton
                      icon={<Trash2 className="size-4" aria-hidden="true" />}
                      tone="danger"
                      onClick={() => setPendingDelete(person)}
                    >
                      {t.common.delete}
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>

          <Button
            fullWidth
            size="lg"
            icon={<UserPlus className="size-5" aria-hidden="true" />}
            onClick={() => setCreating(true)}
          >
            {t.people.addPerson}
          </Button>
        </>
      )}

      {/* Remounting on the target id is the state reset — see ExpenseForm. */}
      {(creating || editing !== null) && (
        <PersonSheet
          key={editing?.id ?? 'new'}
          person={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.people.deleteTitle}
        description={t.people.deleteDesc}
        confirmLabel={t.common.delete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removePerson(pendingDelete.id);
          setPendingDelete(null);
          pushToast('success', t.toast.deleted);
        }}
      />
    </div>
  );
}

function PersonSheet({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const { t } = useT();
  const addPerson = useDongStore((s) => s.addPerson);
  const updatePerson = useDongStore((s) => s.updatePerson);
  const updatePayout = useDongStore((s) => s.updatePayout);
  const pushToast = useDongStore((s) => s.pushToast);

  const [name, setName] = useState(() => person?.name ?? '');
  const [note, setNote] = useState(() => person?.note ?? '');
  const [payout, setPayout] = useState<PayoutInfo>(() => person?.payout ?? { ...defaultPayoutInfo });
  const [showPayout, setShowPayout] = useState(() => Boolean(person?.payout?.cardNumber));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (!name.trim()) {
      setError(t.people.needName);
      return;
    }
    if (person) {
      updatePerson(person.id, { name: name.trim(), note });
      updatePayout(person.id, payout);
    } else {
      const created = addPerson({ name: name.trim() });
      updatePerson(created.id, { note });
      updatePayout(created.id, payout);
    }
    pushToast('success', t.toast.saved);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={person ? t.people.editTitle : t.people.newTitle}
      footer={
        <Button fullWidth onClick={submit}>
          {t.common.save}
        </Button>
      }
    >
      <div className="space-y-4">
        <TextInput
          label={t.people.name}
          placeholder={t.people.namePlaceholder}
          value={name}
          error={error}
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />

        <TextInput
          label={`${t.people.note} (${t.common.optional})`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {showPayout ? (
          <div className="border-t border-border pt-4">
            <h3 className="mb-3 text-sm font-semibold">{t.people.payoutTitle}</h3>
            <PayoutForm
              value={payout}
              onChange={(data) => setPayout((prev) => ({ ...prev, ...data }))}
            />
          </div>
        ) : (
          <Button
            variant="outline"
            fullWidth
            icon={<CreditCard className="size-4" aria-hidden="true" />}
            onClick={() => setShowPayout(true)}
          >
            {t.group.editPayout}
          </Button>
        )}
      </div>
    </Sheet>
  );
}
