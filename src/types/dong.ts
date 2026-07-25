export type Locale = 'fa' | 'en';
export type ThemeMode = 'light' | 'dark' | 'system';
export type GroupMode = 'monthly' | 'event';
export type SplitKind = 'equal' | 'weight' | 'exact';
export type PersonScope = 'global' | 'group';
export type RoundTo = 1 | 100 | 500 | 1000;
export type TransferStrategy = 'treasurer-first' | 'greedy';

export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'internet'
  | 'supermarket'
  | 'groceries'
  | 'food'
  | 'transport'
  | 'household'
  | 'fun'
  | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'supermarket',
  'groceries',
  'food',
  'rent',
  'utilities',
  'internet',
  'transport',
  'household',
  'fun',
  'other',
];

/**
 * Group icon keys. Stored as a stable string rather than an emoji character so
 * the UI can render a real icon; see GROUP_ICONS for the lucide mapping and the
 * store's v2 migration for how existing emoji values are carried over.
 */
export type GroupIconKey =
  | 'home'
  | 'utensils'
  | 'plane'
  | 'party'
  | 'car'
  | 'coffee'
  | 'beach'
  | 'movie'
  | 'cart'
  | 'building';

export const GROUP_ICON_KEYS: GroupIconKey[] = [
  'home',
  'utensils',
  'plane',
  'party',
  'car',
  'coffee',
  'beach',
  'movie',
  'cart',
  'building',
];

// ── payout (کارت مادرخرج) ────────────────────────────────────────────────────

export interface PayoutInfo {
  /** '' → fall back to person.name */
  holderName: string;
  /** 16 digits, stored WITHOUT separators */
  cardNumber: string;
  /** 'IR' + 24 digits, stored WITHOUT spaces */
  iban: string;
  accountNumber: string;
  /** auto-detected from the card BIN, user-editable */
  bankName: string;
}

export const defaultPayoutInfo: PayoutInfo = {
  holderName: '',
  cardNumber: '',
  iban: '',
  accountNumber: '',
  bankName: '',
};

// ── people ───────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  /**
   * 'global' — saved to "my people", reusable in any group
   * 'group'  — ad-hoc, created inside one group and deleted with it
   */
  scope: PersonScope;
  /** set iff scope === 'group' */
  groupId: string | null;
  color: string;
  payout: PayoutInfo | null;
  note: string;
  /** hides from pickers WITHOUT breaking historical expenses */
  archived: boolean;
  createdAt: string;
}

// ── periods (monthly mode only) ──────────────────────────────────────────────

/**
 * A period is an explicit LABELLED BUCKET, not a date range. Expenses are filed
 * into the active period at creation time.
 *
 * This deliberately avoids Jalali↔Gregorian range arithmetic, and it lets a
 * user file a 31 Esfand grocery run under Farvardin if that is how they
 * actually settled it — which is how people keep these ledgers on paper.
 */
export interface Period {
  id: string;
  groupId: string;
  jYear: number;
  /** 1..12 */
  jMonth: number;
  /** settled and locked — expenses become read-only */
  closed: boolean;
  closedAt: string | null;
  createdAt: string;
}

// ── groups ───────────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  mode: GroupMode;
  name: string;
  icon: GroupIconKey;
  /** global + ad-hoc person ids, in display order */
  memberIds: string[];
  /** manual مادرخرج pin; null → auto-pick the largest creditor */
  treasurerId: string | null;
  /** monthly mode only */
  activePeriodId: string | null;
  /** event mode only, ISO YYYY-MM-DD */
  eventDate: string | null;
  note: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseShare {
  personId: string;
  included: boolean;
  /** ضریب — used when splitKind === 'weight'. 1 = a normal single share. */
  weight: number;
  /**
   * Used when splitKind === 'exact'.
   * null = "blank box" → this person joins the equal split of whatever remains
   * after the typed amounts are subtracted from the total.
   */
  exactAmount: number | null;
}

export interface ExpensePayer {
  personId: string;
  /** INVARIANT, enforced in the store: Σ payers.amount === expense.amount */
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  /** monthly → the period id; event → always null */
  periodId: string | null;
  title: string;
  category: ExpenseCategory;
  /** total, INTEGER Toman */
  amount: number;
  /** ISO Gregorian YYYY-MM-DD */
  date: string;
  payers: ExpensePayer[];
  splitKind: SplitKind;
  /** snapshot: one row per member present when the expense was created */
  shares: ExpenseShare[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ── settings ─────────────────────────────────────────────────────────────────

export interface Settings {
  locale: Locale;
  theme: ThemeMode;
  /** quantize final shares to this unit */
  roundTo: RoundTo;
  transferStrategy: TransferStrategy;
  installBannerDismissedAt: string | null;
  lastBackupAt: string | null;
  storagePersistAsked: boolean;
}

export const defaultSettings: Settings = {
  locale: 'fa',
  theme: 'system',
  roundTo: 1000,
  transferStrategy: 'treasurer-first',
  installBannerDismissedAt: null,
  lastBackupAt: null,
  storagePersistAsked: false,
};

export const ROUND_OPTIONS: RoundTo[] = [1, 100, 500, 1000];

export const AVATAR_COLORS = [
  '#0f766e',
  '#b45309',
  '#1d4ed8',
  '#be123c',
  '#4d7c0f',
  '#7c3aed',
  '#0369a1',
  '#c2410c',
] as const;

export const MAX_MEMBERS_PER_GROUP = 30;
export const MAX_GROUPS = 50;

// ── toasts (transient UI state) ──────────────────────────────────────────────

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  message: string;
}
