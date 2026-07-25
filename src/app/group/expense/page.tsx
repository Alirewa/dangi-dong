'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { HydrationGate } from '@/components/layout/HydrationGate';
import { PayerPicker } from '@/components/expenses/PayerPicker';
import { ShareEditor } from '@/components/expenses/ShareEditor';
import { CATEGORY_ICONS } from '@/components/expenses/categoryMeta';
import { AmountInput } from '@/components/ui/AmountInput';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DateField } from '@/components/ui/DateField';
import { Count, Money } from '@/components/ui/Money';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextInput } from '@/components/ui/TextInput';
import { useActiveGroup } from '@/hooks/useActiveGroup';
import { useT } from '@/hooks/useT';
import { splitExpense } from '@/lib/settlement';
import { cn, todayIso } from '@/lib/utils';
import { useDongStore } from '@/store/dongStore';
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
  type ExpensePayer,
  type ExpenseShare,
  type Group,
  type SplitKind,
} from '@/types/dong';

export default function ExpensePage() {
  return (
    <HydrationGate>
      <ExpenseFormLoader />
    </HydrationGate>
  );
}

/**
 * Resolves the group and the expense being edited, then remounts the form via
 * `key` whenever the target changes.
 *
 * The remount IS the state reset — copying store values into local state from
 * an effect causes a cascading second render, which the React Compiler lint
 * correctly rejects.
 */
function ExpenseFormLoader() {
  const { group } = useActiveGroup();
  const expenses = useDongStore((s) => s.expenses);
  const editingId = useDongStore((s) => s.editingExpenseId);

  const editing = useMemo(
    () => expenses.find((e) => e.id === editingId) ?? null,
    [expenses, editingId]
  );

  if (!group) return null;

  return <ExpenseForm key={editing?.id ?? 'new'} group={group} editing={editing} />;
}

function initialShares(group: Group, editing: Expense | null): ExpenseShare[] {
  if (editing) return editing.shares.map((s) => ({ ...s }));
  return group.memberIds.map((personId) => ({
    personId,
    included: true,
    weight: 1,
    exactAmount: null,
  }));
}

