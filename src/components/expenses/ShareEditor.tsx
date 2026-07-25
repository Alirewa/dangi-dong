'use client';

import { useT } from '@/hooks/useT';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ExpenseShare, Person, SplitKind } from '@/types/dong';
import { AmountInput } from '@/components/ui/AmountInput';
import { Avatar } from '@/components/ui/Avatar';
import { Money } from '@/components/ui/Money';
import { Stepper } from '@/components/ui/Stepper';

/**
 * Per-person split editor. One row per member; the middle control changes with
 * the split kind, but the checkbox and the live share readout never move — so
 * switching tabs does not feel like a different screen.
 */
export function ShareEditor({
  shares,
  people,
  splitKind,
  preview,
  disabled,
  onToggle,
  onWeight,
  onExact,
}: {
  shares: ExpenseShare[];
  people: Person[];
  splitKind: SplitKind;
  /** personId → computed share, recalculated live as the user types */
  preview: Record<string, number>;
  disabled?: boolean;
  onToggle: (personId: string, included: boolean) => void;
  onWeight: (personId: string, weight: number) => void;
  onExact: (personId: string, amount: number | null) => void;
}) {
  const { t, locale } = useT();

  return (
    <ul className="space-y-1">
      {shares.map((share) => {
        const person = people.find((p) => p.id === share.personId);
        if (!person) return null;
        const owed = preview[share.personId] ?? 0;

        return (
          <li
            key={share.personId}
            className={cn(
              'rounded-lg border p-2.5 transition-colors',
              share.included ? 'border-border bg-surface' : 'border-transparent bg-surface-2/50'
            )}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={share.included}
                disabled={disabled}
                onChange={(e) => onToggle(share.personId, e.target.checked)}
                aria-label={`${person.name} — ${t.expense.included}`}
                className="size-5 shrink-0 accent-[var(--primary)]"
              />

              <Avatar name={person.name} color={person.color} size="sm" />

              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-medium',
                  !share.included && 'text-muted line-through'
                )}
              >
                {person.name}
              </span>

              {share.included && splitKind === 'weight' && (
                <Stepper
                  value={share.weight}
                  disabled={disabled}
                  onChange={(w) => onWeight(share.personId, w)}
                />
              )}

              {share.included && splitKind !== 'exact' && (
                <Money value={owed} className="shrink-0 text-sm font-semibold text-primary" />
              )}

              {!share.included && <span className="text-sm text-muted">—</span>}
            </div>

            {share.included && splitKind === 'exact' && (
              <div className="mt-2 ps-8">
                <AmountInput
                  value={share.exactAmount ?? 0}
                  disabled={disabled}
                  showCurrency={false}
                  // A blank box means "join the equal split of the remainder",
                  // so an empty field must map to null, not to 0.
                  placeholder={`${t.expense.equal} — ${formatNumber(owed, locale)}`}
                  onChange={(v) => onExact(share.personId, v === 0 ? null : v)}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
