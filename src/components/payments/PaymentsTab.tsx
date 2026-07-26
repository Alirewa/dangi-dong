'use client';

import { useMemo, useState } from 'react';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { flowArrow, formatDateShort } from '@/lib/format';
import { paymentsOf, useDongStore } from '@/store/dongStore';
import { todayIso } from '@/lib/utils';
import type { Group, Payment } from '@/types/dong';
import { ActionButton } from '@/components/ui/ActionButton';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { PersonName } from '@/components/ui/PersonName';
import { Select } from '@/components/ui/Select';
import { Sheet } from '@/components/ui/Sheet';
import { TextInput } from '@/components/ui/TextInput';

/**
 * Repayments: money that has actually changed hands.
 *
 * The counterpart to the expenses tab. An expense says who fronted a cost; a
 * repayment says someone has since settled part of their share, which the
 * engine subtracts from their balance.
 */
export function PaymentsTab({ group, readOnly }: { group: Group; readOnly: boolean }) {
  const { t, locale, dir } = useT();

  const allPayments = useDongStore((s) => s.payments);
  const people = useDongStore((s) => s.people);
  const removePayment = useDongStore((s) => s.removePayment);
  const pushToast = useDongStore((s) => s.pushToast);

  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Payment | null>(null);

  const payments = useMemo(
    () =>
      paymentsOf(
        allPayments,
        group.id,
        group.mode === 'monthly' ? (group.activePeriodId ?? null) : null
      )
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)),
    [allPayments, group.id, group.mode, group.activePeriodId]
  );

  const personOf = (id: string) => people.find((p) => p.id === id) ?? null;
  const total = payments.reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">{t.payment.hint}</p>

      {payments.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="size-12" />}
          title={t.payment.emptyTitle}
          description={t.payment.emptyDesc}
        />
      ) : (
        <>
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
            <span className="text-sm text-muted">{t.payment.total}</span>
            <Money value={total} currency className="text-base font-bold text-positive" />
          </div>

          <ul className="space-y-2">
            {payments.map((payment, i) => {
              const from = personOf(payment.fromPersonId);
              const to = personOf(payment.toPersonId);
              return (
                <li
                  key={payment.id}
                  className="anim-rise rounded-lg border border-border bg-surface p-3"
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                >
                  <div className="flex items-center gap-2">
                    {from && (
                      <PersonAvatar
                        personId={from.id}
                        name={from.name}
                        color={from.color}
                        size="sm"
                      />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {from && <PersonName personId={from.id} name={from.name} />}
                      <span className="mx-1.5 text-primary">{flowArrow(dir)}</span>
                      {to && <PersonName personId={to.id} name={to.name} />}
                    </span>
                    <Money
                      value={payment.amount}
                      className="shrink-0 text-sm font-bold text-positive"
                    />
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-muted">
                      {formatDateShort(payment.date, locale)}
                      {payment.note ? ` • ${payment.note}` : ''}
                    </span>
                    {!readOnly && (
                      <ActionButton
                        icon={<Trash2 className="size-4" aria-hidden="true" />}
                        tone="danger"
                        onClick={() => setPendingDelete(payment)}
                      >
                        {t.common.delete}
                      </ActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {!readOnly && (
        <Button
          fullWidth
          size="lg"
          icon={<Plus className="size-5" aria-hidden="true" />}
          onClick={() => setFormOpen(true)}
        >
          {t.payment.add}
        </Button>
      )}

      {formOpen && <PaymentForm group={group} onClose={() => setFormOpen(false)} />}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={t.payment.deleteTitle}
        description={t.payment.deleteDesc}
        confirmLabel={t.common.delete}
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) removePayment(pendingDelete.id);
          setPendingDelete(null);
          pushToast('success', t.toast.deleted);
        }}
      />
    </div>
  );
}

function PaymentForm({ group, onClose }: { group: Group; onClose: () => void }) {
  const { t } = useT();
  const people = useDongStore((s) => s.people);
  const addPayment = useDongStore((s) => s.addPayment);
  const pushToast = useDongStore((s) => s.pushToast);

  const members = group.memberIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const options = members.map((p) => ({ value: p.id, label: p.name }));

  const [fromPersonId, setFrom] = useState(() => members[0]?.id ?? '');
  const [toPersonId, setTo] = useState(() => members[1]?.id ?? members[0]?.id ?? '');
  const [amount, setAmount] = useState(0);
  // todayIso() is local; toISOString() is UTC and lands on the wrong day for
  // part of every evening in Tehran.
  const [date, setDate] = useState(() => todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (amount <= 0) {
      setError(t.payment.needAmount);
      return;
    }
    if (fromPersonId === toPersonId) {
      setError(t.payment.samePerson);
      return;
    }
    addPayment({ groupId: group.id, fromPersonId, toPersonId, amount, date, note });
    pushToast('success', t.toast.saved);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={t.payment.newTitle}
      footer={
        <Button block size="lg" onClick={submit}>
          {t.common.save}
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t.payment.from}
            value={fromPersonId}
            options={options}
            onChange={(v) => {
              setFrom(v);
              setError(null);
            }}
          />
          <Select
            label={t.payment.to}
            value={toPersonId}
            options={options}
            onChange={(v) => {
              setTo(v);
              setError(null);
            }}
          />
        </div>

        <AmountInput
          label={t.payment.amount}
          value={amount}
          autoFocus
          error={error}
          onChange={(v) => {
            setAmount(v);
            setError(null);
          }}
        />

        <DateField label={t.payment.date} value={date} onChange={setDate} />

        <TextInput
          label={`${t.payment.note} (${t.common.optional})`}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
    </Sheet>
  );
}