function ExpenseForm({ group, editing }: { group: Group; editing: Expense | null }) {
  const { t } = useT();
  const router = useRouter();

  const people = useDongStore((s) => s.people);
  const periods = useDongStore((s) => s.periods);
  const roundTo = useDongStore((s) => s.settings.roundTo);
  const addExpense = useDongStore((s) => s.addExpense);
  const updateExpense = useDongStore((s) => s.updateExpense);
  const removeExpense = useDongStore((s) => s.removeExpense);
  const duplicateExpense = useDongStore((s) => s.duplicateExpense);
  const startEditExpense = useDongStore((s) => s.startEditExpense);
  const pushToast = useDongStore((s) => s.pushToast);

  // Lazy initializers, evaluated once per mount. Changing `editing` remounts.
  const [title, setTitle] = useState(() => editing?.title ?? '');
  const [amount, setAmount] = useState(() => editing?.amount ?? 0);
  const [category, setCategory] = useState<ExpenseCategory>(
    () => editing?.category ?? (group.mode === 'monthly' ? 'groceries' : 'food')
  );
  const [date, setDate] = useState(
    () => editing?.date ?? (group.mode === 'event' ? (group.eventDate ?? todayIso()) : todayIso())
  );
  const [note, setNote] = useState(() => editing?.note ?? '');
  const [splitKind, setSplitKind] = useState<SplitKind>(() => editing?.splitKind ?? 'equal');
  const [shares, setShares] = useState<ExpenseShare[]>(() => initialShares(group, editing));
  const [payers, setPayers] = useState<ExpensePayer[]>(
    () =>
      editing?.payers.map((p) => ({ ...p })) ??
      (group.memberIds[0] ? [{ personId: group.memberIds[0], amount: 0 }] : [])
  );
  const [multiPayer, setMultiPayer] = useState(() => (editing?.payers.length ?? 0) > 1);
  const [errors, setErrors] = useState<{ title?: string; amount?: string; included?: string }>({});
  const [pendingDelete, setPendingDelete] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const sharesRef = useRef<HTMLDivElement>(null);

  const period = useMemo(
    () => periods.find((p) => p.id === (editing?.periodId ?? group.activePeriodId)) ?? null,
    [periods, editing?.periodId, group.activePeriodId]
  );

  // Live preview through the same engine the settlement screen uses, so the
  // number shown while typing is the number that ends up in the export.
  const preview = useMemo(() => {
    const draft: Expense = {
      id: editing?.id ?? 'draft',
      groupId: group.id,
      periodId: null,
      title,
      category,
      amount,
      date,
      payers,
      splitKind,
      shares,
      note,
      createdAt: '',
      updatedAt: '',
    };
    return splitExpense(draft, { roundTo, residualPersonId: payers[0]?.personId ?? null });
  }, [editing?.id, group.id, title, category, amount, date, payers, splitKind, shares, note, roundTo]);

  const locked = Boolean(editing && period?.closed);
  const includedCount = shares.filter((s) => s.included).length;
  const typedExact = shares
    .filter((s) => s.included && s.exactAmount !== null)
    .reduce((a, s) => a + (s.exactAmount ?? 0), 0);
  const remaining = amount - typedExact;
  const blanksCount = shares.filter((s) => s.included && s.exactAmount === null).length;

  const setShare = (personId: string, data: Partial<ExpenseShare>) =>
    setShares((prev) => prev.map((s) => (s.personId === personId ? { ...s, ...data } : s)));

  const leave = () => {
    startEditExpense(null);
    router.push('/group/');
  };

  const submit = () => {
    const next: typeof errors = {};
    if (!title.trim()) next.title = t.expense.needTitle;
    if (amount <= 0) next.amount = t.expense.needAmount;
    if (includedCount === 0) next.included = t.expense.needIncluded;
    setErrors(next);

    if (Object.keys(next).length > 0) {
      // The Save button sits at the bottom of a long form while the fields it
      // validates are near the top, so an inline-only error looks like the
      // button did nothing. Surface it as a toast AND scroll to the field.
      const message = next.title ?? next.amount ?? next.included ?? '';
      pushToast('error', message);
      const target = next.title ? titleRef.current : next.amount ? amountRef.current : sharesRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (next.title || next.amount) (target as HTMLInputElement | null)?.focus?.();
      return;
    }

    // A payer list must always cover the total, or Σ net === 0 breaks and the
    // settlement becomes unsolvable. Falling back to a single payer is the only
    // safe reading of "multi-payer enabled but nothing entered".
    const entered = payers.filter((p) => p.amount > 0);
    const finalPayers: ExpensePayer[] =
      multiPayer && entered.length > 0
        ? entered
        : [{ personId: payers[0]?.personId ?? group.memberIds[0], amount }];

    const payload = {
      title: title.trim(),
      amount,
      category,
      date,
      note,
      splitKind,
      shares,
      payers: finalPayers,
    };

    if (editing) updateExpense(editing.id, payload);
    else addExpense({ groupId: group.id, ...payload });

    pushToast('success', t.toast.saved);
    leave();
  };

  const splitOptions: { value: SplitKind; label: string }[] = [
    { value: 'equal', label: t.expense.equal },
    { value: 'weight', label: t.expense.weight },
    { value: 'exact', label: t.expense.exact },
  ];

  const hint =
    splitKind === 'equal'
      ? t.expense.equalHint
      : splitKind === 'weight'
        ? t.expense.weightHint
        : t.expense.exactHint;

  return (
    <AppShell title={editing ? t.expense.editTitle : t.expense.newTitle} back hideNav>
      <div className="space-y-6 p-4">
        {locked && (
          <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs leading-relaxed text-warning">
            {t.group.periodClosed}
          </p>
        )}

        <TextInput
          ref={titleRef}
          label={t.expense.title}
          placeholder={t.expense.titlePlaceholder}
          value={title}
          disabled={locked}
          autoFocus={!editing}
          onChange={(e) => {
            setTitle(e.target.value);
            setErrors((p) => ({ ...p, title: undefined }));
          }}
          error={errors.title}
        />

        <AmountInput
          inputRef={amountRef}
          label={t.expense.amount}
          value={amount}
          disabled={locked}
          onChange={(v) => {
            setAmount(v);
            setErrors((p) => ({ ...p, amount: undefined }));
          }}
          error={errors.amount}
        />

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.expense.category}</span>
          <div className="grid grid-cols-3 gap-2">
            {EXPENSE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c];
              return (
                <button
                  key={c}
                  type="button"
                  disabled={locked}
                  aria-pressed={category === c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border px-1 text-xs transition-colors',
                    category === c
                      ? 'border-primary bg-primary-soft font-semibold text-primary'
                      : 'border-border bg-surface hover:bg-surface-2'
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  <span className="truncate">{t.expense.categories[c]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <DateField label={t.expense.date} value={date} onChange={setDate} />

        <PayerPicker
          payers={payers}
          people={people}
          memberIds={group.memberIds}
          amount={amount}
          multi={multiPayer}
          disabled={locked}
          onSingle={(personId) => setPayers([{ personId, amount }])}
          onMulti={setPayers}
          onToggleMulti={(v) => {
            setMultiPayer(v);
            if (!v) setPayers([{ personId: payers[0]?.personId ?? group.memberIds[0], amount }]);
          }}
        />

        <div className="space-y-2">
          <span className="block text-sm font-medium">{t.expense.splitMode}</span>
          <SegmentedControl
            value={splitKind}
            options={splitOptions}
            onChange={setSplitKind}
            label={t.expense.splitMode}
          />
          <p className="text-xs leading-relaxed text-muted">{hint}</p>
        </div>

        <div className="space-y-2" ref={sharesRef}>
          <ShareEditor
            shares={shares}
            people={people}
            splitKind={splitKind}
            preview={preview}
            disabled={locked}
            onToggle={(id, included) => {
              setShare(id, { included });
              setErrors((p) => ({ ...p, included: undefined }));
            }}
            onWeight={(id, weight) => setShare(id, { weight })}
            onExact={(id, exactAmount) => setShare(id, { exactAmount })}
          />

          {errors.included && <p className="text-xs text-negative">{errors.included}</p>}

          {splitKind === 'exact' && (
            <p
              className={cn(
                'rounded-lg px-3 py-2 text-xs',
                remaining < 0 ? 'bg-negative-soft text-negative' : 'bg-surface-2 text-muted'
              )}
            >
              {remaining < 0 ? t.expense.overBudget : t.expense.remaining}:{' '}
              <Money value={Math.abs(remaining)} currency />
              {blanksCount > 0 && remaining >= 0 && (
                <>
                  {' — '}
                  <Count value={blanksCount} /> {t.common.person}
                </>
              )}
            </p>
          )}
        </div>

        <TextInput
          label={`${t.expense.note} (${t.common.optional})`}
          value={note}
          disabled={locked}
          onChange={(e) => setNote(e.target.value)}
        />

        <div className="space-y-2">
          <Button block size="lg" onClick={submit} disabled={locked}>
            {t.common.save}
          </Button>

          {editing && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                block
                icon={<Copy className="size-4" aria-hidden="true" />}
                onClick={() => {
                  duplicateExpense(editing.id);
                  pushToast('success', t.toast.saved);
                  leave();
                }}
              >
                {t.expense.duplicate}
              </Button>
              <Button
                variant="outline"
                block
                className="border-negative/40 text-negative"
                disabled={locked}
                icon={<Trash2 className="size-4" aria-hidden="true" />}
                onClick={() => setPendingDelete(true)}
              >
                {t.common.delete}
              </Button>
            </div>
          )}
        </div>

        <ConfirmDialog
          open={pendingDelete}
          title={t.expense.deleteTitle}
          description={t.expense.deleteDesc}
          confirmLabel={t.common.delete}
          onCancel={() => setPendingDelete(false)}
          onConfirm={() => {
            if (editing) removeExpense(editing.id);
            setPendingDelete(false);
            pushToast('success', t.toast.deleted);
            leave();
          }}
        />
      </div>
    </AppShell>
  );
}
