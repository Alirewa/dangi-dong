'use client';

import { useT } from '@/hooks/useT';
import { cn } from '@/lib/utils';
import type { ExpensePayer, Person } from '@/types/dong';
import { AmountInput } from '@/components/ui/AmountInput';
import { PersonAvatar } from '@/components/ui/PersonAvatar';
import { Money } from '@/components/ui/Money';

export function PayerPicker({
  payers,
  people,
  memberIds,
  amount,
  multi,
  disabled,
  onSingle,
  onMulti,
  onToggleMulti,
}: {
  payers: ExpensePayer[];
  people: Person[];
  memberIds: string[];
  amount: number;
  multi: boolean;
  disabled?: boolean;
  onSingle: (personId: string) => void;
  onMulti: (payers: ExpensePayer[]) => void;
  onToggleMulti: (multi: boolean) => void;
}) {
  const { t } = useT();
  const members = memberIds
    .map((id) => people.find((p) => p.id === id))
    .filter((p): p is Person => Boolean(p));

  const singlePayerId = payers[0]?.personId ?? '';
  const typedTotal = payers.reduce((a, p) => a + p.amount, 0);
  const mismatch = multi && typedTotal !== amount;

  const amountFor = (personId: string) => payers.find((p) => p.personId === personId)?.amount ?? 0;

  const setAmountFor = (personId: string, value: number) => {
    const others = payers.filter((p) => p.personId !== personId);
    const next = value > 0 ? [...others, { personId, amount: value }] : others;
    // Preserve member order so rows never jump while typing.
    next.sort((a, b) => memberIds.indexOf(a.personId) - memberIds.indexOf(b.personId));
    onMulti(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t.expense.payer}</span>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input
            type="checkbox"
            checked={multi}
            disabled={disabled}
            onChange={(e) => onToggleMulti(e.target.checked)}
            className="size-4 accent-[var(--primary)]"
          />
          {t.expense.multiPayer}
        </label>
      </div>

      {!multi ? (
        <div className="flex flex-wrap gap-2">
          {members.map((person) => (
            <button
              key={person.id}
              type="button"
              disabled={disabled}
              aria-pressed={singlePayerId === person.id}
              onClick={() => onSingle(person.id)}
              className={cn(
                'inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                singlePayerId === person.id
                  ? 'border-primary bg-primary-soft font-semibold text-primary'
                  : 'border-border bg-surface hover:bg-surface-2'
              )}
            >
              <PersonAvatar
                personId={person.id}
                name={person.name}
                color={person.color}
                size="sm"
              />
              {person.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {members.map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                <PersonAvatar
                  personId={person.id}
                  name={person.name}
                  color={person.color}
                  size="sm"
                />
                <span className="w-20 shrink-0 truncate text-sm">{person.name}</span>
                <div className="flex-1">
                  <AmountInput
                    value={amountFor(person.id)}
                    disabled={disabled}
                    showCurrency={false}
                    onChange={(v) => setAmountFor(person.id, v)}
                  />
                </div>
              </li>
            ))}
          </ul>

          <p className={cn('text-xs', mismatch ? 'text-negative' : 'text-muted')}>
            {mismatch ? t.expense.payersMismatch : t.expense.multiPayerHint}
            {' — '}
            <Money value={typedTotal} /> / <Money value={amount} currency />
          </p>
        </>
      )}
    </div>
  );
}
