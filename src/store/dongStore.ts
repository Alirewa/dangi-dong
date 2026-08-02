'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AVATAR_COLORS,
  defaultPayoutInfo,
  defaultSettings,
  type Expense,
  type ExpenseCategory,
  type ExpensePayer,
  type ExpenseShare,
  type Group,
  type GroupIconKey,
  type GroupMode,
  type Locale,
  type PayoutInfo,
  type Payment,
  type PaymentKind,
  type Period,
  type Person,
  type PersonScope,
  type RoundTo,
  type Settings,
  type SplitKind,
  type StarPromptState,
  type ThemeMode,
  type Toast,
  type ToastKind,
  type TransferStrategy,
} from '@/types/dong';
import { defaultIconFor, toIconKey } from '@/components/groups/groupIcons';
import { currentJalaliMonth, monthKey } from '@/lib/jalali';
import { STORAGE_KEY } from '@/lib/storageKey';
import { nowIso, todayIso, uid } from '@/lib/utils';

export interface PersistedShape {
  people: Person[];
  groups: Group[];
  periods: Period[];
  expenses: Expense[];
  payments: Payment[];
  settings: Settings;
  activeGroupId: string | null;
}

export interface NewExpenseInput {
  groupId: string;
  title: string;
  amount: number;
  category?: ExpenseCategory;
  date?: string;
  payerId?: string;
  payers?: ExpensePayer[];
  splitKind?: SplitKind;
  shares?: ExpenseShare[];
  note?: string;
}

export interface NewPaymentInput {
  groupId: string;
  kind?: PaymentKind;
  fromPersonId: string;
  toPersonId: string;
  amount: number;
  date?: string;
  note?: string;
}

interface DongStore extends PersistedShape {
  // transient
  hydrated: boolean;
  editingExpenseId: string | null;
  toasts: Toast[];

  // lifecycle
  setHydrated: (v: boolean) => void;
  /** first run: name the owner, or fall back to a default if they dismiss */
  completeOnboarding: (name?: string) => void;
  setSelfPerson: (id: string | null) => void;

  // settings
  setLocale: (l: Locale) => void;
  setTheme: (t: ThemeMode) => void;
  setRoundTo: (r: RoundTo) => void;
  setTransferStrategy: (s: TransferStrategy) => void;
  dismissInstallBanner: () => void;
  addUsageSeconds: (seconds: number) => void;
  setStarPrompt: (state: StarPromptState) => void;
  setDailyReminder: (on: boolean) => void;
  markReminderShown: (isoDate: string) => void;
  markBackedUp: () => void;
  markStoragePersistAsked: () => void;

  // people
  addPerson: (input: { name: string; scope?: PersonScope; groupId?: string | null }) => Person;
  updatePerson: (id: string, data: Partial<Omit<Person, 'id' | 'createdAt'>>) => void;
  removePerson: (id: string) => void;
  updatePayout: (id: string, data: Partial<PayoutInfo>) => void;

  // groups
  addGroup: (input: {
    name: string;
    mode: GroupMode;
    icon?: GroupIconKey;
    memberIds?: string[];
    eventDate?: string | null;
    note?: string;
  }) => Group;
  updateGroup: (id: string, data: Partial<Omit<Group, 'id' | 'createdAt' | 'mode'>>) => void;
  removeGroup: (id: string) => void;
  archiveGroup: (id: string, v: boolean) => void;
  setActiveGroup: (id: string | null) => void;
  addMember: (groupId: string, personId: string) => void;
  addAdHocMember: (groupId: string, name: string) => Person;
  removeMember: (groupId: string, personId: string) => boolean;
  reorderMembers: (groupId: string, ids: string[]) => void;

  // periods
  ensurePeriod: (groupId: string) => Period | null;
  addPeriod: (groupId: string, jy: number, jm: number) => Period;
  setActivePeriod: (groupId: string, periodId: string) => void;
  closePeriod: (periodId: string, v: boolean) => void;
  removePeriod: (periodId: string) => boolean;

