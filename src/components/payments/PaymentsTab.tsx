'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, HandCoins, Plus, Trash2 } from 'lucide-react';
import { useT } from '@/hooks/useT';
import { flowArrow, formatDateShort } from '@/lib/format';
import { paymentsOf, useDongStore } from '@/store/dongStore';
import { todayIso } from '@/lib/utils';
import type { Group, Payment, PaymentKind } from '@/types/dong';
import { ActionButton } from '@/components/ui/ActionButton';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { IconButton } from '@/components/ui/IconButton';
import { DateField } from '@/components/ui/DateField';
import { EmptyState } from '@/components/ui/EmptyState';
import { Money } from '@/components/ui/Money';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { PersonName } from '@/components/ui/PersonName';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
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
  // Kept apart on purpose: only transfers move a balance, so adding income into
  // the same figure would suggest the settlement had shrunk by that much.
  const transferTotal = payments
    .filter((p) => p.kind !== 'income')
    .reduce((a, p) => a + p.amount, 0);
  const incomeTotal = payments.filter((p) => p.kind === 'income').reduce((a, p) => a + p.amount, 0);

  return (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <EmptyState
          icon={<HandCoins className="size-12" />}
          title={t.payment.emptyTitle}
          description={t.payment.emptyDesc}
        />
      ) : (
        <>
          <div className="space-y-2">
            {transferTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
                <span className="text-sm text-muted">{t.payment.total}</span>
                <Money
                  value={transferTotal}
                  currency
                  className="text-base font-bold text-positive"
                />
              </div>
            )}
            {incomeTotal > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3">
                <span className="text-sm text-muted">{t.payment.incomeTotal}</span>
                <Money value={incomeTotal} currency className="text-base font-bold text-positive" />
              </div>
            )}
          </div>

          <ul className="space-y-2">
            {payments.map((payment, i) => {
              const income = payment.kind === 'income';
              const from = personOf(payment.fromPersonId);
              const to = personOf(payment.toPersonId);
              return (
                <li
                  key={payment.id}
                  className="anim-rise rounded-lg border border-border bg-surface p-3"
                  style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
                >
                  <div className="flex items-center gap-2">
                    {income
                      ? to && (
                          <PersonAvatar
                            personId={to.id}
                            name={to.name}
                            color={to.color}
                            size="sm"
                          />
                        )
                      : from && (
                          <PersonAvatar
                            personId={from.id}
                            name={from.name}
                            color={from.color}
                            size="sm"
                          />
                        )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {income ? (
                        <>
                          <span className="me-1.5 rounded bg-surface-2 px-1.5 py-0.5 text-xs text-muted">
                            {t.payment.incomeBadge}
                          </span>
                          {to && <PersonName personId={to.id} name={to.name} />}
                        </>
                      ) : (
                        <>
                          {from && <PersonName personId={from.id} name={from.name} />}
                          <span className="mx-1.5 text-primary">{flowArrow(dir)}</span>
                          {to && <PersonName personId={to.id} name={to.name} />}
                        </>
                      )}
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
        <div className="flex justify-center">
          <Button
            size="lg"
            icon={<Plus className="size-5" aria-hidden="true" />}
            onClick={() => setFormOpen(true)}
          >
            {t.payment.add}
          </Button>
        </div>
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
  const { t, dir } = useT();
  const people = useDongStore((s) => s.people);
  const selfPersonId = useDongStore((s) => s.settings.selfPersonId);
  const addPayment = useDongStore((s) => s.addPayment);
  const pushToast = useDongStore((s) => s.pushToast);

  const members = group.memberIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  /**
   * One side is almost always the person holding the phone, so it is fixed to
   * them and only the counterparty is picked. `direction` swaps which side they
   * are on, which is the difference between paying someone back and being paid.
   */
  const self = members.find((p) => p.id === selfPersonId) ?? members[0] ?? null;
  const others = members.filter((p) => p.id !== self?.id);

  const [kind, setKind] = useState<PaymentKind>('transfer');
  const [direction, setDirection] = useState<'out' | 'in'>('out');
  const [otherId, setOtherId] = useState(() => others[0]?.id ?? '');
  // Income has no paying member — the money came from outside the group — so it
  // only needs the member whose pocket it landed in, which is usually the user.
  const [incomeToId, setIncomeToId] = useState(() => self?.id ?? '');
  const [amount, setAmount] = useState(0);
  // todayIso() is local; toISOString() is UTC and lands on the wrong day for
  // part of every evening in Tehran.
  const [date, setDate] = useState(() => todayIso());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = others.map((p) => ({ value: p.id, label: p.name }));

  const fromPersonId = direction === 'out' ? (self?.id ?? '') : otherId;
  const toPersonId = direction === 'out' ? otherId : (self?.id ?? '');

  const submit = () => {
    if (amount <= 0) {
      setError(t.payment.needAmount);
      return;
    }
    if (kind === 'income') {
      if (!incomeToId) return;
      addPayment({
        groupId: group.id,
        kind: 'income',
        fromPersonId: '',
        toPersonId: incomeToId,
        amount,
        date,
        note,
      });
      pushToast('success', t.toast.saved);
      onClose();
      return;
    }
    if (!fromPersonId || !toPersonId || fromPersonId === toPersonId) {
      setError(t.payment.samePerson);
      return;
    }
    addPayment({
      groupId: group.id,
      kind: 'transfer',
      fromPersonId,
      toPersonId,
      amount,
      date,
      note,
    });
    pushToast('success', t.toast.saved);
    onClose();
  };

  const fixedSide = (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">
        {direction === 'out' ? t.payment.from : t.payment.to}
      </span>
      <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface-2 px-3">
        {self && (
          <>
            <PersonAvatar personId={self.id} name={self.name} color={self.color} size="sm" />
            <span className="truncate text-sm font-medium">{self.name}</span>
          </>
        )}
      </div>
    </div>
  );

  const pickedSide = (
    <Select
      label={direction === 'out' ? t.payment.to : t.payment.from}
      value={otherId}
      options={options}
      onChange={(v) => {
        setOtherId(v);
        setError(null);
      }}
    />
  );

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
        <SegmentedControl
          label={t.payment.newTitle}
          value={kind}
          options={[
            { value: 'transfer' as const, label: t.payment.kindTransfer },
            { value: 'income' as const, label: t.payment.kindIncome },
          ]}
          onChange={(v) => {
            setKind(v);
            setError(null);
          }}
        />
        <p className="text-xs leading-relaxed text-muted">
          {kind === 'income' ? t.payment.kindIncomeHint : t.payment.kindTransferHint}
        </p>

        {kind === 'income' ? (
          <Select
            label={t.payment.incomeFor}
            value={incomeToId}
            options={members.map((p) => ({ value: p.id, label: p.name }))}
            onChange={setIncomeToId}
          />
        ) : (
          <>
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">{direction === 'out' ? fixedSide : pickedSide}</div>

              <IconButton
                label={t.payment.swap}
                className="mb-0.5 shrink-0"
                onClick={() => setDirection((d) => (d === 'out' ? 'in' : 'out'))}
              >
                <ArrowLeftRight className="size-4" aria-hidden="true" />
              </IconButton>

              <div className="min-w-0 flex-1">{direction === 'out' ? pickedSide : fixedSide}</div>
            </div>

            <p className="text-center text-xs text-muted">
              {direction === 'out' ? t.payment.directionOut : t.payment.directionIn}
              <span className="mx-1 text-primary">{flowArrow(dir)}</span>
            </p>
          </>
        )}

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
