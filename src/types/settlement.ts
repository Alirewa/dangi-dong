import type { ExpenseCategory } from './dong';

export interface BreakdownLine {
  expenseId: string;
  title: string;
  date: string;
  category: ExpenseCategory;
  expenseTotal: number;
  /** effective weight — 1 in equal mode, 0 when excluded */
  weight: number;
  /** integer Toman this person owes for this expense */
  owed: number;
  /** what this person fronted on this expense */
  paid: number;
}

export interface PersonBalance {
  personId: string;
  name: string;
  color: string;
  /** Σ payer amounts */
  paid: number;
  /** Σ share amounts */
  owed: number;
  /** Σ repayments this person handed to someone else */
  repaid: number;
  /** Σ repayments this person received */
  received: number;
  /**
   * paid − owed + repaid − received. >0 creditor, <0 debtor, 0 settled.
   *
   * Repayments cancel out in the sum (+A for the payer, −A for the receiver),
   * so Σ net === 0 still holds and the settlement stays solvable.
   */
  net: number;
  /** how many expenses this person was included in */
  expenseCount: number;
  lines: BreakdownLine[];
}

export interface Transfer {
  fromPersonId: string;
  toPersonId: string;
  /** integer Toman, always > 0 */
  amount: number;
}

export interface SettlementChecks {
  sharesSumOk: boolean;
  netSumZero: boolean;
  transfersReconcile: boolean;
}

export interface SettlementResult {
  groupId: string;
  periodId: string | null;
  /** Σ expense.amount */
  total: number;
  expenseCount: number;
  /** Σ repayments recorded in this scope */
  repaidTotal: number;
  /** creditors desc → zeros → debtors asc */
  balances: PersonBalance[];
  transfers: Transfer[];
  treasurerId: string | null;
  /** expenseId → personId → owed. Memoized for the itemized statement. */
  perExpense: Record<string, Record<string, number>>;
  /** dev-only invariant results, surfaced in a debug strip outside production */
  checks: SettlementChecks;
}