  // expenses
  addExpense: (input: NewExpenseInput) => Expense;
  updateExpense: (id: string, data: Partial<Omit<Expense, 'id' | 'groupId' | 'createdAt'>>) => void;
  removeExpense: (id: string) => void;
  duplicateExpense: (id: string) => Expense | null;
  setShare: (expenseId: string, personId: string, data: Partial<ExpenseShare>) => void;

  // repayments
  addPayment: (input: NewPaymentInput) => Payment;
  updatePayment: (id: string, data: Partial<Omit<Payment, 'id' | 'groupId' | 'createdAt'>>) => void;
  removePayment: (id: string) => void;
  setSplitKind: (expenseId: string, kind: SplitKind) => void;
  setSinglePayer: (expenseId: string, personId: string) => void;
  setPayers: (expenseId: string, payers: ExpensePayer[]) => void;

  // ui
  startEditExpense: (id: string | null) => void;
  pushToast: (kind: ToastKind, message: string) => void;
  dismissToast: (id: string) => void;

  // backup
  replaceAll: (data: PersistedShape) => void;
  mergeAll: (data: PersistedShape) => void;
  resetAll: () => void;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function pickColor(existing: Person[]): string {
  return AVATAR_COLORS[existing.length % AVATAR_COLORS.length];
}

function blankShare(personId: string): ExpenseShare {
  return { personId, included: true, weight: 1, exactAmount: null };
}

function sharesFor(memberIds: string[]): ExpenseShare[] {
  return memberIds.map(blankShare);
}

/**
 * Invariant 2: an expense's shares cover exactly its group's current members.
 * Preserves existing rows so toggling membership never loses a weight the user
 * typed.
 */
function reconcileShares(shares: ExpenseShare[], memberIds: string[]): ExpenseShare[] {
  const byId = new Map(shares.map((s) => [s.personId, s]));
  return memberIds.map((id) => byId.get(id) ?? blankShare(id));
}

/**
 * Invariant 1: Σ payers.amount === expense.amount. Any difference is dumped on
 * the first payer, which is the only choice that cannot silently lose money.
 */
function reconcilePayers(payers: ExpensePayer[], amount: number): ExpensePayer[] {
  const clean = payers.filter((p) => p.personId);
  if (clean.length === 0) return [];
  const total = clean.reduce((a, p) => a + Math.round(p.amount), 0);
  const out = clean.map((p) => ({ ...p, amount: Math.round(p.amount) }));
  out[0] = { ...out[0], amount: out[0].amount + (Math.round(amount) - total) };
  return out;
}

function touch<T extends { updatedAt: string }>(o: T): T {
  return { ...o, updatedAt: nowIso() };
}

// ── store ────────────────────────────────────────────────────────────────────

const emptyState: PersistedShape = {
  people: [],
  groups: [],
  periods: [],
  expenses: [],
  payments: [],
  settings: defaultSettings,
  activeGroupId: null,
};

export const useDongStore = create<DongStore>()(
  persist(
    (set, get) => ({
      ...emptyState,
      hydrated: false,
      editingExpenseId: null,
      toasts: [],

      // ── lifecycle ──────────────────────────────────────────────────────────
      setHydrated: (v) => set({ hydrated: v }),

      completeOnboarding: (name) => {
        const state = get();
        if (state.settings.onboarded) return;

        // Dismissing the prompt still needs an owner. The fallback is "you"
        // rather than "me": every other screen refers to this person in the
        // second person, and "من" read as a placeholder nobody had chosen.
        const finalName = name?.trim() || (state.settings.locale === 'fa' ? 'شما' : 'You');
        const existing = state.people.find((p) => p.scope === 'global');

        if (existing) {
          set((s) => ({
            people: s.people.map((p) => (p.id === existing.id ? { ...p, name: finalName } : p)),
            settings: {
              ...s.settings,
              selfPersonId: existing.id,
              onboarded: true,
            },
          }));
          return;
        }

        const person: Person = {
          id: uid(),
          name: finalName,
          scope: 'global',
          groupId: null,
          color: AVATAR_COLORS[0],
          payout: { ...defaultPayoutInfo },
          note: '',
          createdAt: nowIso(),
        };
        set((s) => ({
          people: [...s.people, person],
          settings: { ...s.settings, selfPersonId: person.id, onboarded: true },
        }));
      },

      setSelfPerson: (id) => set((s) => ({ settings: { ...s.settings, selfPersonId: id } })),

      // ── settings ───────────────────────────────────────────────────────────
      setLocale: (locale) => set((s) => ({ settings: { ...s.settings, locale } })),
      setTheme: (theme) => set((s) => ({ settings: { ...s.settings, theme } })),
      setRoundTo: (roundTo) => set((s) => ({ settings: { ...s.settings, roundTo } })),
      setTransferStrategy: (transferStrategy) =>
        set((s) => ({ settings: { ...s.settings, transferStrategy } })),
      dismissInstallBanner: () =>
        set((s) => ({
          settings: { ...s.settings, installBannerDismissedAt: nowIso() },
        })),
      addUsageSeconds: (seconds) =>
        set((s) => ({
          settings: {
            ...s.settings,
            usageSeconds: (s.settings.usageSeconds ?? 0) + seconds,
          },
        })),

      setStarPrompt: (starPrompt) => set((s) => ({ settings: { ...s.settings, starPrompt } })),

      setDailyReminder: (dailyReminder) =>
        set((s) => ({ settings: { ...s.settings, dailyReminder } })),

      markReminderShown: (lastReminderOn) =>
        set((s) => ({ settings: { ...s.settings, lastReminderOn } })),

      markBackedUp: () => set((s) => ({ settings: { ...s.settings, lastBackupAt: nowIso() } })),
      markStoragePersistAsked: () =>
        set((s) => ({
          settings: { ...s.settings, storagePersistAsked: true },
        })),

      // ── people ─────────────────────────────────────────────────────────────
      addPerson: ({ name, scope = 'global', groupId = null }) => {
        const person: Person = {
          id: uid(),
          name: name.trim(),
          scope,
          groupId: scope === 'group' ? groupId : null,
          color: pickColor(get().people),
          payout: { ...defaultPayoutInfo },
          note: '',
          createdAt: nowIso(),
        };
        set((s) => ({ people: [...s.people, person] }));
        return person;
      },

      updatePerson: (id, data) =>
        set((s) => ({
          people: s.people.map((p) => (p.id === id ? { ...p, ...data, id: p.id } : p)),
        })),

      removePerson: (id) =>
        set((s) => ({
          people: s.people.filter((p) => p.id !== id),
          // A repayment naming a deleted person can no longer be reconciled.
          payments: s.payments.filter((p) => p.fromPersonId !== id && p.toPersonId !== id),
          settings:
            s.settings.selfPersonId === id ? { ...s.settings, selfPersonId: null } : s.settings,
          groups: s.groups.map((g) =>
            g.memberIds.includes(id)
              ? touch({
                  ...g,
                  memberIds: g.memberIds.filter((m) => m !== id),
                  treasurerId: g.treasurerId === id ? null : g.treasurerId,
                })
              : g
          ),
          expenses: s.expenses.map((e) => {
            const hadShare = e.shares.some((sh) => sh.personId === id);
            const hadPayer = e.payers.some((p) => p.personId === id);
            if (!hadShare && !hadPayer) return e;
            const payers = e.payers.filter((p) => p.personId !== id);
            return touch({
              ...e,
              shares: e.shares.filter((sh) => sh.personId !== id),
              // If the removed person was a payer, the remaining payers must
              // still cover the total, or Σ net === 0 breaks.
              payers: payers.length > 0 ? reconcilePayers(payers, e.amount) : [],
            });
          }),
        })),

      updatePayout: (id, data) =>
        set((s) => ({
          people: s.people.map((p) =>
            p.id === id ? { ...p, payout: { ...defaultPayoutInfo, ...p.payout, ...data } } : p
          ),
        })),

      // ── groups ─────────────────────────────────────────────────────────────
      addGroup: ({ name, mode, icon, memberIds = [], eventDate = null, note = '' }) => {
        const group: Group = {
          id: uid(),
          mode,
          name: name.trim(),
          icon: icon ?? defaultIconFor(mode),
          memberIds,
          treasurerId: null,
          activePeriodId: null,
          eventDate: mode === 'event' ? (eventDate ?? todayIso()) : null,
          note,
          archived: false,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ groups: [...s.groups, group], activeGroupId: group.id }));
        if (mode === 'monthly') get().ensurePeriod(group.id);
        return get().groups.find((g) => g.id === group.id) ?? group;
      },

      updateGroup: (id, data) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? touch({ ...g, ...data, id: g.id }) : g)),
        })),

      removeGroup: (id) =>
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          expenses: s.expenses.filter((e) => e.groupId !== id),
          payments: s.payments.filter((p) => p.groupId !== id),
          periods: s.periods.filter((p) => p.groupId !== id),
          // Ad-hoc people belong to the group and die with it; globals survive.
          people: s.people.filter((p) => !(p.scope === 'group' && p.groupId === id)),
          activeGroupId: s.activeGroupId === id ? null : s.activeGroupId,
        })),

      archiveGroup: (id, v) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === id ? touch({ ...g, archived: v }) : g)),
        })),

      setActiveGroup: (id) => set({ activeGroupId: id }),

      addMember: (groupId, personId) =>
        set((s) => {
          const g = s.groups.find((x) => x.id === groupId);
          if (!g || g.memberIds.includes(personId)) return s;
          const memberIds = [...g.memberIds, personId];
          return {
            groups: s.groups.map((x) => (x.id === groupId ? touch({ ...x, memberIds }) : x)),
            expenses: s.expenses.map((e) =>
              e.groupId === groupId ? { ...e, shares: reconcileShares(e.shares, memberIds) } : e
            ),
          };
        }),

      addAdHocMember: (groupId, name) => {
        const person = get().addPerson({ name, scope: 'group', groupId });
        get().addMember(groupId, person.id);
        return person;
      },

      removeMember: (groupId, personId) => {
        const { expenses } = get();
        const inUse = expenses.some(
          (e) =>
            e.groupId === groupId &&
            (e.payers.some((p) => p.personId === personId) ||
              e.shares.some((s) => s.personId === personId && s.included))
        );
        if (inUse) return false;

        set((s) => {
          const g = s.groups.find((x) => x.id === groupId);
          if (!g) return s;
          const memberIds = g.memberIds.filter((m) => m !== personId);
          return {
            groups: s.groups.map((x) =>
              x.id === groupId
                ? touch({
                    ...x,
                    memberIds,
                    treasurerId: x.treasurerId === personId ? null : x.treasurerId,
                  })
                : x
            ),
            expenses: s.expenses.map((e) =>
              e.groupId === groupId ? { ...e, shares: reconcileShares(e.shares, memberIds) } : e
            ),
            // An ad-hoc person removed from their only group has nowhere to live.
            people: s.people.filter(
              (p) => !(p.id === personId && p.scope === 'group' && p.groupId === groupId)
            ),
          };
        });
        return true;
      },

      reorderMembers: (groupId, ids) =>
        set((s) => ({
          groups: s.groups.map((g) => (g.id === groupId ? touch({ ...g, memberIds: ids }) : g)),
        })),

      // ── periods ────────────────────────────────────────────────────────────
      ensurePeriod: (groupId) => {
        const state = get();
        const group = state.groups.find((g) => g.id === groupId);
        if (!group || group.mode !== 'monthly') return null;

        const { jy, jm } = currentJalaliMonth();
        const existing = state.periods.find(
          (p) => p.groupId === groupId && p.jYear === jy && p.jMonth === jm
        );
        if (existing) {
          if (!group.activePeriodId) {
            get().setActivePeriod(groupId, existing.id);
          }
          return existing;
        }
        return get().addPeriod(groupId, jy, jm);
      },

      addPeriod: (groupId, jy, jm) => {
        const existing = get().periods.find(
          (p) => p.groupId === groupId && p.jYear === jy && p.jMonth === jm
        );
        if (existing) {
          get().setActivePeriod(groupId, existing.id);
          return existing;
        }
        const period: Period = {
          id: uid(),
          groupId,
          jYear: jy,
          jMonth: jm,
          closed: false,
          closedAt: null,
          createdAt: nowIso(),
        };
        set((s) => ({
          periods: [...s.periods, period],
          groups: s.groups.map((g) =>
            g.id === groupId ? touch({ ...g, activePeriodId: period.id }) : g
          ),
        }));
        return period;
      },

      setActivePeriod: (groupId, periodId) =>
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === groupId ? touch({ ...g, activePeriodId: periodId }) : g
          ),
        })),

      closePeriod: (periodId, v) =>
        set((s) => ({
          periods: s.periods.map((p) =>
            p.id === periodId ? { ...p, closed: v, closedAt: v ? nowIso() : null } : p
          ),
        })),

      removePeriod: (periodId) => {
        const state = get();
        if (state.expenses.some((e) => e.periodId === periodId)) return false;
        const period = state.periods.find((p) => p.id === periodId);
        if (!period) return false;
        const siblings = state.periods.filter(
          (p) => p.groupId === period.groupId && p.id !== periodId
        );
        set((s) => ({
          periods: s.periods.filter((p) => p.id !== periodId),
          groups: s.groups.map((g) =>
            g.activePeriodId === periodId
              ? touch({
                  ...g,
                  activePeriodId: siblings[siblings.length - 1]?.id ?? null,
                })
              : g
          ),
        }));
        return true;
      },

      // ── expenses ───────────────────────────────────────────────────────────
      addExpense: (input) => {
        const state = get();
        const group = state.groups.find((g) => g.id === input.groupId);
        const memberIds = group?.memberIds ?? [];
        const amount = Math.round(input.amount);

        // Invariant 3: periodId is non-null iff the group is monthly.
        const periodId =
          group?.mode === 'monthly'
            ? (group.activePeriodId ?? get().ensurePeriod(group.id)?.id ?? null)
            : null;

        const payers = input.payers
          ? reconcilePayers(input.payers, amount)
          : input.payerId
            ? [{ personId: input.payerId, amount }]
            : memberIds[0]
              ? [{ personId: memberIds[0], amount }]
              : [];

        const expense: Expense = {
          id: uid(),
          groupId: input.groupId,
          periodId,
          title: input.title.trim(),
          category: input.category ?? 'other',
          amount,
          date: input.date ?? todayIso(),
          payers,
          splitKind: input.splitKind ?? 'equal',
          shares: reconcileShares(input.shares ?? sharesFor(memberIds), memberIds),
          note: input.note ?? '',
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        set((s) => ({
          expenses: [...s.expenses, expense],
          groups: s.groups.map((g) => (g.id === input.groupId ? touch(g) : g)),
        }));
        return expense;
      },

      updateExpense: (id, data) =>
        set((s) => ({
          expenses: s.expenses.map((e) => {
            if (e.id !== id) return e;
            const next = { ...e, ...data, id: e.id };
            const amount = Math.round(next.amount);
            return touch({
              ...next,
              amount,
              // Editing the amount must not silently break the payer invariant.
              payers: reconcilePayers(next.payers, amount),
            });
          }),
          groups: s.groups.map((g) =>
            g.id === s.expenses.find((e) => e.id === id)?.groupId ? touch(g) : g
          ),
        })),

      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      addPayment: ({ groupId, kind = 'transfer', fromPersonId, toPersonId, amount, date, note = '' }) => {
        const group = get().groups.find((g) => g.id === groupId);
        // Invariant 3 applies to repayments too: monthly groups file them under
        // a period, event groups never do.
        const periodId =
          group?.mode === 'monthly'
            ? (group.activePeriodId ?? get().ensurePeriod(groupId)?.id ?? null)
            : null;

        const payment: Payment = {
          id: uid(),
          groupId,
          kind,
          periodId,
          fromPersonId,
          toPersonId,
          amount: Math.max(0, Math.round(amount)),
          date: date ?? todayIso(),
          note,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({
          payments: [...s.payments, payment],
          groups: s.groups.map((g) => (g.id === groupId ? touch(g) : g)),
        }));
        return payment;
      },

      updatePayment: (id, data) =>
        set((s) => ({
          payments: s.payments.map((p) =>
            p.id === id
              ? touch({
                  ...p,
                  ...data,
                  amount:
                    data.amount === undefined ? p.amount : Math.max(0, Math.round(data.amount)),
                })
              : p
          ),
        })),

      removePayment: (id) => set((s) => ({ payments: s.payments.filter((p) => p.id !== id) })),

      duplicateExpense: (id) => {
        const src = get().expenses.find((e) => e.id === id);
        if (!src) return null;
        const copy: Expense = {
          ...src,
          id: uid(),
          date: todayIso(),
          shares: src.shares.map((s) => ({ ...s })),
          payers: src.payers.map((p) => ({ ...p })),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        set((s) => ({ expenses: [...s.expenses, copy] }));
        return copy;
      },

      setShare: (expenseId, personId, data) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === expenseId
              ? touch({
                  ...e,
                  shares: e.shares.map((sh) =>
                    sh.personId === personId ? { ...sh, ...data } : sh
                  ),
                })
              : e
          ),
        })),

      setSplitKind: (expenseId, kind) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === expenseId ? touch({ ...e, splitKind: kind }) : e
          ),
        })),

      setSinglePayer: (expenseId, personId) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === expenseId
              ? touch({
                  ...e,
                  payers: [{ personId, amount: Math.round(e.amount) }],
                })
              : e
          ),
        })),

      setPayers: (expenseId, payers) =>
        set((s) => ({
          expenses: s.expenses.map((e) =>
            e.id === expenseId ? touch({ ...e, payers: reconcilePayers(payers, e.amount) }) : e
          ),
        })),

      // ── ui ─────────────────────────────────────────────────────────────────
      startEditExpense: (id) => set({ editingExpenseId: id }),

      pushToast: (kind, message) =>
        set((s) => ({ toasts: [...s.toasts, { id: uid(), kind, message }] })),

      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      // ── backup ─────────────────────────────────────────────────────────────
      replaceAll: (data) =>
        set({
          people: data.people,
          groups: data.groups.map((g) => ({
            ...g,
            icon: toIconKey(g.icon, g.mode),
          })),
          periods: data.periods,
          expenses: data.expenses,
          payments: data.payments ?? [],
          settings: { ...defaultSettings, ...data.settings },
          activeGroupId: null,
        }),

      mergeAll: (data) =>
        set((s) => ({
          people: mergeById(s.people, data.people, (p) => p.createdAt),
          // Imported groups may come from a v1 backup that still carries emoji.
          groups: mergeById(
            s.groups,
            data.groups.map((g) => ({ ...g, icon: toIconKey(g.icon, g.mode) })),
            (g) => g.updatedAt
          ),
          periods: mergeById(s.periods, data.periods, (p) => p.createdAt),
          expenses: mergeById(s.expenses, data.expenses, (e) => e.updatedAt),
          payments: mergeById(s.payments, data.payments ?? [], (p) => p.updatedAt),
        })),

      resetAll: () => set({ ...emptyState, toasts: [], editingExpenseId: null }),
    }),
    {
      name: STORAGE_KEY,
      version: 6,
      storage: createJSONStorage(() => localStorage),
      /**
       * v2: `group.emoji` (an emoji character) became `group.icon` (a key), so
       *     the UI can render a real icon.
       * v3: introduced `settings.selfPersonId` / `onboarded`. Existing installs
       *     must not be shown the first-run prompt, and the person the old
       *     seed created is adopted as the owner.
       * v4: added usage tracking and the star-prompt gate; older settings
       *     objects just need the new keys backfilled.
       * v5: added `payments` (repayments), which simply starts empty.
       * v6: payments gained `kind`; everything that already existed was a
       *     member-to-member transfer.
       */
      migrate: (persisted, from) => {
        const state = persisted as PersistedShape | undefined;
        if (!state) return state as never;

        if (from < 2) {
          state.groups = (state.groups ?? []).map((g) => {
            const legacy = g as Group & { emoji?: string };
            const next: Group = {
              ...g,
              icon: toIconKey(legacy.icon ?? legacy.emoji, g.mode),
            };
            delete (next as Group & { emoji?: string }).emoji;
            return next;
          });
        }

        if (from < 3) {
          const people = state.people ?? [];
          const seeded = people.find((p) => p.name === 'من' || p.name === 'Me');
          // Rename the old placeholder in place; "من" is no longer used anywhere.
          if (seeded) seeded.name = seeded.name === 'Me' ? 'You' : 'شما';
          const firstGlobal = people.find((p) => p.scope === 'global');
          state.settings = {
            ...defaultSettings,
            ...state.settings,
            selfPersonId: seeded?.id ?? firstGlobal?.id ?? null,
            onboarded: people.length > 0,
          };
        }

        if (from < 6) {
          // Every payment that existed before income was a member-to-member
          // transfer, which is what kept the balances correct.
          state.payments = (state.payments ?? []).map((p) => ({
            ...p,
            kind: p.kind ?? 'transfer',
          }));
          state.settings = { ...defaultSettings, ...state.settings };
        }

        if (from < 5) {
          // `payments` did not exist before v5.
          state.payments = state.payments ?? [];
        }

        if (from < 4) {
          state.settings = { ...defaultSettings, ...state.settings };
        }

        return state as never;
      },
      // Non-negotiable: defaults call crypto.randomUUID() and Date.now(), which
      // differ between the server render and the client. StoreHydrator calls
      // persist.rehydrate() in an effect instead.
      skipHydration: true,
      partialize: (s) => ({
        people: s.people,
        groups: s.groups,
        periods: s.periods,
        expenses: s.expenses,
        payments: s.payments,
        settings: s.settings,
        activeGroupId: s.activeGroupId,
      }),
    }
  )
);

