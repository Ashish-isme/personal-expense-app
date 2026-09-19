import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Joins class names, letting later Tailwind classes override earlier ones (shadcn's helper). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Small formatting + helper utilities shared across the UI.

/** Formats a number as currency. Defaults to NPR (Rs) — change here to localize. */
export function formatCurrency(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  return `${sign}Rs ${abs.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/** Short axis tick for money charts, e.g. "45k" or "1.2M" (the tooltip shows the full amount). */
export function formatAxis(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${+(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${+(value / 1_000).toFixed(1)}k`;
  return String(value);
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
