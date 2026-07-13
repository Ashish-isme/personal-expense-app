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
