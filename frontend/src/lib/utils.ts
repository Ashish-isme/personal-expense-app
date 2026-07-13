// Small formatting + helper utilities shared across the UI.

/** Formats a number as currency. Defaults to NPR (Rs) — change here to localize. */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}Rs ${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Compact currency for tight spaces, e.g. "Rs 1.2k". */
export function formatCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1000) return `${sign}Rs ${(abs / 1000).toFixed(1)}k`;
  return `${sign}Rs ${abs}`;
}

/** e.g. "Jul 7, 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Value for <input type="date">. */
export function toDateInput(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toISOString().slice(0, 10);
}

/** Current month as "YYYY-MM". */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** Human month label, e.g. "July 2026". */
export function monthTitle(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Shift a "YYYY-MM" string by n months (can be negative). */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Merges class names, dropping falsy values. */
export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** A consistent, accessible categorical color palette (works in light & dark). */
export const CHART_COLORS = [
  "#5b5bd6", // indigo (brand)
  "#12a594", // teal
  "#e5484d", // red
  "#f76b15", // orange
  "#e2a336", // amber
  "#30a46c", // green
  "#8e4ec6", // purple
  "#0091ff", // blue
  "#d6409f", // pink
  "#647a8f", // slate
];

/** Deterministically pick a color for a category name. */
export function colorFor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/** Shared list of expense categories used in dropdowns. */
export const EXPENSE_CATEGORIES = [
  "Groceries",
  "Rent",
  "Transport",
  "Dining",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Education",
  "Travel",
  "Subscriptions",
  "Other",
];

export const PAYMENT_METHODS = ["Cash", "Bank", "eSewa", "Khalti"] as const;

/** Percentage at/above which a budget is flagged as "near its limit". */
export const BUDGET_WARN_THRESHOLD = 80;

export type BudgetStatus = "ok" | "warning" | "over";

/** Classifies a budget by how much of it has been used. */
export function budgetStatus(percentUsed: number): BudgetStatus {
  if (percentUsed > 100) return "over";
  if (percentUsed >= BUDGET_WARN_THRESHOLD) return "warning";
  return "ok";
}
