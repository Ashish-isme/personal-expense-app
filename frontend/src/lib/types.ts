// Shared TypeScript models mirroring the API responses.

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export type PaymentMethod = "Cash" | "Bank" | "eSewa" | "Khalti";
export type DebtDirection = "i_owe" | "owed_to_me";
export type DebtStatus = "pending" | "paid";

export interface Expense {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export interface Income {
  id: string;
  date: string;
  source: string;
  amount: number;
  notes?: string | null;
}

export interface Budget {
  id: string;
  month: string;
  category: string;
  amount: number;
  // Enriched fields returned by GET /api/budgets
  actual: number;
  remaining: number;
  percentUsed: number;
}

export type RecurringType = "expense" | "income";
export type RecurringFrequency = "weekly" | "monthly";

export interface Recurring {
  id: string;
  type: RecurringType;
  frequency: RecurringFrequency;
  category: string;
  description: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  startDate: string;
  endDate?: string | null;
  nextRun: string;
  active: boolean;
}

export interface Debt {
  id: string;
  person: string;
  amount: number;
  description?: string | null;
  dueDate?: string | null;
  direction: DebtDirection;
  status: DebtStatus;
}

// ---- Groups / shared expenses ------------------------------------------------

export type SplitMode = "equal" | "custom" | "percent";
export type SettlementStatus = "pending" | "confirmed" | "declined";

export interface GroupSummary {
  id: string;
  name: string;
  inviteCode: string;
  createdById: string;
  memberCount: number;
  expenseCount: number;
  /** >0 you are owed money, <0 you owe money. */
  net: number;
}

export interface MemberBalance {
  userId: string;
  name: string | null;
  email: string;
  paid: number;
  owed: number;
  net: number;
}

export interface Transfer {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

export interface GroupExpenseSplit {
  id: string;
  userId: string;
  amount: number;
  user: User;
}

export interface GroupExpense {
  id: string;
  description: string;
  amount: number;
  date: string;
  splitMode: SplitMode;
  notes?: string | null;
  paidById: string;
  paidBy: User;
  splits: GroupExpenseSplit[];
}

export interface Settlement {
  id: string;
  fromUserId: string;
  toUserId: string;
  fromUser: User;
  toUser: User;
  amount: number;
  note?: string | null;
  status: SettlementStatus;
  createdAt: string;
  confirmedAt?: string | null;
}

export interface GroupDetail {
  id: string;
  name: string;
  inviteCode: string;
  createdById: string;
  members: User[];
  balances: MemberBalance[];
  transfers: Transfer[];
  expenses: GroupExpense[];
  settlements: Settlement[];
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  groupId?: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationFeed {
  items: Notification[];
  unread: number;
}

export interface DashboardSummary {
  monthlyIncome: number;
  monthlyBudget: number;
  totalExpenses: number;
  remainingBudget: number;
  savings: number;
  moneyToReceive: number;
  moneyToPay: number;
  netWorth: number;
}

export interface RecentTransaction {
  id: string;
  type: "expense" | "income";
  date: string;
  title: string;
  subtitle: string;
  amount: number;
}

export interface DashboardData {
  month: string;
  summary: DashboardSummary;
  spendingByCategory: { category: string; amount: number }[];
  monthlyTrend: { month: string; label: string; expense: number; income: number }[];
  recentTransactions: RecentTransaction[];
}

export interface ReportData {
  type: string;
  period: string;
  totals: { income: number; expense: number; net: number };
  byCategory: { category: string; amount: number }[];
  monthly: { month: string; label: string; expense: number; income: number }[];
  expenses: Expense[];
  income: Income[];
}