/** Union by id, keeping whichever copy has the newer timestamp. */
function mergeById<T extends { id: string }>(
  current: T[],
  incoming: T[],
  stamp: (x: T) => string
): T[] {
  const byId = new Map(current.map((x) => [x.id, x]));
  for (const item of incoming) {
    const existing = byId.get(item.id);
    if (!existing || stamp(item) > stamp(existing)) byId.set(item.id, item);
  }
  return [...byId.values()];
}

// ── derived selectors (pure, used with useMemo at the call site) ─────────────

export function expensesOf(
  expenses: Expense[],
  groupId: string,
  periodId: string | null
): Expense[] {
  return expenses.filter(
    (e) => e.groupId === groupId && (periodId === null || e.periodId === periodId)
  );
}

export function paymentsOf(
  payments: Payment[],
  groupId: string,
  periodId: string | null
): Payment[] {
  return payments.filter(
    (p) => p.groupId === groupId && (periodId === null || p.periodId === periodId)
  );
}

export function periodsOf(periods: Period[], groupId: string): Period[] {
  return periods
    .filter((p) => p.groupId === groupId)
    .sort((a, b) =>
      monthKey({ jy: a.jYear, jm: a.jMonth }).localeCompare(monthKey({ jy: b.jYear, jm: b.jMonth }))
    );
}
